import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const challengeTtlMs = 5 * 60 * 1000;

type BeginRequest = {
  action: 'begin';
  credentialId: string;
};

type FinishRequest = {
  action: 'finish';
  credentialId: string;
  state: string;
  assertion: {
    id: string;
    rawId: string;
    type: string;
    response: {
      clientDataJSON: string;
      authenticatorData: string;
      signature: string;
      userHandle: string | null;
    };
  };
};

type StatePayload = {
  credentialId: string;
  challenge: string;
  origin: string;
  rpId: string;
  exp: number;
};

const json = (body: Record<string, unknown>, _status = 200) =>
  new Response(JSON.stringify(body), {
    status: 200, // Always 200 so the client can read the body
    headers: corsHeaders,
  });

const bytesToBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const base64UrlToBytes = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const concatBytes = (...parts: Uint8Array[]) => {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
};

const createChallenge = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
};

const sha256 = async (value: Uint8Array | string) => {
  const bytes = typeof value === 'string' ? textEncoder.encode(value) : value;
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
};

const importHmacKey = async (secret: string) =>
  crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

const signState = async (payload: StatePayload, secret: string) => {
  const encodedPayload = bytesToBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret);
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, textEncoder.encode(encodedPayload))
  );
  return `${encodedPayload}.${bytesToBase64Url(signature)}`;
};

const verifyState = async (token: string, secret: string) => {
  const [encodedPayload, encodedSignature] = token.split('.');
  if (!encodedPayload || !encodedSignature) {
    throw new Error('Invalid biometric login state');
  }

  const key = await importHmacKey(secret);
  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlToBytes(encodedSignature),
    textEncoder.encode(encodedPayload)
  );

  if (!isValid) {
    throw new Error('Biometric login state verification failed');
  }

  const payload = JSON.parse(textDecoder.decode(base64UrlToBytes(encodedPayload))) as StatePayload;

  if (Date.now() > payload.exp) {
    throw new Error('Biometric login request expired');
  }

  return payload;
};

const getRequestOrigin = (request: Request) => {
  const originHeader = request.headers.get('origin');
  if (originHeader) {
    return originHeader;
  }

  const referer = request.headers.get('referer');
  if (!referer) {
    throw new Error('Missing request origin');
  }

  return new URL(referer).origin;
};

// Convert DER-encoded ECDSA signature (as produced by WebAuthn) to raw r||s format expected by Web Crypto
const derToRawEcdsa = (der: Uint8Array): Uint8Array | null => {
  try {
    if (der[0] !== 0x30) return null;
    let offset = 2;
    if (der[1] & 0x80) {
      offset = 2 + (der[1] & 0x7f);
    }
    if (der[offset] !== 0x02) return null;
    const rLen = der[offset + 1];
    let r = der.slice(offset + 2, offset + 2 + rLen);
    offset = offset + 2 + rLen;
    if (der[offset] !== 0x02) return null;
    const sLen = der[offset + 1];
    let s = der.slice(offset + 2, offset + 2 + sLen);

    // Strip leading zeros
    while (r.length > 32 && r[0] === 0x00) r = r.slice(1);
    while (s.length > 32 && s[0] === 0x00) s = s.slice(1);
    // Left-pad to 32 bytes
    const rPadded = new Uint8Array(32);
    rPadded.set(r, 32 - r.length);
    const sPadded = new Uint8Array(32);
    sPadded.set(s, 32 - s.length);

    const out = new Uint8Array(64);
    out.set(rPadded, 0);
    out.set(sPadded, 32);
    return out;
  } catch {
    return null;
  }
};

const verifySignature = async (publicKeyBytes: Uint8Array, signatureBytes: Uint8Array, data: Uint8Array) => {
  // Try ECDSA P-256 (most common for platform authenticators) — convert DER → raw
  try {
    const key = await crypto.subtle.importKey(
      'spki',
      publicKeyBytes,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
    const rawSig = derToRawEcdsa(signatureBytes) ?? signatureBytes;
    const verified = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      rawSig,
      data
    );
    if (verified) return true;
  } catch (e) {
    console.log('ECDSA verify attempt failed:', (e as Error).message);
  }

  // Fallback: RSA
  try {
    const key = await crypto.subtle.importKey(
      'spki',
      publicKeyBytes,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const verified = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      key,
      signatureBytes,
      data
    );
    if (verified) return true;
  } catch (e) {
    console.log('RSA verify attempt failed:', (e as Error).message);
  }

  return false;
};

const verifyAssertion = async ({
  assertion,
  credentialId,
  expectedChallenge,
  expectedOrigin,
  expectedRpId,
  publicKey,
}: {
  assertion: FinishRequest['assertion'];
  credentialId: string;
  expectedChallenge: string;
  expectedOrigin: string;
  expectedRpId: string;
  publicKey: string;
}) => {
  if (assertion.type !== 'public-key') {
    throw new Error('Invalid biometric credential type');
  }

  if (assertion.id !== credentialId && assertion.rawId !== credentialId) {
    throw new Error('Biometric credential does not match this device');
  }

  const clientDataBytes = base64UrlToBytes(assertion.response.clientDataJSON);
  const clientData = JSON.parse(textDecoder.decode(clientDataBytes));

  if (clientData.type !== 'webauthn.get') {
    throw new Error('Invalid biometric authentication type');
  }

  if (clientData.challenge !== expectedChallenge) {
    throw new Error('Biometric challenge mismatch');
  }

  if (clientData.origin !== expectedOrigin) {
    throw new Error('Biometric origin mismatch');
  }

  const authenticatorData = base64UrlToBytes(assertion.response.authenticatorData);
  if (authenticatorData.length < 37) {
    throw new Error('Invalid authenticator data');
  }

  const rpIdHash = authenticatorData.slice(0, 32);
  const expectedRpIdHash = await sha256(expectedRpId);

  if (!rpIdHash.every((byte, index) => byte === expectedRpIdHash[index])) {
    throw new Error('Biometric RP ID verification failed');
  }

  const flags = authenticatorData[32];
  const userPresent = (flags & 0x01) !== 0;
  const userVerified = (flags & 0x04) !== 0;

  if (!userPresent || !userVerified) {
    throw new Error('Biometric user verification was not completed');
  }

  const signatureBase = concatBytes(authenticatorData, await sha256(clientDataBytes));
  const signatureBytes = base64UrlToBytes(assertion.response.signature);
  const publicKeyBytes = base64UrlToBytes(publicKey);
  const isVerified = await verifySignature(publicKeyBytes, signatureBytes, signatureBase);

  if (!isVerified) {
    throw new Error('Biometric signature verification failed');
  }
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Biometric login is not configured on the backend');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = (await request.json()) as BeginRequest | FinishRequest;

    if (body.action === 'begin') {
      if (!body.credentialId) {
        return json({ error: 'Missing biometric credential' }, 400);
      }

      const origin = getRequestOrigin(request);
      const rpId = new URL(origin).hostname;

      const { data: biometric, error } = await supabase
        .from('user_biometrics')
        .select('credential_id')
        .eq('credential_id', body.credentialId)
        .maybeSingle();

      if (error || !biometric) {
        return json({ error: 'Fingerprint not registered for this device' }, 404);
      }

      const challenge = createChallenge();
      const state = await signState(
        {
          credentialId: body.credentialId,
          challenge,
          origin,
          rpId,
          exp: Date.now() + challengeTtlMs,
        },
        serviceRoleKey
      );

      return json({
        challenge,
        state,
        rpId,
        timeout: 60000,
      });
    }

    if (body.action === 'finish') {
      if (!body.credentialId || !body.state || !body.assertion) {
        return json({ error: 'Incomplete biometric login payload' }, 400);
      }

      const state = await verifyState(body.state, serviceRoleKey);
      if (state.credentialId !== body.credentialId) {
        return json({ error: 'Biometric session mismatch' }, 400);
      }

      const { data: biometric, error } = await supabase
        .from('user_biometrics')
        .select('credential_id, public_key, user_id')
        .eq('credential_id', body.credentialId)
        .maybeSingle();

      if (error || !biometric) {
        return json({ error: 'Fingerprint not found' }, 404);
      }

      await verifyAssertion({
        assertion: body.assertion,
        credentialId: body.credentialId,
        expectedChallenge: state.challenge,
        expectedOrigin: state.origin,
        expectedRpId: state.rpId,
        publicKey: biometric.public_key,
      });

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', biometric.user_id)
        .maybeSingle();

      if (profileError || !profile?.email) {
        return json({ error: 'Unable to resolve account for this fingerprint' }, 404);
      }

      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: profile.email,
        options: {
          redirectTo: `${state.origin}/dashboard`,
        },
      });

      if (linkError || !linkData?.properties?.hashed_token) {
        return json({ error: 'Unable to create biometric login session' }, 500);
      }

      return json({
        tokenHash: linkData.properties.hashed_token,
        type: 'magiclink',
      });
    }

    return json({ error: 'Unsupported biometric action' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Biometric login failed';
    return json({ error: message }, 400);
  }
});

/**
 * Utility for WebAuthn (Fingerprint/Biometric) Authentication
 */

export const bufferToBase64 = (buffer: ArrayBuffer): string => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

export const base64ToBuffer = (base64: string): ArrayBuffer => {
    const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        buffer[i] = binary.charCodeAt(i);
    }
    return buffer.buffer;
};

export const isWebAuthnSupported = (): boolean => {
    return !!(
        window.PublicKeyCredential &&
        navigator.credentials &&
        navigator.credentials.create
    );
};

export interface RegistrationResult {
    credentialId: string;
    publicKey: string;
}

export const registerBiometric = async (
    userId: string,
    userEmail: string
): Promise<RegistrationResult> => {
    if (!isWebAuthnSupported()) {
        throw new Error('WebAuthn is not supported in this browser');
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const creationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
            name: 'BananaBills',
            id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
        },
        user: {
            id: new TextEncoder().encode(userId).buffer,
            name: userEmail,
            displayName: userEmail,
        },
        pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' }, // RS256
        ],
        timeout: 60000,
        attestation: 'none',
        authenticatorSelection: {
            authenticatorAttachment: 'cross-platform',
            userVerification: 'required',
            residentKey: 'preferred',
        },
    };

    const credential = (await navigator.credentials.create({
        publicKey: creationOptions,
    })) as PublicKeyCredential;

    if (!credential) {
        throw new Error('Failed to create biometric credential');
    }

    const response = credential.response as AuthenticatorAttestationResponse;

    return {
        credentialId: credential.id,
        publicKey: bufferToBase64(response.getPublicKey()),
    };
};

export const authenticateBiometric = async (
    credentialId: string
): Promise<boolean> => {
    if (!isWebAuthnSupported()) {
        throw new Error('WebAuthn is not supported in this browser');
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const requestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [
            {
                id: base64ToBuffer(credentialId),
                type: 'public-key',
            },
        ],
        userVerification: 'required',
        timeout: 60000,
    };

    const assertion = await navigator.credentials.get({
        publicKey: requestOptions,
    });

    return !!assertion;
};

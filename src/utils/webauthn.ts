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
    const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(normalized + padding);
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

export interface AuthenticationRequestOptions {
    credentialId: string;
    challenge: string;
    rpId: string;
    timeout?: number;
}

export interface AuthenticationResult {
    id: string;
    rawId: string;
    type: PublicKeyCredentialType;
    response: {
        clientDataJSON: string;
        authenticatorData: string;
        signature: string;
        userHandle: string | null;
    };
    clientExtensionResults: AuthenticationExtensionsClientOutputs;
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
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
        ],
        timeout: 60000,
        attestation: 'none',
        authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
            requireResidentKey: false,
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
    options: AuthenticationRequestOptions
): Promise<AuthenticationResult> => {
    if (!isWebAuthnSupported()) {
        throw new Error('WebAuthn is not supported in this browser');
    }

    const requestOptions: PublicKeyCredentialRequestOptions = {
        challenge: base64ToBuffer(options.challenge),
        rpId: options.rpId,
        allowCredentials: [
            {
                id: base64ToBuffer(options.credentialId),
                type: 'public-key',
            },
        ],
        userVerification: 'required',
        timeout: options.timeout ?? 60000,
    };

    const assertion = (await navigator.credentials.get({
        publicKey: requestOptions,
    })) as PublicKeyCredential | null;

    if (!assertion) {
        throw new Error('Biometric authentication was cancelled');
    }

    const response = assertion.response as AuthenticatorAssertionResponse;

    return {
        id: assertion.id,
        rawId: bufferToBase64(assertion.rawId),
        type: assertion.type,
        response: {
            clientDataJSON: bufferToBase64(response.clientDataJSON),
            authenticatorData: bufferToBase64(response.authenticatorData),
            signature: bufferToBase64(response.signature),
            userHandle: response.userHandle ? bufferToBase64(response.userHandle) : null,
        },
        clientExtensionResults: assertion.getClientExtensionResults?.() ?? {},
    };
};

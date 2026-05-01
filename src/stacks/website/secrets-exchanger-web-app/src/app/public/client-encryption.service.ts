import { Injectable } from "@angular/core";

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const NONCE_LENGTH = 12; // 96-bit nonce recommended for AES-GCM

export interface ClientEncryptResult {
    /** base64(nonce || ciphertext || authTag) */
    encryptedData: string;
    /** base64url-encoded raw AES-256-GCM key — embedded in the URL fragment */
    keyB64: string;
}

@Injectable({ providedIn: "root" })
export class ClientEncryptionService {
    /**
     * Encrypts `plaintext` with a freshly generated AES-256-GCM key.
     * Returns the opaque ciphertext blob and the exportable key, both base64-encoded.
     * The key must be kept out of the server — it belongs in the URL fragment only.
     */
    async encryptSecret(plaintext: string): Promise<ClientEncryptResult> {
        const key = await crypto.subtle.generateKey(
            { name: ALGORITHM, length: KEY_LENGTH },
            true,
            ["encrypt", "decrypt"],
        );

        const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
        const encoded = new TextEncoder().encode(plaintext);

        const cipherBuffer = await crypto.subtle.encrypt(
            { name: ALGORITHM, iv: nonce },
            key,
            encoded,
        );

        // Prepend nonce so the decrypt side can split it off deterministically.
        const combined = new Uint8Array(NONCE_LENGTH + cipherBuffer.byteLength);
        combined.set(nonce, 0);
        combined.set(new Uint8Array(cipherBuffer), NONCE_LENGTH);

        const rawKey = await crypto.subtle.exportKey("raw", key);

        return {
            encryptedData: bufToBase64(combined),
            keyB64: bufToBase64(new Uint8Array(rawKey)),
        };
    }

    /**
     * Decrypts `encryptedData` (base64(nonce || ciphertext || authTag)) using
     * the raw AES-256-GCM key supplied as a base64 string.
     * Throws `DOMException` (name "OperationError") on auth-tag failure.
     */
    async decryptSecret(encryptedData: string, keyB64: string): Promise<string> {
        const combined = base64ToBuf(encryptedData);
        const nonce = combined.slice(0, NONCE_LENGTH);
        const ciphertext = combined.slice(NONCE_LENGTH);

        const key = await crypto.subtle.importKey(
            "raw",
            base64ToBuf(keyB64),
            { name: ALGORITHM },
            false,
            ["decrypt"],
        );

        const plainBuffer = await crypto.subtle.decrypt(
            { name: ALGORITHM, iv: nonce },
            key,
            ciphertext,
        );

        return new TextDecoder().decode(plainBuffer);
    }
}

function bufToBase64(buf: Uint8Array): string {
    return btoa(String.fromCharCode(...buf));
}

function base64ToBuf(b64: string): Uint8Array {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

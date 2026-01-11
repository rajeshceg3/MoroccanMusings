
export class CryptoGuard {
    constructor() {
        this.passwordCache = null; // Stored only in memory
        this.algo = { name: 'AES-GCM', length: 256 };
    }

    // PBKDF2 Key Derivation
    async deriveKey(password, salt) {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        return window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            this.algo,
            false,
            ["encrypt", "decrypt"]
        );
    }

    async encrypt(data, password) {
        if (!password) throw new Error("Encryption requires a password.");

        // Generate new salt and IV
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const key = await this.deriveKey(password, salt);
        const enc = new TextEncoder();

        const ciphertext = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            enc.encode(JSON.stringify(data))
        );

        return {
            ciphertext: this._bufferToBase64(ciphertext),
            iv: this._bufferToBase64(iv),
            salt: this._bufferToBase64(salt),
            version: 1,
            tag: 'AEGIS_SECURE'
        };
    }

    async decrypt(encryptedPacket, password) {
        if (!password) throw new Error("Decryption requires a password.");
        if (encryptedPacket.tag !== 'AEGIS_SECURE') throw new Error("Invalid encryption format.");

        const salt = this._base64ToBuffer(encryptedPacket.salt);
        const iv = this._base64ToBuffer(encryptedPacket.iv);
        const ciphertext = this._base64ToBuffer(encryptedPacket.ciphertext);

        const key = await this.deriveKey(password, salt);

        try {
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                ciphertext
            );
            const dec = new TextDecoder();
            return JSON.parse(dec.decode(decryptedBuffer));
        } catch (e) {
            throw new Error("Decryption failed. Incorrect password or data corruption.");
        }
    }

    // Session Management
    setSessionPassword(password) {
        this.passwordCache = password;
    }

    getSessionPassword() {
        return this.passwordCache;
    }

    clearSession() {
        this.passwordCache = null;
    }

    hasSession() {
        return !!this.passwordCache;
    }

    // Utilities
    _bufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    _base64ToBuffer(base64) {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

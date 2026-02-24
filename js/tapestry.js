import { CryptoGuard } from './crypto-guard.js';

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class TapestryLedger {
    constructor(storageKey = 'marq_tapestry_threads') {
        this.storageKey = storageKey;
        this.crypto = new CryptoGuard();
        this.isIntegrityVerified = false;
        this.status = 'UNINITIALIZED'; // UNINITIALIZED, LOCKED, READY
        this.threads = []; // Will be populated in initialize
    }

    _loadRaw() {
        return localStorage.getItem(this.storageKey);
    }

    async _save() {
        if (this.status === 'LOCKED') return; // Cannot save if locked
        try {
            let dataToSave = this.threads;

            // If we have a session password, encrypt before saving
            if (this.crypto.hasSession()) {
                const password = this.crypto.getSessionPassword();
                dataToSave = await this.crypto.encrypt(this.threads, password);
            }

            localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
        } catch (e) {
            console.error('Failed to save tapestry threads', e);
        }
    }

    async initialize() {
        const raw = this._loadRaw();

        if (!raw) {
            this.threads = [];
            this.status = 'READY';
            this.isIntegrityVerified = true;
            return this.status;
        }

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch {
            console.error('Corrupt storage.');
            this.threads = [];
            return 'READY';
        }

        // Check if encrypted
        if (parsed && parsed.tag === 'AEGIS_SECURE') {
            this.status = 'LOCKED';
            // System Locked. Secure Enclave Active.
            return 'LOCKED';
        }

        // It is plaintext
        if (Array.isArray(parsed)) {
            this.threads = parsed;
            // Check for legacy data (missing hash or missing content field)
            const needsMigration = this.threads.some((t) => !t.hash || typeof t.content === 'undefined');
            if (needsMigration) {
                // Migrating legacy tapestry data to ledger format...
                await this._migrateData();
            }
            await this.verifyIntegrity();
            this.status = 'READY';
            return 'READY';
        }

        console.error('Unknown storage format. Resetting.');
        this.threads = [];
        this.status = 'READY';
        return 'READY';
    }

    async unlock(password) {
        if (this.status !== 'LOCKED') return true;

        const raw = this._loadRaw();
        const encrypted = JSON.parse(raw);

        try {
            const decrypted = await this.crypto.decrypt(encrypted, password);
            this.threads = decrypted;
            this.crypto.setSessionPassword(password);
            this.status = 'READY';
            await this.verifyIntegrity();
            return true;
        } catch (e) {
            console.error('Unlock failed:', e);
            return false;
        }
    }

    async lock() {
        if (!this.crypto.hasSession()) return false; // Can't lock if no password known
        this.status = 'LOCKED';
        this.threads = []; // Clear memory
        this.crypto.clearSession(); // Clear key from memory
        // Data is already encrypted on disk from last save
        return true;
    }

    async enableEncryption(password) {
        this.crypto.setSessionPassword(password);
        await this._save(); // Will encrypt now
    }

    async disableEncryption() {
        if (!this.crypto.hasSession()) return false;
        this.crypto.clearSession();
        await this._save(); // Will save as plaintext
        return true;
    }

    async _migrateData() {
        const migratedThreads = [];
        let previousHash = 'GENESIS_HASH';

        for (const thread of this.threads) {
            // Ensure thread has required fields, default if missing
            const timestamp = thread.timestamp || Date.now();
            const intention = thread.intention || 'unknown';

            const payload = {
                intention: intention,
                time: thread.time || 'midday',
                region: thread.region || 'unknown',
                title: thread.title || 'Legacy Thread',
                content: thread.content || '',
                timestamp: timestamp,
                previousHash: previousHash
            };

            const hash = await sha256(JSON.stringify(payload));

            migratedThreads.push({
                id: hash.substring(0, 12),
                ...payload,
                hash: hash
            });

            previousHash = hash;
        }

        this.threads = migratedThreads;
        await this._save();
    }

    async verifyIntegrity() {
        if (this.threads.length === 0) {
            this.isIntegrityVerified = true;
            return true;
        }

        let previousHash = 'GENESIS_HASH';
        for (let i = 0; i < this.threads.length; i++) {
            const thread = this.threads[i];

            // Reconstruct payload to verify
            const dataString = JSON.stringify({
                intention: thread.intention,
                time: thread.time,
                region: thread.region,
                title: thread.title,
                content: thread.content || '',
                timestamp: thread.timestamp,
                previousHash: previousHash
            });
            const calculatedHash = await sha256(dataString);

            if (calculatedHash !== thread.hash) {
                console.warn(
                    `Integrity failure at thread ${i}. Expected ${calculatedHash}, got ${thread.hash}`
                );
                thread.integrityStatus = 'corrupted';
                this.isIntegrityVerified = false;
                return false;
            }
            previousHash = thread.hash;
        }
        this.isIntegrityVerified = true;
        return true;
    }

    async addThread(data) {
        if (this.status === 'LOCKED') throw new Error('Ledger is Locked');

        const previousHash =
            this.threads.length > 0
                ? this.threads[this.threads.length - 1].hash
                : 'GENESIS_HASH';
        const timestamp = Date.now();

        const payload = {
            intention: data.intention,
            time: data.time,
            region: data.region,
            title: data.title,
            content: data.content || '',
            timestamp: timestamp,
            previousHash: previousHash
        };

        const hash = await sha256(JSON.stringify(payload));

        const thread = {
            id: hash.substring(0, 12), // Short ID for UI
            ...payload,
            hash: hash
        };

        this.threads.push(thread);
        await this._save();
        return thread;
    }

    async reload() {
        const raw = this._loadRaw();
        if (!raw) {
            this.threads = [];
            return;
        }

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch {
            console.error('Corrupt storage during reload.');
            return;
        }

        // Check if encrypted
        if (parsed && parsed.tag === 'AEGIS_SECURE') {
            if (this.crypto.hasSession()) {
                // Try to auto-decrypt with current key
                try {
                    const password = this.crypto.getSessionPassword();
                    const decrypted = await this.crypto.decrypt(
                        parsed,
                        password
                    );
                    this.threads = decrypted;
                    await this.verifyIntegrity();
                } catch (e) {
                    console.error(
                        'Reload failed: Key mismatch or corruption',
                        e
                    );
                    this.status = 'LOCKED';
                    this.threads = [];
                }
            } else {
                this.status = 'LOCKED';
                this.threads = [];
            }
        } else {
            // Plaintext
            if (Array.isArray(parsed)) {
                this.threads = parsed;
                await this.verifyIntegrity();
                this.status = 'READY';
            }
        }
    }

    getThreads() {
        if (this.status === 'LOCKED') return [];
        return [...this.threads];
    }

    getSnapshot() {
        // Return a deep copy to prevent mutation of history
        return JSON.parse(JSON.stringify(this.getThreads()));
    }

    async loadSnapshot(threads) {
        if (this.status === 'LOCKED') throw new Error('Ledger Locked');
        // Validate schema roughly or trust internal snapshot?
        // Trusting internal snapshot for speed, but deep cloning to ensure separation
        this.threads = JSON.parse(JSON.stringify(threads));
        await this._save();
        await this.verifyIntegrity(); // Re-verify just in case
    }

    async importScroll(jsonString) {
        if (this.status === 'LOCKED')
            throw new Error('Unlock ledger to import');

        try {
            // MAX SIZE CHECK (e.g., 5MB)
            if (jsonString.length > 5 * 1024 * 1024)
                throw new Error('File too large');

            const imported = JSON.parse(jsonString);
            if (!Array.isArray(imported))
                throw new Error('Invalid format: Root must be an array');

            // Limit number of threads to prevent memory exhaustion
            if (imported.length > 1000)
                throw new Error('Too many threads in scroll (Limit: 1000)');

            // Strict Schema Validation
            const validSchema = imported.every((thread) =>
                this._validateThreadSchema(thread)
            );

            if (!validSchema)
                throw new Error(
                    'Invalid schema or data types in imported threads'
                );

            // verify the imported chain
            const tempLedger = new TapestryLedger('temp');
            tempLedger.threads = imported;
            const valid = await tempLedger.verifyIntegrity();

            if (!valid)
                throw new Error('Integrity check failed for imported scroll');

            this.threads = imported;
            await this._save();
            return true;
        } catch (e) {
            console.error('Import failed', e);
            throw e;
        }
    }

    _validateThreadSchema(thread) {
        // Type checks
        if (typeof thread.id !== 'string') return false;
        if (typeof thread.intention !== 'string') return false;
        if (typeof thread.time !== 'string') return false;
        if (typeof thread.region !== 'string') return false;
        if (typeof thread.title !== 'string') return false;
        if (typeof thread.hash !== 'string') return false;
        if (typeof thread.timestamp !== 'number') return false;

        // Content checks (Sanitization / Whitelisting)
        if (thread.id.length > 32) return false;
        if (thread.title.length > 100) return false;
        if (thread.region.length > 50) return false;
        if (thread.content && typeof thread.content !== 'string') return false;

        // Regex Validation (Alpha-numeric + specific safe chars)
        // Prevent script injection via title/region if they are rendered anywhere sensitive
        // Expanded to include semicolons (;) for narrative text
        const safeTextRegex = /^[a-zA-Z0-9\s\-_.,!?'"();]+$/;
        if (!safeTextRegex.test(thread.title)) return false;
        if (!safeTextRegex.test(thread.region)) return false;
        if (thread.content && !safeTextRegex.test(thread.content)) return false;

        // Enum checks
        const validIntentions = [
            'serenity',
            'vibrancy',
            'awe',
            'legacy',
            'unknown'
        ];
        const validTimes = ['dawn', 'midday', 'dusk', 'night', 'unknown'];

        if (!validIntentions.includes(thread.intention)) return false;
        if (!validTimes.includes(thread.time)) return false;

        // Hash format check (Hex)
        if (!/^[a-f0-9]{64}$/i.test(thread.hash)) return false;

        return true;
    }

    exportScroll() {
        if (this.status === 'LOCKED') throw new Error('Ledger Locked');
        return JSON.stringify(this.threads, null, 2);
    }

    clear() {
        if (this.status === 'LOCKED') return;
        this.threads = [];
        this._save();
    }
}


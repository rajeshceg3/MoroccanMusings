
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export class TapestryLedger {
    constructor(storageKey = 'marq_tapestry_threads') {
        this.storageKey = storageKey;
        this.threads = this._loadLocal();
        this.isIntegrityVerified = false;
        // Migration and verification must be called explicitly via initialize()
    }

    _loadLocal() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) return [];
            const parsed = JSON.parse(data);
            if (!Array.isArray(parsed)) throw new Error("Invalid storage format");
            return parsed;
        } catch (e) {
            console.error("Failed to load tapestry threads", e);
            return [];
        }
    }

    _save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.threads));
        } catch (e) { console.error("Failed to save tapestry threads", e); }
    }

    async initialize() {
        // Check for legacy data (threads without hash)
        const needsMigration = this.threads.some(t => !t.hash);

        if (needsMigration) {
            console.log("Migrating legacy tapestry data to ledger format...");
            await this._migrateData();
        }

        await this.verifyIntegrity();
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
        this._save();
        console.log("Migration complete.");
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
                timestamp: thread.timestamp,
                previousHash: previousHash
            });
            const calculatedHash = await sha256(dataString);

            if (calculatedHash !== thread.hash) {
                console.warn(`Integrity failure at thread ${i}. Expected ${calculatedHash}, got ${thread.hash}`);
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
        const previousHash = this.threads.length > 0 ? this.threads[this.threads.length - 1].hash : 'GENESIS_HASH';
        const timestamp = Date.now();

        const payload = {
            intention: data.intention,
            time: data.time,
            region: data.region,
            title: data.title,
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
        this._save();
        return thread;
    }

    getThreads() { return [...this.threads]; }

    async importScroll(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            if (!Array.isArray(imported)) throw new Error("Invalid format");

            // verify the imported chain
            const tempLedger = new TapestryLedger('temp');
            tempLedger.threads = imported;
            const valid = await tempLedger.verifyIntegrity();

            if (!valid) throw new Error("Integrity check failed for imported scroll");

            this.threads = imported;
            this._save();
            return true;
        } catch (e) {
            console.error("Import failed", e);
            return false;
        }
    }

    exportScroll() {
        return JSON.stringify(this.threads, null, 2);
    }

    clear() { this.threads = []; this._save(); }
}

export class MandalaRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.dpr = window.devicePixelRatio || 1;
        this.selectedIndices = []; // Added for selection state
        this.resize();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * this.dpr;
        this.canvas.height = rect.height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);
        this.width = rect.width;
        this.height = rect.height;
    }

    setSelection(indices) {
        this.selectedIndices = indices || [];
    }

    render(threads) {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Background Gradient based on thread count
        const cx = this.width / 2;
        const cy = this.height / 2;

        const gradient = this.ctx.createRadialGradient(cx, cy, 10, cx, cy, this.width / 1.5);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#000000');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (threads.length === 0) {
            this.ctx.fillStyle = "#444";
            this.ctx.font = "italic 16px Inter";
            this.ctx.textAlign = "center";
            this.ctx.fillText("The Loom awaits your thread.", cx, cy);
            return;
        }

        this.ctx.save();
        this.ctx.translate(cx, cy);

        // Base geometry
        threads.forEach((thread, i) => {
            // Safety check for hash
            if (!thread.hash) return;
            this.drawMandalaLayer(thread, i, threads.length);
        });

        this.ctx.restore();
    }

    drawMandalaLayer(thread, index, total) {
        // Use hash to determine geometric properties
        // Hash is hex string. We can parse parts of it.
        const hashVal = parseInt(thread.hash.substring(0, 8), 16);
        const sides = 3 + (hashVal % 12); // 3 to 14 sides
        const radius = 40 + (index * 20); // Growing radius

        const isSelected = this.selectedIndices.includes(index);

        const colors = { 'serenity': '#4a7c82', 'vibrancy': '#c67605', 'awe': '#b85b47', 'legacy': '#5d4037' };
        const baseColor = colors[thread.intention] || '#888';

        this.ctx.strokeStyle = isSelected ? '#ffffff' : baseColor;
        this.ctx.lineWidth = isSelected ? 3 + (index * 0.1) : 1 + (index * 0.1);
        this.ctx.globalAlpha = isSelected ? 1.0 : 0.6 + (0.4 * (index / total));

        const rotationOffset = (hashVal % 360) * (Math.PI / 180);

        this.ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
            const theta = (i / sides) * 2 * Math.PI + rotationOffset;
            const x = radius * Math.cos(theta);
            const y = radius * Math.sin(theta);

            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        this.ctx.stroke();

        // Decoration points
        const decor = (hashVal >> 4) % 3;
        if (decor === 0 || isSelected) {
            // Dots at vertices
            for (let i = 0; i < sides; i++) {
                const theta = (i / sides) * 2 * Math.PI + rotationOffset;
                this.ctx.fillStyle = isSelected ? '#ffffff' : baseColor;
                this.ctx.beginPath();
                this.ctx.arc(radius * Math.cos(theta), radius * Math.sin(theta), isSelected ? 4 : 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    getThreadIndexAt(x, y) {
        // Transform client coords to canvas space
        const rect = this.canvas.getBoundingClientRect();
        // Since we scale by DPR in resize, but event coords are CSS pixels, and context is scaled:
        // We just need the position relative to center in CSS pixels.
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        const dx = x - rect.left - cx;
        const dy = y - rect.top - cy;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Reverse the radius logic: radius = 40 + (index * 20)
        // index = (distance - 40) / 20
        // We add a tolerance (e.g. +/- 10px)
        const estimatedIndex = (distance - 40) / 20;
        const roundedIndex = Math.round(estimatedIndex);

        if (Math.abs(estimatedIndex - roundedIndex) < 0.5 && roundedIndex >= 0) {
            return roundedIndex;
        }
        return -1;
    }
}


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
            // MAX SIZE CHECK (e.g., 5MB)
            if (jsonString.length > 5 * 1024 * 1024) throw new Error("File too large");

            const imported = JSON.parse(jsonString);
            if (!Array.isArray(imported)) throw new Error("Invalid format: Root must be an array");

            // Limit number of threads to prevent memory exhaustion
            if (imported.length > 1000) throw new Error("Too many threads in scroll (Limit: 1000)");

            // Strict Schema Validation
            const validSchema = imported.every(thread => this._validateThreadSchema(thread));

            if (!validSchema) throw new Error("Invalid schema or data types in imported threads");

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
            // Propagate error message to UI if needed, or return false
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

        // Enum checks
        const validIntentions = ['serenity', 'vibrancy', 'awe', 'legacy', 'unknown'];
        const validTimes = ['dawn', 'midday', 'dusk', 'night', 'unknown'];

        if (!validIntentions.includes(thread.intention)) return false;
        // We allow loose time check as it might be 'unknown' or legacy, but better to restrict if possible.
        // Assuming current data.js uses strict times.
        if (!validTimes.includes(thread.time)) return false;

        // Hash format check (Hex)
        if (!/^[a-f0-9]{64}$/i.test(thread.hash)) return false;

        return true;
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

        // Shadow DOM for Accessibility
        this.a11yContainer = document.createElement('div');
        this.a11yContainer.id = 'tapestry-a11y-layer';
        this.a11yContainer.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; overflow:hidden; z-index:10;';
        this.canvas.parentElement.appendChild(this.a11yContainer);
        this.canvas.parentElement.style.position = 'relative'; // Ensure parent is positioned

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

    render(threads, projections = []) {
        this.updateAccessibilityTree(threads); // Sync DOM

        this.ctx.clearRect(0, 0, this.width, this.height);

        // Background Gradient based on thread count
        const cx = this.width / 2;
        const cy = this.height / 2;

        const gradient = this.ctx.createRadialGradient(cx, cy, 10, cx, cy, this.width / 1.5);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#000000');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (threads.length === 0 && projections.length === 0) {
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

        // Projection geometry
        if (projections.length > 0) {
            projections.forEach((ghost, i) => {
                // Ghost index continues from last real thread
                this.drawMandalaLayer(ghost, threads.length + i, threads.length + projections.length);
            });
        }

        this.ctx.restore();
    }

    updateAccessibilityTree(threads) {
        // Clear existing buttons
        this.a11yContainer.innerHTML = '';
        const cx = this.width / 2;
        const cy = this.height / 2;

        threads.forEach((thread, index) => {
             const btn = document.createElement('button');
             btn.setAttribute('type', 'button');
             btn.setAttribute('aria-label', `Thread ${index + 1}: ${thread.title} (${thread.intention}, ${thread.time})`);
             btn.setAttribute('aria-pressed', this.selectedIndices.includes(index) ? 'true' : 'false');

             // Calculate approximate position for visual focus indicator (optional, mostly for tabbing)
             // We can position them centrally or in a stack, but absolute positioning over the ring
             // helps context if a screen reader user uses a touch explore mode.
             // Radius = 40 + (index * 20);
             // Since it's a ring, we just center it and give it the dimension of the ring?
             // Or just make them 0-size at the center.
             // Let's make them cover the ring area roughly.
             const radius = 40 + (index * 20);
             // Position at center, but we can't easily make a ring-shaped button.
             // Best practice: Stack them logically or make them small targets at the "start" of the ring.

             btn.style.cssText = `
                position: absolute;
                left: ${cx / this.dpr}px;
                top: ${(cy / this.dpr) - radius}px;
                width: 20px;
                height: 20px;
                transform: translate(-50%, -50%);
                pointer-events: auto; /* Allow interaction */
                opacity: 0.01; /* Almost invisible but clickable for debugging/mouse */
                cursor: pointer;
             `;

             // When focused, show a ring focus via canvas or DOM?
             // The canvas already handles selection visual.

             btn.addEventListener('focus', () => {
                 // Trigger canvas selection visual without full selection toggle logic if we just want focus highlight
                 // But for now, let's just allow activation.
             });

             btn.addEventListener('click', (e) => {
                 // Simulate canvas click logic
                 // We need to notify the parent app.
                 // Since we don't have a direct callback here, we dispatch a custom event on the canvas.
                 const event = new CustomEvent('tapestry-thread-click', { detail: { index } });
                 this.canvas.dispatchEvent(event);
             });

             this.a11yContainer.appendChild(btn);
        });
    }

    drawMandalaLayer(thread, index, total) {
        // Use hash to determine geometric properties
        // Hash is hex string. We can parse parts of it.
        const hashVal = parseInt(thread.hash.substring(0, 8), 16);
        const sides = 3 + (hashVal % 12); // 3 to 14 sides
        const radius = 40 + (index * 20); // Growing radius

        const isSelected = this.selectedIndices.includes(index);
        const isGhost = thread.isGhost === true;

        const colors = { 'serenity': '#4a7c82', 'vibrancy': '#c67605', 'awe': '#b85b47', 'legacy': '#5d4037' };
        const baseColor = colors[thread.intention] || '#888';

        this.ctx.strokeStyle = isSelected ? '#ffffff' : baseColor;
        this.ctx.lineWidth = isSelected ? 3 + (index * 0.1) : (isGhost ? 1 : 1 + (index * 0.1));

        if (isGhost) {
             this.ctx.setLineDash([5, 5]); // Dashed line for ghosts
             this.ctx.globalAlpha = 0.5 + (Math.sin(Date.now() / 500) * 0.2); // Pulsing
        } else {
             this.ctx.setLineDash([]);
             this.ctx.globalAlpha = isSelected ? 1.0 : 0.6 + (0.4 * (index / total));
        }

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
        const rect = this.canvas.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const dx = x - rect.left - cx;
        const dy = y - rect.top - cy;

        // Correct distance calculation matches the drawing logic (drawing is independent of DPR scale visually in CSS pixels)
        // The drawing logic: radius = 40 + (index * 20)
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Tolerance: +/- 10 pixels (half the gap between rings)
        const estimatedIndex = (distance - 40) / 20;
        const roundedIndex = Math.round(estimatedIndex);

        // Check if within the valid "stroke width" area of the ring
        // The ring is at 40 + i*20. We want to accept if distance is between radius - 5 and radius + 5?
        // Actually, previous logic < 0.5 meant +/- 10px (0.5 * 20).
        // Let's tighten it slightly to prevent mis-clicks, but +/- 8px is good.
        // 0.4 * 20 = 8px.
        if (Math.abs(estimatedIndex - roundedIndex) < 0.4 && roundedIndex >= 0) {
            return roundedIndex;
        }
        return -1;
    }
}

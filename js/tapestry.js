export class TapestryService {
    constructor(storageKey = 'marq_tapestry_threads') {
        this.storageKey = storageKey;
        this.threads = this._load();
    }
    _load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) return [];

            const parsed = JSON.parse(data);
            if (!Array.isArray(parsed)) throw new Error("Invalid storage format");

            // Validate structure of each thread
            return parsed.filter(t => t && t.intention && t.time && t.region && t.title && t.timestamp);
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
    addThread(data) {
        const thread = { id: Date.now().toString(36) + Math.random().toString(36).substr(2), timestamp: Date.now(), ...data };
        this.threads.push(thread);
        this._save();
        return thread;
    }
    getThreads() { return [...this.threads]; }
    clear() { this.threads = []; this._save(); }
}

export class TapestryRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.dpr = window.devicePixelRatio || 1;
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
    render(threads) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        const cx = this.width / 2;
        const cy = this.height / 2;
        this.drawStar(cx, cy, 5, 20, 10, '#c67605'); // Central Star

        if (threads.length === 0) {
            this.ctx.fillStyle = "#444";
            this.ctx.font = "italic 16px Inter";
            this.ctx.textAlign = "center";
            this.ctx.fillText("Your tapestry is yet to be woven.", cx, cy + 60);
            return;
        }
        threads.forEach((thread, index) => {
            const radius = 50 + (index * 30);
            this.drawThreadRing(cx, cy, radius, thread, index);
        });
    }
    drawThreadRing(cx, cy, radius, thread, index) {
        this.ctx.save();
        this.ctx.translate(cx, cy);
        const colors = { 'serenity': '#4a7c82', 'vibrancy': '#c67605', 'awe': '#b85b47', 'legacy': '#5d4037' };
        const color = colors[thread.intention] || '#888';
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1.5;
        this.ctx.globalAlpha = 0.8;
        const rotations = { 'dawn': 0, 'midday': Math.PI/2, 'dusk': Math.PI, 'night': -Math.PI/2 };
        this.ctx.rotate(rotations[thread.time] || 0);
        this.ctx.beginPath();
        if (thread.intention === 'serenity') {
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
            this.ctx.stroke();
            for(let i=0; i<8; i++) {
                let ang = (i / 8) * Math.PI * 2;
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.arc(Math.cos(ang)*radius, Math.sin(ang)*radius, 3, 0, Math.PI*2);
                this.ctx.fill();
            }
        } else if (thread.intention === 'vibrancy') {
            const points = 16;
            for (let i = 0; i <= points; i++) {
                const angle = (i / points) * Math.PI * 2;
                const r = i % 2 === 0 ? radius : radius + 10;
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            this.ctx.stroke();
        } else if (thread.intention === 'awe') {
            this.ctx.setLineDash([5, 5]);
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        } else {
             const sides = 6;
             for (let i = 0; i <= sides; i++) {
                const angle = (i / sides) * Math.PI * 2;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            this.ctx.stroke();
        }
        this.ctx.restore();
    }
    drawStar(cx, cy, spikes, outerRadius, innerRadius, color) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
        }
        this.ctx.lineTo(cx, cy - outerRadius);
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }
}

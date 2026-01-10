export class MapRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.dpr = window.devicePixelRatio || 1;
        this.threads = [];
        this.activeNodeIndex = -1;

        // Simplified Morocco Vector Path (0-100 coordinate space)
        // Tangier (50, 5), Oujda (85, 20), Figuig (90, 60), Zagora (60, 80), Dakhla (10, 95) - simplified
        // This is an abstract representation for strategic visualization
        this.mapPath = [
            {x: 45, y: 5},  // Tangier
            {x: 60, y: 10}, // Tetouan
            {x: 80, y: 20}, // Oujda
            {x: 85, y: 40}, // Figuig
            {x: 75, y: 70}, // Merzouga area
            {x: 60, y: 80}, // Zagora
            {x: 30, y: 85}, // Anti-Atlas
            {x: 20, y: 95}, // Dakhla/South (truncated)
            {x: 10, y: 80}, // Laayoune
            {x: 15, y: 65}, // Agadir
            {x: 25, y: 50}, // Essaouira
            {x: 35, y: 30}, // Casablanca/Rabat
            {x: 45, y: 5}   // Back to Tangier
        ];

        this.resize();
        this._bindEvents();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * this.dpr;
        this.canvas.height = rect.height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);
        this.width = rect.width;
        this.height = rect.height;
    }

    render(threads, locations) {
        this.threads = threads;
        this.locations = locations;

        this.ctx.clearRect(0, 0, this.width, this.height);

        // Map Scale Factor to fit canvas with padding
        const padding = 40;
        const mapWidth = this.width - (padding * 2);
        const mapHeight = this.height - (padding * 2);

        // Draw Map Background
        this.ctx.save();
        this.ctx.translate(padding, padding);

        this.ctx.beginPath();
        this.mapPath.forEach((pt, i) => {
            const x = (pt.x / 100) * mapWidth;
            const y = (pt.y / 100) * mapHeight;
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        });
        this.ctx.closePath();

        // Map Styling: Tactical Grid
        this.ctx.strokeStyle = '#334433';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.fillStyle = '#0a1a0a';
        this.ctx.fill();

        // Draw Grid Lines
        this.ctx.strokeStyle = '#1a2a1a';
        this.ctx.lineWidth = 1;
        for(let i=10; i<100; i+=10) {
            // Vertical
            const x = (i/100) * mapWidth;
            this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, mapHeight); this.ctx.stroke();
            // Horizontal
            const y = (i/100) * mapHeight;
            this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(mapWidth, y); this.ctx.stroke();
        }

        // Plot Threads
        if (threads.length > 0) {
            // Draw Connections
            this.ctx.strokeStyle = '#c67605'; // Gold
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();

            let lastX = null, lastY = null;

            threads.forEach((t) => {
                const coords = this._getThreadCoords(t);
                if (coords) {
                    const x = (coords.x / 100) * mapWidth;
                    const y = (coords.y / 100) * mapHeight;

                    if (lastX !== null) {
                        this.ctx.lineTo(x, y);
                    } else {
                        this.ctx.moveTo(x, y);
                    }
                    lastX = x; lastY = y;
                }
            });
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            // Draw Nodes
            threads.forEach((t, i) => {
                const coords = this._getThreadCoords(t);
                if (coords) {
                    const x = (coords.x / 100) * mapWidth;
                    const y = (coords.y / 100) * mapHeight;

                    const isHovered = (i === this.activeNodeIndex);

                    // Pulsing effect for last thread
                    if (i === threads.length - 1) {
                        const pulse = 10 + Math.sin(Date.now() / 200) * 5;
                        this.ctx.fillStyle = 'rgba(198, 118, 5, 0.2)';
                        this.ctx.beginPath();
                        this.ctx.arc(x, y, pulse, 0, Math.PI * 2);
                        this.ctx.fill();
                    }

                    this.ctx.fillStyle = isHovered ? '#ffffff' : '#c67605';
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, isHovered ? 6 : 4, 0, Math.PI * 2);
                    this.ctx.fill();

                    // Label active node
                    if (isHovered) {
                         this.ctx.font = '12px Courier New';
                         this.ctx.fillStyle = '#ffffff';
                         this.ctx.fillText(t.title || 'Unknown', x + 10, y);
                         this.ctx.fillStyle = '#aaaaaa';
                         this.ctx.fillText(t.region, x + 10, y + 14);
                    }
                }
            });
        } else {
             this.ctx.fillStyle = "#445544";
             this.ctx.font = "italic 16px monospace";
             this.ctx.textAlign = "center";
             this.ctx.fillText("NO SIGNAL", mapWidth/2, mapHeight/2);
        }

        this.ctx.restore();

        if (this.activeNodeIndex !== -1) {
            requestAnimationFrame(() => this.render(this.threads, this.locations));
        }
    }

    _getThreadCoords(thread) {
        // Find location in data
        // Key format intention.region.time
        // However, thread might only have 'region' property or we need to reconstruct key.
        // js/tapestry.js stores region, time, intention.
        const key = `${thread.intention}.${thread.region}.${thread.time}`;
        const loc = this.locations[key];

        if (loc && loc.coordinates) return loc.coordinates;

        // Fallback based on region string if exact match fails
        if (thread.region === 'coast') return {x: 25, y: 55};
        if (thread.region === 'medina') return {x: 60, y: 30};
        if (thread.region === 'sahara') return {x: 75, y: 75};

        return {x: 50, y: 50}; // Default center
    }

    _bindEvents() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left);
            const mouseY = (e.clientY - rect.top);

            // Convert back to map space
            const padding = 40;
            const mapWidth = this.width - (padding * 2);
            const mapHeight = this.height - (padding * 2);

            // Check collisions
            let found = -1;
            this.threads.forEach((t, i) => {
                const coords = this._getThreadCoords(t);
                if (coords) {
                     // Translate coords to screen pixels
                     // Note: We need to handle scale if canvas is scaled via CSS?
                     // Here we assume 1:1 CSS pixel to internal width/height logic before DPR
                     // Actually, we drew with transform(padding, padding).

                     const cx = padding + (coords.x / 100) * mapWidth;
                     const cy = padding + (coords.y / 100) * mapHeight;

                     const dist = Math.sqrt(Math.pow(mouseX - (cx/this.dpr), 2) + Math.pow(mouseY - (cy/this.dpr), 2)); // Adjustment for mouse vs canvas coordinate space
                     // Actually simplest is to just check distance in logic space
                     // But mouse is in CSS pixels.
                     // The logic space (cx) was scaled by DPR? No, we used this.ctx.scale(dpr).
                     // So we draw in logic pixels.

                     // Logic Pixel coord:
                     const logicX = padding + (coords.x / 100) * (this.width - 80); // wait, this.width is * DPR.
                     // let's stick to logic coords.
                     // Rect width is CSS width.
                     const cssWidth = rect.width;
                     const cssHeight = rect.height;
                     const cssPadding = 40 / this.dpr; // Approximation if we don't track it

                     // Let's re-calculate cleanly.
                     // Map drawing area in CSS pixels:
                     const drawW = rect.width - 80; // 40px padding left/right
                     const drawH = rect.height - 80;

                     const tx = 40 + (coords.x / 100) * drawW;
                     const ty = 40 + (coords.y / 100) * drawH;

                     const d = Math.sqrt(Math.pow(mouseX - tx, 2) + Math.pow(mouseY - ty, 2));
                     if (d < 15) {
                         found = i;
                     }
                }
            });

            if (this.activeNodeIndex !== found) {
                this.activeNodeIndex = found;
                this.canvas.style.cursor = found !== -1 ? 'pointer' : 'default';
                this.render(this.threads, this.locations);
            }
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.activeNodeIndex !== -1) {
                 // Open thread details?
                 // For now just log, or trigger same event as Tapestry
                 console.log("Map clicked thread", this.activeNodeIndex);
            }
        });
    }
}

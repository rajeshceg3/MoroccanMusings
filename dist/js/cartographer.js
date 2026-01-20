import { PrometheusEngine } from './prometheus.js';

export class MapRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.dpr = window.devicePixelRatio || 1;
        this.threads = [];
        this.activeNodeIndex = -1;

        // Initialize Prometheus Heatmap Engine
        this.prometheus = new PrometheusEngine();

        // Simplified Morocco Vector Path (0-100 coordinate space)
        // Tangier (50, 5), Oujda (85, 20), Figuig (90, 60), Zagora (60, 80), Dakhla (10, 95) - simplified
        // This is an abstract representation for strategic visualization
        this.mapPath = [
            { x: 45, y: 5 }, // Tangier
            { x: 60, y: 10 }, // Tetouan
            { x: 80, y: 20 }, // Oujda
            { x: 85, y: 40 }, // Figuig
            { x: 75, y: 70 }, // Merzouga area
            { x: 60, y: 80 }, // Zagora
            { x: 30, y: 85 }, // Anti-Atlas
            { x: 20, y: 95 }, // Dakhla/South (truncated)
            { x: 10, y: 80 }, // Laayoune
            { x: 15, y: 65 }, // Agadir
            { x: 25, y: 50 }, // Essaouira
            { x: 35, y: 30 }, // Casablanca/Rabat
            { x: 45, y: 5 } // Back to Tangier
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

    render(threads, locations, ghosts = [], threatZones = []) {
        this.threads = threads;
        this.locations = locations;
        this.ghosts = ghosts;
        this.threatZones = threatZones;

        // Update Prometheus Heatmap
        this.prometheus.update(threads, locations, this.width, this.height);

        this.ctx.clearRect(0, 0, this.width, this.height);

        // Map Scale Factor to fit canvas with padding
        const padding = 40;
        const mapWidth = this.width - padding * 2;
        const mapHeight = this.height - padding * 2;

        // Draw Prometheus Heatmap Layer (Background Intelligence)
        this.ctx.save();
        this.ctx.globalAlpha = 0.8; // Subtle blend
        this.ctx.drawImage(this.prometheus.canvas, 0, 0);
        this.ctx.restore();

        // Draw Map Background (Vector Overlay)
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

        // Semi-transparent fill to reveal heatmap underneath
        this.ctx.fillStyle = 'rgba(10, 26, 10, 0.4)';
        this.ctx.fill();

        // Draw Grid Lines
        this.ctx.strokeStyle = '#1a2a1a';
        this.ctx.lineWidth = 1;
        for (let i = 10; i < 100; i += 10) {
            // Vertical
            const x = (i / 100) * mapWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, mapHeight);
            this.ctx.stroke();
            // Horizontal
            const y = (i / 100) * mapHeight;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(mapWidth, y);
            this.ctx.stroke();
        }

        // Plot Threat Zones (Sentinel)
        if (threatZones && threatZones.length > 0) {
            threatZones.forEach((zone) => {
                const x = (zone.x / 100) * mapWidth;
                const y = (zone.y / 100) * mapHeight;
                const r = zone.r || 15;

                // Pulse
                const pulse = Math.sin(Date.now() / 300) * 0.2 + 0.3; // 0.1 to 0.5 opacity
                this.ctx.fillStyle =
                    zone.level === 'HIGH' || zone.level === 'CRITICAL'
                        ? `rgba(255, 0, 0, ${pulse})`
                        : `rgba(255, 165, 0, ${pulse})`;

                this.ctx.beginPath();
                this.ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
                this.ctx.fill();

                // Stroke
                this.ctx.strokeStyle = '#ff3333';
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([2, 4]);
                this.ctx.beginPath();
                this.ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            });
        }

        // Plot Threads and Ghosts
        if (threads.length > 0 || ghosts.length > 0) {
            // Draw Connections for Real Threads
            this.ctx.strokeStyle = '#c67605'; // Gold
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();

            let lastX = null;

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
                    lastX = x;
                }
            });
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            // Draw Nodes for Real Threads
            threads.forEach((t, i) => {
                const coords = this._getThreadCoords(t);
                if (coords) {
                    const x = (coords.x / 100) * mapWidth;
                    const y = (coords.y / 100) * mapHeight;

                    const isHovered = i === this.activeNodeIndex;

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

            // Draw Ghosts
            this.ghosts.forEach((g) => {
                if (g.coordinates) {
                    const x = (g.coordinates.x / 100) * mapWidth;
                    const y = (g.coordinates.y / 100) * mapHeight;

                    // Ghost Connection (if last thread exists)
                    if (threads.length > 0) {
                        const lastCoords = this._getThreadCoords(
                            threads[threads.length - 1]
                        );
                        if (lastCoords) {
                            const lx = (lastCoords.x / 100) * mapWidth;
                            const ly = (lastCoords.y / 100) * mapHeight;
                            this.ctx.strokeStyle =
                                g.type === 'momentum' ? '#55aaff' : '#ffaa55';
                            this.ctx.setLineDash([2, 4]);
                            this.ctx.lineWidth = 1;
                            this.ctx.beginPath();
                            this.ctx.moveTo(lx, ly);
                            this.ctx.lineTo(x, y);
                            this.ctx.stroke();
                        }
                    }

                    // Ghost Node
                    const ghostPulse = 6 + Math.sin(Date.now() / 150) * 2;
                    this.ctx.fillStyle =
                        g.type === 'momentum'
                            ? 'rgba(85, 170, 255, 0.6)'
                            : 'rgba(255, 170, 85, 0.6)';
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, ghostPulse, 0, Math.PI * 2);
                    this.ctx.fill();

                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = '10px Courier New';
                    this.ctx.fillText(`? ${g.intention}`, x + 10, y);
                }
            });
        } else {
            this.ctx.fillStyle = '#445544';
            this.ctx.font = 'italic 16px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('NO SIGNAL', mapWidth / 2, mapHeight / 2);
        }

        this.ctx.restore();

        // If animated elements exist (active node, ghosts, or threats), continue loop
        if (
            this.activeNodeIndex !== -1 ||
            (this.ghosts && this.ghosts.length > 0) ||
            (this.threatZones && this.threatZones.length > 0)
        ) {
            requestAnimationFrame(() =>
                this.render(
                    this.threads,
                    this.locations,
                    this.ghosts,
                    this.threatZones
                )
            );
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
        if (thread.region === 'coast') return { x: 25, y: 55 };
        if (thread.region === 'medina') return { x: 60, y: 30 };
        if (thread.region === 'sahara') return { x: 75, y: 75 };

        return { x: 50, y: 50 }; // Default center
    }

    _bindEvents() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Check collisions
            let found = -1;
            this.threads.forEach((t, i) => {
                const coords = this._getThreadCoords(t);
                if (coords) {
                    // Let's re-calculate cleanly.
                    // Map drawing area in CSS pixels:
                    const drawW = rect.width - 80; // 40px padding left/right
                    const drawH = rect.height - 80;

                    const tx = 40 + (coords.x / 100) * drawW;
                    const ty = 40 + (coords.y / 100) * drawH;

                    const d = Math.sqrt(
                        Math.pow(mouseX - tx, 2) + Math.pow(mouseY - ty, 2)
                    );
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

        this.canvas.addEventListener('click', () => {
            if (this.activeNodeIndex !== -1) {
                // Open thread details?
                // For now just log, or trigger same event as Tapestry
                // Trigger custom event for the app to listen to
                const event = new CustomEvent('map-thread-click', {
                    detail: { index: this.activeNodeIndex }
                });
                this.canvas.dispatchEvent(event);
            }
        });
    }
}

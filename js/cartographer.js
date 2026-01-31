import { HeatmapEngine } from './heatmap.js';

export class MapRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.dpr = window.devicePixelRatio || 1;
        this.threads = [];
        this.activeNodeIndex = -1;
        this.activeUnitId = null;

        // Citadel Drawing State
        this.drawMode = false;
        this.isDrawing = false;
        this.drawStart = null;
        this.currentDrawRadius = 0;

        // Initialize Heatmap Engine
        this.heatmap = new HeatmapEngine();

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

    setDrawMode(active) {
        this.drawMode = active;
        this.canvas.style.cursor = active ? 'crosshair' : 'default';
        if (!active) {
            this.isDrawing = false;
            this.drawStart = null;
        }
    }

    render(threads, locations, drafts = [], threatZones = [], vanguardUnits = [], citadelZones = []) {
        this.threads = threads;
        this.locations = locations;
        this.drafts = drafts; // Renamed from ghosts to generic drafts for Prometheus, but maintaining legacy ghost structure if needed
        this.threatZones = threatZones;
        this.vanguardUnits = vanguardUnits;
        this.citadelZones = citadelZones;

        // Update Heatmap
        this.heatmap.update(threads, locations, this.width, this.height);

        this.ctx.clearRect(0, 0, this.width, this.height);

        // Map Scale Factor to fit canvas with padding
        const padding = 40;
        const mapWidth = this.width - padding * 2;
        const mapHeight = this.height - padding * 2;

        // Draw Heatmap Layer (Background Intelligence)
        this.ctx.save();
        this.ctx.globalAlpha = 0.8; // Subtle blend
        this.ctx.drawImage(this.heatmap.canvas, 0, 0);
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

        // Plot Citadel Defense Zones
        if (this.citadelZones && this.citadelZones.length > 0) {
            this.citadelZones.forEach((zone) => {
                const x = (zone.x / 100) * mapWidth;
                const y = (zone.y / 100) * mapHeight;
                // Zone r is in map units (0-100). Convert to pixels.
                // Assuming map is roughly square for radius calculation, use width ratio
                const r = (zone.r / 100) * mapWidth;

                this.ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
                this.ctx.beginPath();
                this.ctx.arc(x, y, r, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.strokeStyle = '#00ffff';
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.arc(x, y, r, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);

                // Label
                this.ctx.fillStyle = '#00ffff';
                this.ctx.font = '10px Courier New';
                this.ctx.fillText(zone.id, x, y - r - 5);
            });
        }

        // Plot Active Drawing (Ghost Zone)
        if (this.isDrawing && this.drawStart) {
             const x = (this.drawStart.x / 100) * mapWidth;
             const y = (this.drawStart.y / 100) * mapHeight;
             const r = (this.currentDrawRadius / 100) * mapWidth;

             this.ctx.strokeStyle = '#ffffff';
             this.ctx.lineWidth = 1;
             this.ctx.setLineDash([2, 2]);
             this.ctx.beginPath();
             this.ctx.arc(x, y, r, 0, Math.PI * 2);
             this.ctx.stroke();
             this.ctx.setLineDash([]);
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

        // Plot Vanguard Units (Tactical Drones)
        if (this.vanguardUnits && this.vanguardUnits.length > 0) {
            this.vanguardUnits.forEach((unit) => {
                const x = (unit.x / 100) * mapWidth;
                const y = (unit.y / 100) * mapHeight;

                this.ctx.save();
                this.ctx.translate(x, y);
                this.ctx.rotate(unit.heading);

                // Draw FOV Cone
                this.ctx.fillStyle = unit.type === 'INTERCEPTOR'
                    ? 'rgba(255, 165, 0, 0.1)'
                    : 'rgba(0, 255, 255, 0.1)';
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.arc(0, 0, 40, -Math.PI / 4, Math.PI / 4);
                this.ctx.fill();

                // Draw Unit (Triangle)
                this.ctx.fillStyle = unit.type === 'INTERCEPTOR' ? '#ffaa00' : '#00ffff';
                this.ctx.beginPath();
                this.ctx.moveTo(6, 0);
                this.ctx.lineTo(-4, 4);
                this.ctx.lineTo(-4, -4);
                this.ctx.closePath();
                this.ctx.fill();

                // Draw Scan Pulse if scanning
                if (unit.status === 'SCANNING') {
                    this.ctx.strokeStyle = unit.type === 'INTERCEPTOR' ? '#ffaa00' : '#00ffff';
                    this.ctx.globalAlpha = Math.max(0, 1 - (unit.scanPulse % 1));
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, unit.scanPulse * 10, 0, Math.PI * 2);
                    this.ctx.stroke();
                }

                this.ctx.restore();

                // Draw Label
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '9px Courier New';
                this.ctx.fillText(unit.id, x + 8, y);

                // Draw Selection Ring
                if (unit.id === this.activeUnitId) {
                    this.ctx.strokeStyle = '#00ff00';
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, 15, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
            });
        }

        // Plot Threads and Ghosts
        if (threads.length > 0 || drafts.length > 0) {
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

            // Draw Drafts (Prometheus Intelligence)
            this.drafts.forEach((g) => {
                if (g.coordinates) {
                    const x = (g.coordinates.x / 100) * mapWidth;
                    const y = (g.coordinates.y / 100) * mapHeight;

                    // Only draw connection if it's a "momentum" ghost (legacy)
                    // Prometheus drafts are standalone signals usually.
                    if (g.isDraft) {
                        // Prometheus Draft Visuals
                        const pulse = 8 + Math.sin(Date.now() / 200) * 4;
                        this.ctx.strokeStyle = '#00ffff'; // Cyan
                        this.ctx.lineWidth = 2;
                        this.ctx.beginPath();
                        this.ctx.arc(x, y, pulse, 0, Math.PI * 2);
                        this.ctx.stroke();

                        this.ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
                        this.ctx.beginPath();
                        this.ctx.arc(x, y, pulse, 0, Math.PI * 2);
                        this.ctx.fill();

                        this.ctx.fillStyle = '#ffffff';
                        this.ctx.font = '10px Courier New';
                        this.ctx.fillText(`PROMETHEUS SIGNAL`, x + 12, y);
                    } else {
                        // Legacy Ghosts (Horizon projections)
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
                }
            });
        } else {
            this.ctx.fillStyle = '#445544';
            this.ctx.font = 'italic 16px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('NO SIGNAL', mapWidth / 2, mapHeight / 2);
        }

        this.ctx.restore();

        // If animated elements exist (active node, drafts, or threats), continue loop
        if (
            this.activeNodeIndex !== -1 ||
            (this.drafts && this.drafts.length > 0) ||
            (this.threatZones && this.threatZones.length > 0) ||
            (this.vanguardUnits && this.vanguardUnits.length > 0) ||
            this.isDrawing
        ) {
            requestAnimationFrame(() =>
                this.render(
                    this.threads,
                    this.locations,
                    this.drafts,
                    this.threatZones,
                    this.vanguardUnits,
                    this.citadelZones
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
        // --- CITADEL DRAWING EVENTS ---
        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.drawMode) return;
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const drawW = rect.width - 80;
            const drawH = rect.height - 80;

            const mapX = ((mouseX - 40) / drawW) * 100;
            const mapY = ((mouseY - 40) / drawH) * 100;

            if (mapX >= 0 && mapX <= 100 && mapY >= 0 && mapY <= 100) {
                this.isDrawing = true;
                this.drawStart = { x: mapX, y: mapY };
                this.currentDrawRadius = 0;
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (this.isDrawing && this.drawStart) {
                this.isDrawing = false;
                // Dispatch creation event
                const event = new CustomEvent('citadel-zone-created', {
                    detail: {
                        x: this.drawStart.x,
                        y: this.drawStart.y,
                        r: this.currentDrawRadius
                    }
                });
                this.canvas.dispatchEvent(event);
                this.drawStart = null;
                this.currentDrawRadius = 0;
            }
        });
        // ------------------------------

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const drawW = rect.width - 80;
            const drawH = rect.height - 80;

            if (this.isDrawing && this.drawStart) {
                // Update radius
                const mapX = ((mouseX - 40) / drawW) * 100;
                const mapY = ((mouseY - 40) / drawH) * 100;
                const dx = mapX - this.drawStart.x;
                const dy = mapY - this.drawStart.y;
                this.currentDrawRadius = Math.sqrt(dx*dx + dy*dy);
                // Trigger render loop for animation
                this.render(this.threads, this.locations, this.ghosts, this.threatZones, this.vanguardUnits, this.citadelZones);
                return;
            }

            // Check Thread Collisions
            let foundThread = -1;
            this.threads.forEach((t, i) => {
                const coords = this._getThreadCoords(t);
                if (coords) {
                    const tx = 40 + (coords.x / 100) * drawW;
                    const ty = 40 + (coords.y / 100) * drawH;
                    if (Math.hypot(mouseX - tx, mouseY - ty) < 15) {
                        foundThread = i;
                    }
                }
            });

            // Check Unit Collisions
            let foundUnit = null;
            if (this.vanguardUnits) {
                this.vanguardUnits.forEach(u => {
                    const ux = 40 + (u.x / 100) * drawW;
                    const uy = 40 + (u.y / 100) * drawH;
                    if (Math.hypot(mouseX - ux, mouseY - uy) < 15) {
                        foundUnit = u.id;
                    }
                });
            }

            // Check Draft Collisions
            let foundDraft = null;
            if (this.drafts) {
                this.drafts.forEach(d => {
                     if (d.coordinates) {
                         const dx = 40 + (d.coordinates.x / 100) * drawW;
                         const dy = 40 + (d.coordinates.y / 100) * drawH;
                         if (Math.hypot(mouseX - dx, mouseY - dy) < 15) {
                             foundDraft = d;
                         }
                     }
                });
            }

            if (this.activeNodeIndex !== foundThread) {
                this.activeNodeIndex = foundThread;
                this.render(this.threads, this.locations, this.drafts, this.threatZones, this.vanguardUnits, this.citadelZones);
            }

            if (!this.drawMode) {
                this.canvas.style.cursor = (foundThread !== -1 || foundUnit !== null || foundDraft !== null) ? 'pointer' : 'default';
            }
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.drawMode) return; // Prevent clicking while drawing mode is active

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const drawW = rect.width - 80;
            const drawH = rect.height - 80;

            // Unit Selection Logic
            let clickedUnit = null;
            if (this.vanguardUnits) {
                this.vanguardUnits.forEach(u => {
                    const ux = 40 + (u.x / 100) * drawW;
                    const uy = 40 + (u.y / 100) * drawH;
                    if (Math.hypot(mouseX - ux, mouseY - uy) < 15) {
                        clickedUnit = u.id;
                    }
                });
            }

            if (clickedUnit) {
                this.activeUnitId = clickedUnit;
                this.render(this.threads, this.locations, this.drafts, this.threatZones, this.vanguardUnits, this.citadelZones);
                return;
            }

            // Check Draft Click
            let clickedDraft = null;
            if (this.drafts) {
                this.drafts.forEach(d => {
                     if (d.coordinates) {
                         const dx = 40 + (d.coordinates.x / 100) * drawW;
                         const dy = 40 + (d.coordinates.y / 100) * drawH;
                         if (Math.hypot(mouseX - dx, mouseY - dy) < 15) {
                             clickedDraft = d;
                         }
                     }
                });
            }

            if (clickedDraft) {
                 const event = new CustomEvent('draft-selected', { detail: clickedDraft });
                 this.canvas.dispatchEvent(event);
                 return;
            }

            // Deselect if clicking empty space (unless strictly clicking a thread)
            if (!clickedUnit && this.activeNodeIndex === -1) {
                this.activeUnitId = null;
                this.render(this.threads, this.locations, this.drafts, this.threatZones, this.vanguardUnits, this.citadelZones);
            }

            if (this.activeNodeIndex !== -1) {
                const event = new CustomEvent('map-thread-click', {
                    detail: { index: this.activeNodeIndex }
                });
                this.canvas.dispatchEvent(event);
            }
        });

        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (!this.activeUnitId) return;

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const drawW = rect.width - 80;
            const drawH = rect.height - 80;

            // Convert back to Map Coords (0-100)
            const mapX = ((mouseX - 40) / drawW) * 100;
            const mapY = ((mouseY - 40) / drawH) * 100;

            if (mapX >= 0 && mapX <= 100 && mapY >= 0 && mapY <= 100) {
                const event = new CustomEvent('vanguard-command', {
                    detail: {
                        unitId: this.activeUnitId,
                        target: { x: mapX, y: mapY }
                    }
                });
                this.canvas.dispatchEvent(event);
            }
        });
    }
}

/**
 * Project SYNAPSE // Visual Intelligence Grid
 *
 * Force-directed graph renderer for the HTML5 Canvas.
 * Visualizes the relationships identified by CortexEngine.
 */

export class SpatialHash {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    getKey(x, y) {
        return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
    }

    insert(node) {
        const key = this.getKey(node.x, node.y);
        if (!this.cells.has(key)) {
            this.cells.set(key, []);
        }
        this.cells.get(key).push(node);
    }

    query(x, y) {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        let neighbors = [];

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = `${cx + dx},${cy + dy}`;
                if (this.cells.has(key)) {
                    // Optimization: push individual elements to avoid creating new arrays with concat
                    const cellNodes = this.cells.get(key);
                    for (let i = 0; i < cellNodes.length; i++) {
                        neighbors.push(cellNodes[i]);
                    }
                }
            }
        }
        return neighbors;
    }

    clear() {
        this.cells.clear();
    }
}

export class SynapseRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.dpr = window.devicePixelRatio || 1;

        this.nodes = [];
        this.edges = [];
        this.width = 0;
        this.height = 0;

        // View State (CSS Pixels)
        this.view = {
            x: 0,
            y: 0,
            scale: 1.0
        };

        // Interaction State
        this.draggedNode = null;
        this.hoveredNode = null;
        this.isSimulating = false;
        this.isPanning = false;

        // Optimization: Spatial Hash
        // Cell size based on repulsion range (sqrt(100000) approx 316)
        this.spatialHash = new SpatialHash(320);

        this._resize();
    }

    resize() {
        this._resize();
    }

    _resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        // We handle transform manually in render
    }

    handleZoom(delta, clientX, clientY) {
        const zoomSpeed = 0.1;
        const factor = delta < 0 ? (1 + zoomSpeed) : (1 - zoomSpeed);

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        // Convert mouse to world space
        const worldX = (mouseX - this.view.x) / this.view.scale;
        const worldY = (mouseY - this.view.y) / this.view.scale;

        // Apply zoom
        let newScale = this.view.scale * factor;
        if (newScale < 0.1) newScale = 0.1;
        if (newScale > 5.0) newScale = 5.0;

        // Adjust pos to keep world point under mouse
        this.view.x = mouseX - worldX * newScale;
        this.view.y = mouseY - worldY * newScale;
        this.view.scale = newScale;
    }

    handlePan(dx, dy) {
        this.view.x += dx;
        this.view.y += dy;
    }

    /**
     * Renders the graph.
     * @param {Object} graph - { nodes, edges } from CortexEngine
     */
    render(graph) {
        if (graph) {
            this._syncGraph(graph);
        }

        // Clear entire canvas (using identity transform)
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply View Transform
        // We scale everything by DPR * view.scale
        // Translate by view.x * DPR
        this.ctx.setTransform(
            this.dpr * this.view.scale, 0,
            0, this.dpr * this.view.scale,
            this.view.x * this.dpr, this.view.y * this.dpr
        );

        // Background grid (Infinite)
        this._drawGrid();

        if (this.isSimulating) {
            this._simulatePhysics();
        }

        // Draw Edges
        this.ctx.lineWidth = 1 / this.view.scale; // Keep constant visual width
        this.edges.forEach(edge => {
            const source = this.nodes[edge.sourceIndex];
            const target = this.nodes[edge.targetIndex];
            if (!source || !target) return;

            const opacity = Math.min(1, edge.weight * 0.4);

            this.ctx.beginPath();
            if (edge.types.includes('semantic')) {
                // Amber Pulse
                const pulse = 0.5 + Math.sin(Date.now() / 200) * 0.5;
                this.ctx.strokeStyle = `rgba(198, 118, 5, ${opacity * 0.8 + pulse * 0.2})`;
                this.ctx.lineWidth = (2 / this.view.scale);
            } else if (edge.types.includes('region')) {
                this.ctx.strokeStyle = `rgba(100, 200, 255, ${opacity})`;
                this.ctx.lineWidth = (1 / this.view.scale);
            } else if (edge.types.includes('time')) {
                this.ctx.strokeStyle = `rgba(255, 200, 100, ${opacity})`;
                this.ctx.lineWidth = (1 / this.view.scale);
            } else {
                this.ctx.strokeStyle = `rgba(200, 200, 200, ${opacity})`;
                this.ctx.lineWidth = (0.5 / this.view.scale);
            }

            this.ctx.moveTo(source.x, source.y);
            this.ctx.lineTo(target.x, target.y);
            this.ctx.stroke();
        });

        // Draw Nodes
        this.nodes.forEach(node => {
            const isHover = this.hoveredNode === node;
            const isDrag = this.draggedNode === node;

            // Intention Colors
            const colors = {
                serenity: '#4a7c82',
                vibrancy: '#c67605',
                awe: '#b85b47',
                legacy: '#5d4037',
                unknown: '#888'
            };
            const color = colors[node.data.intention] || '#888';

            this.ctx.fillStyle = color;
            this.ctx.beginPath();

            if (node.isBridge) {
                // Diamond shape for bridges
                const s = isHover ? 10 : 7;
                this.ctx.moveTo(node.x, node.y - s);
                this.ctx.lineTo(node.x + s, node.y);
                this.ctx.lineTo(node.x, node.y + s);
                this.ctx.lineTo(node.x - s, node.y);
                this.ctx.closePath();
            } else {
                // Circle for standard nodes
                this.ctx.arc(node.x, node.y, isHover ? 8 : 5, 0, Math.PI * 2);
            }
            this.ctx.fill();

            // Bridge Highlight Ring
            if (node.isBridge) {
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 1 / this.view.scale;
                this.ctx.stroke();
            }

            // Glow/Border
            if (isHover || isDrag) {
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 2 / this.view.scale;
                this.ctx.stroke();
            }
        });

        // Tooltip (Draw in Screen Space)
        if (this.hoveredNode) {
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); // Reset transform
            this._drawTooltip(this.hoveredNode);
        }
    }

    _syncGraph(graph) {
        // Map existing positions to new nodes
        const nodeMap = new Map();
        this.nodes.forEach(n => nodeMap.set(n.id, {x: n.x, y: n.y, vx: n.vx, vy: n.vy}));

        this.nodes = graph.nodes.map(n => {
            const existing = nodeMap.get(n.id);
            if (existing) {
                n.x = existing.x;
                n.y = existing.y;
                n.vx = existing.vx;
                n.vy = existing.vy;
            } else {
                // Spawn in center of world view or random
                n.x = (this.width/2 - this.view.x)/this.view.scale + (Math.random() - 0.5) * 50;
                n.y = (this.height/2 - this.view.y)/this.view.scale + (Math.random() - 0.5) * 50;
            }
            return n;
        });
        this.edges = graph.edges;
        this.isSimulating = true;
    }

    _simulatePhysics() {
        const k = 0.05; // Attraction
        const repulsion = 2000;
        const damping = 0.85;
        // Gravity to center of current view? Or global 0,0?
        // Let's use gravity to the centroid of the cluster to keep it together.
        // For now, gravity to (width/2, height/2) in world space (unscaled) matches initial spawn.
        const cx = this.width / 2; // Roughly center
        const cy = this.height / 2;
        const centerForce = 0.002;

        // OPTIMIZATION: Populate Spatial Hash
        this.spatialHash.clear();
        for (let i = 0; i < this.nodes.length; i++) {
            this.spatialHash.insert(this.nodes[i]);
            // Reset forces
            this.nodes[i].fx = 0;
            this.nodes[i].fy = 0;
        }

        // Repulsion (Optimized)
        for (let i = 0; i < this.nodes.length; i++) {
            const a = this.nodes[i];

            // Query neighbors
            const neighbors = this.spatialHash.query(a.x, a.y);

            for (let j = 0; j < neighbors.length; j++) {
                const b = neighbors[j];
                if (a === b) continue; // Skip self

                const dx = a.x - b.x;
                const dy = a.y - b.y;
                let distSq = dx * dx + dy * dy;
                if (distSq < 0.1) distSq = 0.1;

                // Although SpatialHash limits candidates, we still check range
                if (distSq > 100000) continue;

                const f = repulsion / distSq;
                const fx = (dx / Math.sqrt(distSq)) * f;
                const fy = (dy / Math.sqrt(distSq)) * f;

                a.fx += fx;
                a.fy += fy;
            }
        }

        // Attraction
        this.edges.forEach(edge => {
            const s = this.nodes[edge.sourceIndex];
            const t = this.nodes[edge.targetIndex];
            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            // Hooke's Law
            const f = dist * k * edge.weight;
            const fx = (dx / dist) * f;
            const fy = (dy / dist) * f;

            s.fx += fx;
            s.fy += fy;
            t.fx -= fx;
            t.fy -= fy;
        });

        // Integration
        this.nodes.forEach(node => {
            if (node === this.draggedNode) return;

            // Gravity to center
            node.fx += (cx - node.x) * centerForce;
            node.fy += (cy - node.y) * centerForce;

            node.vx = (node.vx + node.fx) * damping;
            node.vy = (node.vy + node.fy) * damping;

            node.x += node.vx;
            node.y += node.vy;
        });
    }

    _drawGrid() {
        // We need to draw grid lines in world space
        // Visible world bounds
        const startX = -this.view.x / this.view.scale;
        const startY = -this.view.y / this.view.scale;
        const endX = (this.width - this.view.x) / this.view.scale;
        const endY = (this.height - this.view.y) / this.view.scale;

        const gridSize = 100;

        this.ctx.strokeStyle = '#222';
        this.ctx.lineWidth = 1 / this.view.scale;
        this.ctx.beginPath();

        // Snap to grid
        const firstLineX = Math.floor(startX / gridSize) * gridSize;
        const firstLineY = Math.floor(startY / gridSize) * gridSize;

        for (let x = firstLineX; x < endX; x += gridSize) {
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
        }
        for (let y = firstLineY; y < endY; y += gridSize) {
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
        }
        this.ctx.stroke();
    }

    _drawTooltip(node) {
        // Project node to screen space
        const screenX = node.x * this.view.scale + this.view.x;
        const screenY = node.y * this.view.scale + this.view.y;

        const text = node.data.title;
        const sub = `${node.data.region} // ${node.data.time}`;
        const meta = node.isBridge ? ' [BRIDGE]' : '';

        const x = screenX;
        const y = screenY - 15;

        this.ctx.font = '12px Inter';
        const w = Math.max(this.ctx.measureText(text + meta).width, this.ctx.measureText(sub).width) + 10;

        this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
        this.ctx.fillRect(x - w/2, y - 35, w, 30);
        this.ctx.strokeStyle = node.isBridge ? '#c67605' : '#55aaff';
        this.ctx.strokeRect(x - w/2, y - 35, w, 30);

        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text + meta, x, y - 20);
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '10px Inter';
        this.ctx.fillText(sub, x, y - 8);
    }

    // --- Interaction ---

    handleInput(type, clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        // Convert to World
        const worldX = (mouseX - this.view.x) / this.view.scale;
        const worldY = (mouseY - this.view.y) / this.view.scale;

        if (type === 'move') {
            if (this.draggedNode) {
                this.draggedNode.x = worldX;
                this.draggedNode.y = worldY;
                this.isSimulating = true;
            } else if (this.isPanning) {
                // Panning handled via delta in App, but if we wanted absolute tracking...
                // Handled in handlePan via movementX/Y
            } else {
                this.hoveredNode = this._findNode(worldX, worldY);
            }
        } else if (type === 'down') {
            const node = this._findNode(worldX, worldY);
            if (node) {
                this.draggedNode = node;
                this.draggedNode.vx = 0;
                this.draggedNode.vy = 0;
            } else {
                this.isPanning = true;
            }
        } else if (type === 'up') {
            this.draggedNode = null;
            this.isPanning = false;
        }
    }

    _findNode(x, y) {
        // Hit test radius in world space
        // Constant radius 10
        const rSq = 100; // 10^2
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const n = this.nodes[i];
            const dx = x - n.x;
            const dy = y - n.y;
            if (dx*dx + dy*dy < rSq) {
                return n;
            }
        }
        return null;
    }
}

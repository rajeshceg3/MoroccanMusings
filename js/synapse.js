/**
 * Project SYNAPSE // Visual Intelligence Grid
 *
 * Force-directed graph renderer for the HTML5 Canvas.
 * Visualizes the relationships identified by CortexEngine.
 */
export class SynapseRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.dpr = window.devicePixelRatio || 1;

        this.nodes = [];
        this.edges = [];
        this.width = 0;
        this.height = 0;

        // Interaction State
        this.draggedNode = null;
        this.hoveredNode = null;
        this.isSimulating = false;

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
        this.ctx.scale(this.dpr, this.dpr);
    }

    /**
     * Renders the graph.
     * @param {Object} graph - { nodes, edges } from CortexEngine
     */
    render(graph) {
        if (!graph) return;

        // Initialize positions if new graph
        // (Simple check: if node counts match, we assume it's the same graph frame-to-frame mostly)
        // But if IDs change, we reset.
        // For this MVP, we re-ingest if passed, but preserve positions if IDs match.
        this._syncGraph(graph);

        this.ctx.clearRect(0, 0, this.width, this.height);

        // Background grid
        this._drawGrid();

        // Run one step of simulation
        if (this.isSimulating) {
            this._simulatePhysics();
        }

        // Draw Edges
        this.ctx.lineWidth = 1;
        this.edges.forEach(edge => {
            const source = this.nodes[edge.sourceIndex];
            const target = this.nodes[edge.targetIndex];
            if (!source || !target) return;

            const opacity = Math.min(1, edge.weight * 0.4);

            // Color based on type
            if (edge.types.includes('region')) this.ctx.strokeStyle = `rgba(100, 200, 255, ${opacity})`;
            else if (edge.types.includes('time')) this.ctx.strokeStyle = `rgba(255, 200, 100, ${opacity})`;
            else this.ctx.strokeStyle = `rgba(200, 200, 200, ${opacity})`;

            this.ctx.beginPath();
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

            // Draw Node
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, isHover ? 8 : 5, 0, Math.PI * 2);
            this.ctx.fillStyle = color;
            this.ctx.fill();

            // Glow/Border
            if (isHover || isDrag) {
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();

                // Tooltip
                this._drawTooltip(node);
            }
        });

        // Loop if simulating
        if (this.isSimulating && this._energy() > 0.5) {
            // Keep loop active via requestAnimationFrame in parent or internal?
            // Since this is called by App's render loop (Horizon loop usually),
            // we rely on the parent calling render() repeatedly.
            // If parent isn't looping, we force it?
            // For now, we assume App calls render() on RAF.
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
                // Spawn in center
                n.x = this.width/2 + (Math.random() - 0.5) * 50;
                n.y = this.height/2 + (Math.random() - 0.5) * 50;
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
        const centerForce = 0.002;

        const cx = this.width / 2;
        const cy = this.height / 2;

        // Reset forces
        this.nodes.forEach(node => {
            node.fx = 0;
            node.fy = 0;
        });

        // Repulsion (All pairs - O(N^2) but N is small < 1000)
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const a = this.nodes[i];
                const b = this.nodes[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                let distSq = dx * dx + dy * dy;
                if (distSq < 0.1) distSq = 0.1;

                const f = repulsion / distSq;
                const fx = (dx / Math.sqrt(distSq)) * f;
                const fy = (dy / Math.sqrt(distSq)) * f;

                a.fx += fx;
                a.fy += fy;
                b.fx -= fx;
                b.fy -= fy;
            }
        }

        // Attraction (Edges)
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

        // Center Gravity & Integration
        this.nodes.forEach(node => {
            // Dragged node doesn't move by physics
            if (node === this.draggedNode) return;

            // Gravity to center
            node.fx += (cx - node.x) * centerForce;
            node.fy += (cy - node.y) * centerForce;

            // Update Velocity
            node.vx = (node.vx + node.fx) * damping;
            node.vy = (node.vy + node.fy) * damping;

            // Update Position
            node.x += node.vx;
            node.y += node.vy;

            // Boundary
            if (node.x < 10) node.x = 10;
            if (node.x > this.width - 10) node.x = this.width - 10;
            if (node.y < 10) node.y = 10;
            if (node.y > this.height - 10) node.y = this.height - 10;
        });
    }

    _energy() {
        let e = 0;
        this.nodes.forEach(n => e += Math.abs(n.vx) + Math.abs(n.vy));
        return e;
    }

    _drawGrid() {
        this.ctx.strokeStyle = '#222';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let x = 0; x < this.width; x += 50) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
        }
        for (let y = 0; y < this.height; y += 50) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
        }
        this.ctx.stroke();
    }

    _drawTooltip(node) {
        const text = node.data.title;
        const sub = `${node.data.region} // ${node.data.time}`;
        const x = node.x;
        const y = node.y - 15;

        this.ctx.font = '12px Inter';
        const w = Math.max(this.ctx.measureText(text).width, this.ctx.measureText(sub).width) + 10;

        this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
        this.ctx.fillRect(x - w/2, y - 35, w, 30);
        this.ctx.strokeStyle = '#55aaff';
        this.ctx.strokeRect(x - w/2, y - 35, w, 30);

        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, x, y - 20);
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '10px Inter';
        this.ctx.fillText(sub, x, y - 8);
    }

    // --- Interaction ---

    handleInput(type, x, y) {
        // Adjust for canvas scaling
        const rect = this.canvas.getBoundingClientRect();
        const cx = x - rect.left;
        const cy = y - rect.top;

        if (type === 'move') {
            if (this.draggedNode) {
                this.draggedNode.x = cx;
                this.draggedNode.y = cy;
                this.isSimulating = true; // Wake up
            } else {
                this.hoveredNode = this._findNode(cx, cy);
            }
        } else if (type === 'down') {
            this.draggedNode = this._findNode(cx, cy);
            if (this.draggedNode) {
                this.draggedNode.vx = 0;
                this.draggedNode.vy = 0;
            }
        } else if (type === 'up') {
            this.draggedNode = null;
        }
    }

    _findNode(x, y) {
        // Simple radius check
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const n = this.nodes[i];
            const dx = x - n.x;
            const dy = y - n.y;
            if (dx*dx + dy*dy < 100) { // Radius 10
                return n;
            }
        }
        return null;
    }
}

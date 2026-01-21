/**
 * Project CORTEX // Neural Association Engine
 *
 * Analysis engine that transforms linear thread data into a relational graph structure.
 * Identifies semantic and temporal connections between tactical threads.
 */
export class CortexEngine {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Analyzes the ledger and builds a relational graph.
     * @param {Array} threads - The list of threads from TapestryLedger
     * @returns {Object} { nodes, edges, clusters }
     */
    analyze(threads) {
        if (!threads || threads.length === 0) {
            return { nodes: [], edges: [], clusters: [] };
        }

        const nodes = threads.map((t, i) => ({
            id: t.id || t.hash.substring(0, 12),
            index: i,
            data: t,
            // Physics state
            x: Math.random() * 100, // Initial random position
            y: Math.random() * 100,
            vx: 0,
            vy: 0
        }));

        const edges = [];
        const thresholdTime = 60 * 60 * 1000; // 1 Hour

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i];
                const b = nodes[j];
                let weight = 0;
                let types = [];

                // 1. Spatial Correlation (Region)
                if (a.data.region === b.data.region && a.data.region !== 'unknown') {
                    weight += 1.0;
                    types.push('region');
                }

                // 2. Intentional Correlation
                if (a.data.intention === b.data.intention) {
                    weight += 0.5;
                    types.push('intention');
                }

                // 3. Temporal Correlation
                const timeDiff = Math.abs(a.data.timestamp - b.data.timestamp);
                if (timeDiff < thresholdTime) {
                    weight += 0.8;
                    types.push('time');
                }

                // 4. Semantic Linking (Title/Narrative tags - simplified)
                // Note: We don't have narrative in basic thread list unless loaded,
                // but we check titles for common words if needed.
                // Keeping it lightweight for now.

                if (weight > 0) {
                    edges.push({
                        source: a.id,
                        target: b.id,
                        sourceIndex: i,
                        targetIndex: j,
                        weight: weight,
                        types: types
                    });
                }
            }
        }

        const clusters = this._findClusters(nodes, edges);

        return { nodes, edges, clusters };
    }

    _findClusters(nodes, edges) {
        const visited = new Set();
        const clusters = [];

        // Build adjacency list for traversal
        const adj = new Map();
        nodes.forEach(n => adj.set(n.id, []));
        edges.forEach(e => {
            adj.get(e.source).push(e.target);
            adj.get(e.target).push(e.source);
        });

        nodes.forEach(node => {
            if (!visited.has(node.id)) {
                const cluster = [];
                const queue = [node.id];
                visited.add(node.id);

                while (queue.length > 0) {
                    const currentId = queue.shift();
                    cluster.push(currentId);

                    const neighbors = adj.get(currentId) || [];
                    neighbors.forEach(neighborId => {
                        if (!visited.has(neighborId)) {
                            visited.add(neighborId);
                            queue.push(neighborId);
                        }
                    });
                }

                if (cluster.length > 1) {
                    clusters.push(cluster);
                }
            }
        });

        return clusters.sort((a, b) => b.length - a.length);
    }
}

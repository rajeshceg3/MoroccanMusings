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
     * @param {Object} mnemosyne - Optional Mnemosyne instance for semantic analysis
     * @returns {Object} { nodes, edges, clusters }
     */
    analyze(threads, mnemosyne = null) {
        if (!threads || threads.length === 0) {
            return { nodes: [], edges: [], clusters: [] };
        }

        const nodes = threads.map((t, i) => ({
            id: t.id || t.hash.substring(0, 12),
            index: i,
            data: t,
            clusterId: -1,
            isBridge: false,
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

                // 4. Semantic Linking (Mnemosyne)
                if (mnemosyne) {
                    const sim = mnemosyne.getCosineSimilarity(a.id, b.id);
                    if (sim > 0.25) { // Threshold
                         weight += sim * 3.0; // High importance
                         types.push('semantic');
                    }
                }

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
        this._assignClusters(nodes, clusters);
        this._findBridges(nodes, edges);

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

                if (cluster.length > 0) { // Include singletons as clusters of 1
                    clusters.push(cluster);
                }
            }
        });

        return clusters.sort((a, b) => b.length - a.length);
    }

    _assignClusters(nodes, clusters) {
        const clusterMap = new Map();
        clusters.forEach((cluster, idx) => {
            cluster.forEach(id => clusterMap.set(id, idx));
        });
        nodes.forEach(node => {
            if (clusterMap.has(node.id)) {
                node.clusterId = clusterMap.get(node.id);
            }
        });
    }

    _findBridges(nodes, edges) {
        // A Bridge node connects at least two different Intentions
        // Build adjacency with metadata
        const adj = new Map();
        nodes.forEach(n => adj.set(n.id, { intention: n.data.intention, neighbors: [] }));

        edges.forEach(e => {
             // edges stores IDs
             adj.get(e.source).neighbors.push(adj.get(e.target).intention);
             adj.get(e.target).neighbors.push(adj.get(e.source).intention);
        });

        nodes.forEach(node => {
            const entry = adj.get(node.id);
            const myIntention = entry.intention;
            const neighborIntentions = new Set(entry.neighbors);

            // If neighbors include an intention different from mine
            // And I have at least 2 neighbors?
            if (entry.neighbors.length > 1) {
                neighborIntentions.delete(myIntention);
                if (neighborIntentions.size > 0) {
                    node.isBridge = true;
                }
            }
        });
    }
}

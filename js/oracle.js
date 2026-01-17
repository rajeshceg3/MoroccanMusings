// The Oracle Interface: Strategic Operations & Geospatial Integration
// Bridges the Horizon Engine (Forecast) and Cartographer (Map) to provide actionable intelligence.

export class OracleEngine {
    constructor(horizon, mapRenderer, locations) {
        this.horizon = horizon;
        this.mapRenderer = mapRenderer;
        this.locations = locations;
        this.activeMode = false;

        // Base coordinates for Intentions (Fallbacks)
        this.baseCoordinates = {
            serenity: { x: 25, y: 55, region: 'coast' }, // Essaouira
            vibrancy: { x: 60, y: 30, region: 'medina' }, // Fes
            awe: { x: 75, y: 75, region: 'sahara' }, // Merzouga
            legacy: { x: 45, y: 15, region: 'atlas' } // Middle Atlas/North
        };
    }

    // Toggles the Strategic Map View
    toggle() {
        this.activeMode = !this.activeMode;
        return this.activeMode;
    }

    // Generates actionable strategic options based on Horizon projections
    generateStrategicMap(threads) {
        const projections = this.horizon.project(threads);

        // Augment ghosts with geospatial data
        const strategicGhosts = projections.map((ghost) => {
            const locationData = this._resolveLocation(
                ghost.intention,
                ghost.time
            );

            return {
                ...ghost,
                coordinates: locationData.coordinates,
                region: locationData.region,
                locationTitle: locationData.title || 'Unknown Sector',
                strategicValue: ghost.type === 'balance' ? 'High' : 'Normal'
            };
        });

        return strategicGhosts;
    }

    // Resolves a specific location key or falls back to a base of operations
    _resolveLocation(intention, time) {
        // 1. Try to find exact match in known data
        // Keys are intention.region.time
        for (const [key, data] of Object.entries(this.locations)) {
            const parts = key.split('.');
            if (parts[0] === intention && parts[2] === time) {
                return {
                    coordinates: data.coordinates,
                    region: parts[1],
                    title: data.title
                };
            }
        }

        // 2. Fallback: Base of Operations
        const base = this.baseCoordinates[intention] || {
            x: 50,
            y: 50,
            region: 'unknown'
        };
        return {
            coordinates: { x: base.x, y: base.y },
            region: base.region,
            title: `${intention.charAt(0).toUpperCase() + intention.slice(1)} Outpost`
        };
    }

    // Renders the strategic view
    render(threads) {
        if (!this.activeMode) return;

        const ghosts = this.generateStrategicMap(threads);

        // We render normal threads + ghosts
        // We instruct the map renderer to render them
        // Note: MapRenderer.render(threads, locations, ghosts) - we need to update MapRenderer signature
        this.mapRenderer.render(threads, this.locations, ghosts);
    }
}

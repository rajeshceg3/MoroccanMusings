
export class CitadelEngine {
    constructor(locations) {
        this.locations = locations || {};
        this.zones = [];
        this.storageKey = 'marq_citadel_zones';
        this.load();
    }

    load() {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
            try {
                this.zones = JSON.parse(raw);
            } catch (e) {
                console.error('Citadel: Failed to load zones', e);
                this.zones = [];
            }
        }
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.zones));
    }

    /**
     * Adds a new defense zone.
     * @param {Object} zone - { x, y, r, label }
     * @returns {Object} The created zone with ID.
     */
    addZone(zone) {
        const newZone = {
            id: `ZN-${Date.now().toString().slice(-4)}`,
            label: zone.label || 'Restricted Sector',
            x: zone.x,
            y: zone.y,
            r: zone.r || 10, // Default radius 10 map units
            created: Date.now()
        };
        this.zones.push(newZone);
        this.save();
        return newZone;
    }

    removeZone(id) {
        const idx = this.zones.findIndex(z => z.id === id);
        if (idx !== -1) {
            this.zones.splice(idx, 1);
            this.save();
            return true;
        }
        return false;
    }

    clear() {
        this.zones = [];
        this.save();
    }

    getZones() {
        return this.zones;
    }

    /**
     * Checks if a thread violates any zone.
     * @param {Object} thread - The thread object.
     * @returns {Object|null} The violated zone or null.
     */
    check(thread) {
        if (this.zones.length === 0) return null;

        const coords = this._resolveCoords(thread);
        if (!coords) return null;

        for (const zone of this.zones) {
            const dist = Math.sqrt(
                Math.pow(coords.x - zone.x, 2) +
                Math.pow(coords.y - zone.y, 2)
            );
            if (dist <= zone.r) {
                return zone;
            }
        }
        return null;
    }

    _resolveCoords(thread) {
        // 1. Try exact location key match
        const key = `${thread.intention}.${thread.region}.${thread.time}`;
        if (this.locations[key] && this.locations[key].coordinates) {
            return this.locations[key].coordinates;
        }

        // 2. Fallback to Region Centroids (matches Cartographer logic)
        const regionMap = {
            'coast': { x: 25, y: 55 },
            'medina': { x: 60, y: 30 },
            'sahara': { x: 75, y: 75 },
            'kasbah': { x: 50, y: 50 }
        };

        if (thread.region && regionMap[thread.region]) {
            return regionMap[thread.region];
        }

        return { x: 50, y: 50 }; // Default center
    }
}

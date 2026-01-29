
import { test, describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert';
import { CitadelEngine } from '../js/citadel.js';

// Mock localStorage
const localStorageMock = {
    store: {},
    getItem(key) { return this.store[key] || null; },
    setItem(key, value) { this.store[key] = value.toString(); },
    clear() { this.store = {}; }
};
global.localStorage = localStorageMock;

const mockLocations = {
    'serenity.coast.dawn': { coordinates: { x: 25, y: 55 } }
};

describe('CitadelEngine', () => {
    let citadel;

    before(() => {
        localStorageMock.clear();
        citadel = new CitadelEngine(mockLocations);
    });

    it('should initialize with empty zones', () => {
        assert.deepStrictEqual(citadel.getZones(), []);
    });

    it('should add a zone', () => {
        const zone = citadel.addZone({ x: 50, y: 50, r: 20 });
        assert.ok(zone.id);
        assert.strictEqual(zone.x, 50);
        assert.strictEqual(citadel.getZones().length, 1);
    });

    it('should persist zones', () => {
        // Simulate reload
        const citadel2 = new CitadelEngine(mockLocations);
        assert.strictEqual(citadel2.getZones().length, 1);
        assert.strictEqual(citadel2.getZones()[0].x, 50);
    });

    it('should detect thread inside zone', () => {
        // Existing zone at 50,50 r=20.
        // Default fallback for unknown region is 50,50.
        const threadDefault = { region: 'unknown', intention: 'test', time: 'test' };
        const violation = citadel.check(threadDefault);
        assert.ok(violation);
        assert.strictEqual(violation.x, 50);

        // Add specific zone at Coast (25, 55)
        citadel.addZone({ x: 25, y: 55, r: 5 });

        const threadCoast = { intention: 'serenity', region: 'coast', time: 'dawn' }; // Exact match in mockLocations
        const violation2 = citadel.check(threadCoast);
        assert.ok(violation2);
        assert.strictEqual(violation2.x, 25);
    });

    it('should ignore thread outside zone', () => {
        const threadSahara = { intention: 'awe', region: 'sahara', time: 'dusk' };
        // Sahara is 75,75 (hardcoded fallback in engine).
        // Zones are at 50,50 (r20) and 25,55 (r5).
        // Dist to 50,50 = sqrt(25^2 + 25^2) = 35.3 > 20
        // Dist to 25,55 = large
        const violation = citadel.check(threadSahara);
        assert.strictEqual(violation, null);
    });

    it('should remove a zone', () => {
        const zones = citadel.getZones();
        const id = zones[0].id;
        const result = citadel.removeZone(id);
        assert.ok(result);
        assert.strictEqual(citadel.getZones().length, 1); // We added 2, removed 1
    });
});

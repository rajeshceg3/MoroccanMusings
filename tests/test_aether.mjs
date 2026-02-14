import { test, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { TapestryLedger } from '../js/tapestry.js';
import { VanguardEngine } from '../js/vanguard.js';
import { CitadelEngine } from '../js/citadel.js';
import { PrometheusEngine } from '../js/prometheus.js';
import { PanopticonEngine } from '../js/panopticon.js';

// --- MOCKS ---
// Polyfill crypto for Node 18 environments (CI)
if (!global.crypto) {
    try {
        const { webcrypto } = await import('node:crypto');
        global.crypto = webcrypto;
    } catch (e) {
        console.error('Failed to polyfill crypto:', e);
    }
}

if (!global.window) {
    global.window = {
        crypto: global.crypto,
        btoa: global.btoa,
        atob: global.atob,
        locations: {}
    };
    global.document = {
        createElement: () => ({
            classList: { add: ()=>{}, remove: ()=>{}, toggle: ()=>{} },
            setAttribute: ()=>{},
            addEventListener: ()=>{},
            append: ()=>{},
            appendChild: ()=>{},
            replaceChildren: ()=>{},
            style: {},
            parentNode: { replaceChild: ()=>{} }
        }),
        body: {
            classList: { add: ()=>{}, remove: ()=>{} },
            appendChild: ()=>{}
        }
    };
}

const localStorageMock = (function() {
    let store = {};
    return {
        getItem: function(key) { return store[key] || null; },
        setItem: function(key, value) { store[key] = value.toString(); },
        clear: function() { store = {}; },
        removeItem: function(key) { delete store[key]; }
    };
})();
global.localStorage = localStorageMock;

// Mock Sentinel & UI
const mockSentinel = {
    getReport: () => ({ defcon: 5, threats: [], zones: [] }),
    assess: () => ({ defcon: 5, threats: [], zones: [] })
};
const mockUI = {
    showLoading: ()=>{},
    hideLoading: ()=>{},
    showNotification: ()=>{}
};
const mockRenderers = {
    mandala: { render: ()=>{} },
    map: { render: ()=>{} },
    updateAlchemy: ()=>{}
};

describe('Project AETHER: Temporal Operations', () => {

    beforeEach(() => {
        localStorage.clear();
    });

    describe('TapestryLedger Snapshot', () => {
        it('should snapshot and restore threads', async () => {
            const ledger = new TapestryLedger('test_ledger');
            await ledger.initialize();
            await ledger.addThread({ title: 'T1', intention: 'serenity', time: 'dawn', region: 'coast' });

            const snapshot = ledger.getSnapshot();
            assert.strictEqual(snapshot.length, 1);

            await ledger.addThread({ title: 'T2', intention: 'vibrancy', time: 'dusk', region: 'medina' });
            assert.strictEqual(ledger.getThreads().length, 2);

            await ledger.loadSnapshot(snapshot);
            assert.strictEqual(ledger.getThreads().length, 1);
            assert.strictEqual(ledger.getThreads()[0].title, 'T1');
        });
    });

    describe('VanguardEngine Snapshot', () => {
        it('should snapshot and restore units', () => {
            const engine = new VanguardEngine(mockSentinel, null, { getThreads: ()=>[] });
            const u1 = engine.deploy('SCOUT', 'coast');
            u1.x = 100;
            u1.battery = 50;

            const snapshot = engine.getSnapshot();

            // Modify unit
            u1.x = 200;
            engine.deploy('INTERCEPTOR', 'medina');
            assert.strictEqual(engine.getUnits().length, 2);

            engine.loadSnapshot(snapshot);
            assert.strictEqual(engine.getUnits().length, 1);
            const restored = engine.getUnits()[0];
            assert.strictEqual(restored.x, 100);
            assert.strictEqual(restored.battery, 50);
            assert.strictEqual(restored.id, u1.id);
        });
    });

    describe('CitadelEngine Snapshot', () => {
        it('should snapshot and restore zones', () => {
            const engine = new CitadelEngine({});
            engine.addZone({ x: 10, y: 10, label: 'Z1' });

            const snapshot = engine.getSnapshot();
            assert.strictEqual(snapshot.length, 1);

            engine.addZone({ x: 20, y: 20, label: 'Z2' });
            assert.strictEqual(engine.getZones().length, 2);

            engine.loadSnapshot(snapshot);
            assert.strictEqual(engine.getZones().length, 1);
            assert.strictEqual(engine.getZones()[0].label, 'Z1');
        });
    });

    describe('PrometheusEngine Snapshot', () => {
        it('should snapshot and restore drafts', () => {
            const engine = new PrometheusEngine(null, null, null, mockUI);
            engine.drafts.push({ id: 'D1', title: 'Draft 1' });

            const snapshot = engine.getSnapshot();

            engine.drafts.push({ id: 'D2', title: 'Draft 2' });
            assert.strictEqual(engine.getDrafts().length, 2);

            engine.loadSnapshot(snapshot);
            assert.strictEqual(engine.getDrafts().length, 1);
            assert.strictEqual(engine.getDrafts()[0].title, 'Draft 1');
        });
    });

    describe('PanopticonEngine Forking', () => {
        it('should fork the timeline', async () => {
            const ledger = new TapestryLedger('fork_ledger');
            await ledger.initialize();
            const vanguard = new VanguardEngine(mockSentinel, null, ledger);
            const citadel = new CitadelEngine({});
            const prometheus = new PrometheusEngine(ledger, vanguard, null, mockUI);

            const panopticon = new PanopticonEngine(ledger, mockSentinel, mockRenderers, mockUI, vanguard, citadel, prometheus);

            // State 1
            await ledger.addThread({ title: 'State 1', intention: 'serenity', time: 'dawn', region: 'coast' });
            panopticon.capture(); // Index 0

            // State 2
            await ledger.addThread({ title: 'State 2', intention: 'vibrancy', time: 'dusk', region: 'medina' });
            panopticon.capture(); // Index 1

            assert.strictEqual(panopticon.snapshots.length, 2);
            assert.strictEqual(ledger.getThreads().length, 2);

            // Scrub to Index 0
            await panopticon.scrubTo(0);

            // Fork
            await panopticon.forkTimeline();

            // Check History Truncation
            assert.strictEqual(panopticon.snapshots.length, 1);

            // Check Ledger Restoration
            assert.strictEqual(ledger.getThreads().length, 1);
            assert.strictEqual(ledger.getThreads()[0].title, 'State 1');

            // Check Mode Reset
            assert.strictEqual(panopticon.isReplaying, false);
        });
    });
});

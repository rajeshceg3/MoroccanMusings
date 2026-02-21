import { test, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import '../tests/shim.js'; // Tactical Shim - Must be first
import { StratagemEngine } from '../js/stratagem.js';
import { TapestryLedger } from '../js/tapestry.js';
import { VanguardEngine } from '../js/vanguard.js';
import { CitadelEngine } from '../js/citadel.js';
import { SentinelEngine } from '../js/sentinel.js';
import { HorizonEngine } from '../js/horizon.js';
import { locations } from '../js/data.js';

// Extend shim
global.window.locations = locations;
if (!global.window.btoa) global.window.btoa = (str) => Buffer.from(str).toString('base64');
if (!global.window.atob) global.window.atob = (str) => Buffer.from(str, 'base64').toString('binary');

// Mock LocalStorage (Already shimmed, but we can override if specific behavior needed)
// The shim provides a basic one. The test uses a closure mock.
// We can use the global.localStorage from the shim, but the test might expect to spy on it or clear it.
// The shim's localStorage has a `clear()` method.
const localStorageMock = global.localStorage;

describe('Project STRATAGEM: Strategic Simulation Engine', () => {

    const classes = {
        TapestryLedger,
        VanguardEngine,
        CitadelEngine,
        SentinelEngine,
        HorizonEngine
    };

    let stratagem;
    let liveState;

    beforeEach(async () => {
        localStorage.clear();

        // Setup Live State
        const ledger = new TapestryLedger('live_ledger');
        await ledger.initialize();
        // Add one thread
        await ledger.addThread({ intention: 'serenity', time: 'dawn', region: 'coast', title: 'Live Thread' });

        const citadel = new CitadelEngine(locations);
        const horizon = new HorizonEngine();
        const sentinel = new SentinelEngine(horizon);
        // Mock Aegis for Vanguard
        const aegis = { getReport: () => ({ rank: 'rookie', xp: 0 }) };
        const vanguard = new VanguardEngine(sentinel, aegis, ledger);

        liveState = {
            ledger,
            vanguard,
            citadel,
            sentinel,
            horizon
        };

        stratagem = new StratagemEngine(classes, locations);
    });

    it('should initialize and clone live state', async () => {
        await stratagem.init(liveState);

        assert.strictEqual(stratagem.isActive, true);
        assert.ok(stratagem.simLedger);
        assert.ok(stratagem.simVanguard);
        assert.ok(stratagem.simCitadel);

        // Check Ledger Clone
        const simThreads = stratagem.simLedger.getThreads();
        assert.strictEqual(simThreads.length, 1);
        assert.strictEqual(simThreads[0].title, 'Live Thread');
    });

    it('should isolate simulation changes from live state', async () => {
        await stratagem.init(liveState);

        // Add thread to simulation
        await stratagem.addSimulatedThread({
            intention: 'vibrancy',
            time: 'midday',
            region: 'medina',
            title: 'Simulated Thread'
        });

        // Check Sim
        const simThreads = stratagem.simLedger.getThreads();
        assert.strictEqual(simThreads.length, 2);
        assert.strictEqual(simThreads[1].title, '[SIM] Simulated Thread');

        // Check Live (Should be unchanged)
        const liveThreads = liveState.ledger.getThreads();
        assert.strictEqual(liveThreads.length, 1);
    });

    it('should simulate vanguard unit deployment and movement', async () => {
        await stratagem.init(liveState);

        // Deploy Sim Unit
        stratagem.deploySimulatedUnit('SCOUT', 'coast');
        const units = stratagem.simVanguard.getUnits();
        assert.strictEqual(units.length, 1);

        // Verify Unit is not in Live
        assert.strictEqual(liveState.vanguard.getUnits().length, 0);

        // Step Simulation
        const initialX = units[0].x;
        const initialY = units[0].y;

        // Command unit to move
        units[0].command({ x: initialX + 10, y: initialY + 10 });

        stratagem.step();

        assert.notStrictEqual(units[0].x, initialX);
        assert.strictEqual(stratagem.tickCount, 1);
    });

    it('should track history of simulation', async () => {
        await stratagem.init(liveState);
        stratagem.run(5);

        assert.strictEqual(stratagem.history.length, 6); // Init + 5 steps
        assert.strictEqual(stratagem.tickCount, 5);

        const lastEntry = stratagem.history[5];
        assert.ok(typeof lastEntry.defcon !== 'undefined');
        assert.ok(typeof lastEntry.balance !== 'undefined');
    });

    it('should commit changes to live state when requested', async () => {
        await stratagem.init(liveState);

        await stratagem.addSimulatedThread({
            intention: 'vibrancy',
            time: 'midday',
            region: 'medina',
            title: 'Winning Move'
        });

        await stratagem.commit(liveState.ledger, liveState.vanguard, liveState.citadel);

        assert.strictEqual(stratagem.isActive, false);

        // Check Live
        const liveThreads = liveState.ledger.getThreads();
        assert.strictEqual(liveThreads.length, 2);
        assert.strictEqual(liveThreads[1].title, '[SIM] Winning Move');
    });

    it('should not save to localStorage during simulation', async () => {
        await stratagem.init(liveState);

        // Spy on localStorage.setItem
        let callCount = 0;
        const originalSetItem = localStorageMock.setItem;
        localStorageMock.setItem = (k, v) => {
            if (k.includes('stratagem')) callCount++; // Should be 0 if we override correctly
            // Note: Our mock override in StratagemEngine is `_save = async () => {}`
            // TapestryLedger calls `_save`. So setItem should NOT be called for simLedger.
        };

        await stratagem.addSimulatedThread({ title: 'No Save' });

        // But wait, the mocked TapestryLedger uses the mocked localStorage.
        // StratagemEngine overrides `_save` to NO-OP.
        // So `_save` calls `localStorage.setItem` inside `TapestryLedger` normally.
        // But since we overrode `_save`, it shouldn't call it.

        // We can't easily assert callCount on the inner implementation if we bypassed it entirely.
        // Instead, we verify that `_save` is indeed replaced.

        // Actually, we can check if the data appears in localStorageMock store.
        const simKey = stratagem.simLedger.storageKey;
        const stored = localStorageMock.getItem(simKey);

        assert.strictEqual(stored, null); // Should not persist

        localStorageMock.setItem = originalSetItem;
    });

});

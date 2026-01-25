import test from 'node:test';
import assert from 'node:assert';
import { VanguardEngine } from '../js/vanguard.js';

// Mocks
const mockSentinel = {
    getReport: () => ({ threats: [] })
};

const mockAegis = {
    // Add stub methods if needed
};

const mockLedger = {
    getThreads: () => []
};

// Mock locations via global override or rewriting import if strictly needed.
// Since js/vanguard.js imports from './data.js', in a real unit test we might need a loader hook.
// However, the test runner used in this repo handles ESM.
// If data.js has browser dependencies, it might fail.
// Let's check data.js content first?
// Assuming data.js is pure JS data.

test('VanguardEngine Deployment', async (t) => {
    const engine = new VanguardEngine(mockSentinel, mockAegis, mockLedger);

    assert.strictEqual(engine.getUnits().length, 0);

    const unit = engine.deploy('SCOUT', 'coast');
    assert.strictEqual(engine.getUnits().length, 1);
    assert.strictEqual(unit.type, 'SCOUT');
    assert.match(unit.id, /^V-\d+/);
});

test('VanguardEngine Recall', async (t) => {
    const engine = new VanguardEngine(mockSentinel, mockAegis, mockLedger);
    const unit = engine.deploy('SCOUT');

    const success = engine.recall(unit.id);
    assert.strictEqual(success, true);
    assert.strictEqual(engine.getUnits().length, 0);
});

test('VanguardUnit Movement', async (t) => {
    const engine = new VanguardEngine(mockSentinel, mockAegis, mockLedger);
    const unit = engine.deploy('INTERCEPTOR');

    // Set a manual target to ensure movement
    unit.target = { x: unit.x + 10, y: unit.y };
    unit.status = 'MOVING';

    const startX = unit.x;

    engine.tick();

    assert.notStrictEqual(unit.x, startX, 'Unit should have moved');
    assert.strictEqual(unit.status, 'MOVING');
});

test('VanguardUnit Arrival', async (t) => {
    const engine = new VanguardEngine(mockSentinel, mockAegis, mockLedger);
    const unit = engine.deploy('SCOUT');

    // Set target very close
    unit.target = { x: unit.x + 0.1, y: unit.y };
    unit.status = 'MOVING';

    engine.tick();

    assert.strictEqual(unit.status, 'IDLE', 'Unit should become IDLE after arrival');
    assert.strictEqual(unit.target, null);
});

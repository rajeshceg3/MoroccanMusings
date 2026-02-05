import test from 'node:test';
import assert from 'node:assert';
import { VanguardEngine } from '../js/vanguard.js';
import { LegionEngine } from '../js/legion.js';

// Mocks
const mockSentinel = {
    getReport: () => ({ threats: [], defcon: 5 })
};
const mockAegis = {};
const mockLedger = {
    getThreads: () => []
};
const mockChronos = {
    simulate: () => ({ projected: { defcon: 5 }, deltas: { defcon: 0 } })
};
const mockCitadel = {};
const mockCortex = {};
const mockLocations = {
    'serenity.coast.dawn': { coordinates: { x: 25, y: 55 }, region: 'coast' }
};

test('Vanguard Squad Formation', async (t) => {
    const vanguard = new VanguardEngine(mockSentinel, mockAegis, mockLedger);

    // Deploy 3 units
    const u1 = vanguard.deploy('SCOUT');
    const u2 = vanguard.deploy('SCOUT');
    const u3 = vanguard.deploy('SCOUT');

    const squadId = vanguard.createSquad([u1.id, u2.id, u3.id]);

    assert.ok(squadId, 'Squad ID should be returned');
    assert.strictEqual(vanguard.getSquads().length, 1);

    const squad = vanguard.getSquads()[0];
    assert.strictEqual(squad.leader.id, u1.id);
    assert.strictEqual(squad.members.length, 3);

    // Check roles
    assert.strictEqual(u1.role, 'LEADER');
    assert.strictEqual(u2.role, 'WINGMAN');
    assert.strictEqual(u3.role, 'WINGMAN');

    assert.strictEqual(u2.status, 'FOLLOW');
});

test('Legion Maintenance', async (t) => {
    const vanguard = new VanguardEngine(mockSentinel, mockAegis, mockLedger);
    const legion = new LegionEngine(vanguard, mockChronos, mockSentinel, mockCitadel, mockCortex, mockLocations);

    // Deploy 3 units
    vanguard.deploy('SCOUT');
    vanguard.deploy('SCOUT');
    vanguard.deploy('SCOUT');

    assert.strictEqual(vanguard.getSquads().length, 0);

    legion.tick(mockLedger);

    assert.strictEqual(vanguard.getSquads().length, 1, 'Legion should auto-form squad');
});

test('Legion Manual Engage', async (t) => {
    const vanguard = new VanguardEngine(mockSentinel, mockAegis, mockLedger);
    const legion = new LegionEngine(vanguard, mockChronos, mockSentinel, mockCitadel, mockCortex, mockLocations);

    const u1 = vanguard.deploy('SCOUT');
    const u2 = vanguard.deploy('SCOUT');
    const u3 = vanguard.deploy('SCOUT');

    legion.tick(mockLedger); // Auto form
    const squad = vanguard.getSquads()[0];

    const success = legion.manualEngage(squad.id, {x: 10, y: 10});
    assert.strictEqual(success, true);

    assert.strictEqual(u1.status, 'MOVING');
    assert.deepStrictEqual(u1.target, {x: 10, y: 10});
});

import { StratagemEngine } from '../js/stratagem.js';
import { TapestryLedger } from '../js/tapestry.js';
import { SentinelEngine } from '../js/sentinel.js';
import { HorizonEngine } from '../js/horizon.js';
import { VanguardEngine } from '../js/vanguard.js';
import { CitadelEngine } from '../js/citadel.js';
import test from 'node:test';
import assert from 'node:assert';

// Mock Browser Globals
global.window = {
    dispatchEvent: () => {}
};
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};
global.CustomEvent = class CustomEvent {
    constructor(type, detail) {
        this.type = type;
        this.detail = detail.detail;
    }
};

const mockLocations = {
    'serenity.coast.dawn': { coordinates: { x: 10, y: 10 }, region: 'coast' },
    'awe.sahara.dusk': { coordinates: { x: 20, y: 20 }, region: 'sahara' }
};

const classes = {
    TapestryLedger,
    VanguardEngine,
    CitadelEngine,
    SentinelEngine,
    HorizonEngine
};

test('Project DAEDALUS: Scenario Loading', async (t) => {
    const stratagem = new StratagemEngine(classes, mockLocations);

    const scenario = {
        id: 'TEST-01',
        title: 'Test Scenario',
        constraints: { timeLimit: 10 },
        objectives: [],
        initialThreads: [{ intention: 'serenity', region: 'coast', time: 'dawn', title: 'Test', content: 'Test' }]
    };

    await stratagem.loadScenario(scenario);

    assert.strictEqual(stratagem.isActive, true);
    assert.strictEqual(stratagem.activeScenario.id, 'TEST-01');
    assert.strictEqual(stratagem.simLedger.getThreads().length, 1);
});

test('Project DAEDALUS: Time Limit', async (t) => {
    const stratagem = new StratagemEngine(classes, mockLocations);
    const scenario = {
        id: 'TEST-TIME',
        constraints: { timeLimit: 2 },
        objectives: [{ type: 'THREAD_COUNT', target: 999, comparator: '>=' }],
        initialThreads: []
    };

    await stratagem.loadScenario(scenario);

    let result = null;
    global.window.dispatchEvent = (e) => {
        if (e.type === 'stratagem-scenario-end') {
            result = e.detail.result;
        }
    };

    stratagem.step(); // timeLeft = 1
    assert.strictEqual(stratagem.isActive, true);

    stratagem.step(); // timeLeft = 0 -> End

    assert.strictEqual(stratagem.isActive, false); // Paused
    assert.strictEqual(result, 'TIMEOUT');
});

test('Project DAEDALUS: Win Condition', async (t) => {
    const stratagem = new StratagemEngine(classes, mockLocations);
    const scenario = {
        id: 'TEST-WIN',
        constraints: { timeLimit: 100 },
        objectives: [
            { type: 'THREAD_COUNT', target: 2, comparator: '>=' }
        ],
        initialThreads: []
    };

    await stratagem.loadScenario(scenario);

    let result = null;
    global.window.dispatchEvent = (e) => {
        if (e.type === 'stratagem-scenario-end') {
            result = e.detail.result;
        }
    };

    // Add threads
    await stratagem.addSimulatedThread({ intention: 'serenity', time: 'dawn', region: 'coast', title: 'T1' });
    stratagem.step(); // Check objectives
    assert.strictEqual(result, null); // 1 < 2

    await stratagem.addSimulatedThread({ intention: 'serenity', time: 'dawn', region: 'coast', title: 'T2' });
    stratagem.step(); // Check objectives

    assert.strictEqual(result, 'WIN');
    assert.strictEqual(stratagem.isActive, false);
});

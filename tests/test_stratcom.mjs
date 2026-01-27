import { test } from 'node:test';
import assert from 'node:assert';
import { StratcomSystem } from '../js/stratcom.js';

// Mock Dependencies
const mockLedger = {
    getThreads: () => [{ intention: 'test', title: 'Test Thread', timestamp: Date.now(), region: 'coast' }]
};
const mockHorizon = {
    analyze: () => ({ balanceScore: 50, dominance: { intention: 'test' } })
};
const mockSentinel = {
    getReport: () => ({ defcon: 3 })
};
const mockVanguard = {
    getUnits: () => [{ id: 'V-1', status: 'IDLE', battery: 100, type: 'SCOUT' }]
};
const mockTerminal = {
    output: { children: [] },
    log: () => {}
};
const mockUI = {};

// Mock DOM
const mockDOM = {};
const createMockElement = (id) => {
    return {
        id: id,
        _innerHTML: '',
        get innerHTML() { return this._innerHTML; },
        set innerHTML(val) { this._innerHTML = val; },
        textContent: '',
        classList: {
            remove: () => {},
            add: () => {}
        },
        addEventListener: () => {},
        appendChild: function(child) {
             // specific logic to simulate adding html
             this._innerHTML += child.innerHTML;
        },
        cloneNode: () => createMockElement()
    };
};

global.document = {
    getElementById: (id) => {
        if (!mockDOM[id]) {
            mockDOM[id] = createMockElement(id);
        }
        return mockDOM[id];
    },
    createElement: () => createMockElement()
};
global.setInterval = (fn) => fn(); // Run once immediately
global.clearInterval = () => {};

test('StratcomSystem', async (t) => {
    const stratcom = new StratcomSystem(mockLedger, mockHorizon, mockSentinel, mockVanguard, mockTerminal, mockUI);

    await t.test('should initialize correctly', () => {
        stratcom.init();
        assert.ok(stratcom.elements.overlay);
    });

    await t.test('should toggle active state', () => {
        stratcom.toggle(true);
        assert.strictEqual(stratcom.active, true);
        stratcom.toggle(false);
        assert.strictEqual(stratcom.active, false);
    });

    await t.test('should update widgets', () => {
        stratcom.toggle(true);
        stratcom.update();

        // Verify interactions with mocks
        assert.strictEqual(stratcom.elements.defcon.textContent, 3);
        assert.ok(stratcom.elements.balance.innerHTML.includes('50%'));
        // The unit HTML should contain V-1
        assert.ok(stratcom.elements.units.innerHTML.includes('V-1'));
    });
});

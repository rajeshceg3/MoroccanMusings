import { test, describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ValkyrieEngine } from '../js/valkyrie.js';

// --- MOCKS ---
// Mock LocalStorage
const localStorageMock = (function() {
    let store = {};
    return {
        getItem: function(key) {
            return store[key] || null;
        },
        setItem: function(key, value) {
            store[key] = value.toString();
        },
        clear: function() {
            store = {};
        },
        removeItem: function(key) {
            delete store[key];
        }
    };
})();
global.localStorage = localStorageMock;

const terminalMock = {
    logs: [],
    log: function(msg, type) {
        this.logs.push({ msg, type });
    },
    clearLogs: function() {
        this.logs = [];
    }
};

const uiMock = {
    notifications: [],
    showNotification: function(msg, type) {
        this.notifications.push({ msg, type });
    },
    clearNotifications: function() {
        this.notifications = [];
    }
};

const ledgerMock = {
    locked: false,
    lock: function() {
        this.locked = true;
    },
    reset: function() {
        this.locked = false;
    }
};

const horizonMock = {
    analyze: function(threads) {
        return { balanceScore: 50 };
    }
};

describe('ValkyrieEngine (Project OMEGA)', () => {
    let engine;

    beforeEach(() => {
        localStorageMock.clear();
        terminalMock.clearLogs();
        uiMock.clearNotifications();
        ledgerMock.reset();
        engine = new ValkyrieEngine(terminalMock, uiMock, ledgerMock, horizonMock);
    });

    it('should initialize with default protocols', () => {
        const protocols = engine.getProtocols();
        assert.ok(protocols.length > 0);
        assert.ok(protocols.find(p => p.id === 'OMEGA_PROTOCOL'));
    });

    it('should persist new protocols', () => {
        engine.addProtocol({
            id: 'TEST_PROTOCOL',
            condition: 'defcon < 2',
            action: 'NOTIFY TEST_ACTIVE'
        });

        // Check memory
        const p = engine.getProtocols().find(x => x.id === 'TEST_PROTOCOL');
        assert.ok(p);
        assert.strictEqual(p.action, 'NOTIFY TEST_ACTIVE');

        // Check storage
        const stored = JSON.parse(localStorage.getItem('marq_valkyrie_protocols'));
        assert.ok(stored.find(x => x.id === 'TEST_PROTOCOL'));
    });

    it('should prevent duplicate IDs', () => {
        assert.throws(() => {
            engine.addProtocol({
                id: 'OMEGA_PROTOCOL', // Exists
                condition: 'x < 1',
                action: 'LOG x'
            });
        });
    });

    it('should remove protocols', () => {
        const countBefore = engine.getProtocols().length;
        engine.removeProtocol('OMEGA_PROTOCOL');
        assert.strictEqual(engine.getProtocols().length, countBefore - 1);
        assert.ok(!engine.getProtocols().find(p => p.id === 'OMEGA_PROTOCOL'));
    });

    describe('Dynamic Logic Evaluation', () => {
        it('should correctly evaluate conditions (<, >, =)', () => {
            // Context mocks
            const ctx1 = { defcon: 2, balance: 50 };
            const ctx2 = { defcon: 5, balance: 20 };

            assert.strictEqual(engine._checkCondition('defcon < 3', ctx1), true);
            assert.strictEqual(engine._checkCondition('defcon < 3', ctx2), false);

            assert.strictEqual(engine._checkCondition('balance > 30', ctx1), true);
            assert.strictEqual(engine._checkCondition('balance > 30', ctx2), false);

            assert.strictEqual(engine._checkCondition('defcon = 2', ctx1), true);
        });

        it('should correctly evaluate CONTAINS', () => {
            const ctx = { threats: ['TEMPORAL_SURGE', 'DATA_CORRUPTION'] };

            assert.strictEqual(engine._checkCondition('threats CONTAINS TEMPORAL_SURGE', ctx), true);
            assert.strictEqual(engine._checkCondition('threats CONTAINS INVASION', ctx), false);
        });

        it('should execute actions when triggered', () => {
            // Clear defaults to prevent interference
            engine.protocols = [];

            // Define a protocol
            engine.addProtocol({
                id: 'TRIGGER_TEST',
                condition: 'defcon < 2',
                action: 'NOTIFY TRIGGERED',
                cooldown: 0
            });

            // Evaluate
            const sentinelReport = { defcon: 1, threats: [] };
            const threads = [];

            engine.evaluate(sentinelReport, threads);

            assert.strictEqual(uiMock.notifications.length, 1);
            assert.strictEqual(uiMock.notifications[0].msg, 'VALKYRIE: TRIGGERED');
        });

        it('should respect cooldowns', () => {
            engine.protocols = [];
            engine.addProtocol({
                id: 'COOLDOWN_TEST',
                condition: 'defcon < 2',
                action: 'LOG TEST',
                cooldown: 5000
            });

            const sentinelReport = { defcon: 1, threats: [] };

            // First trigger
            engine.evaluate(sentinelReport, []);
            assert.strictEqual(terminalMock.logs.length, 1);

            // Second trigger (immediate)
            engine.evaluate(sentinelReport, []);
            assert.strictEqual(terminalMock.logs.length, 1); // Should not increase
        });

        it('should execute system lock', () => {
             engine.protocols = [];
             engine.addProtocol({
                 id: 'LOCK_TEST',
                 condition: 'defcon < 2',
                 action: 'SYS_LOCK',
                 cooldown: 0
             });

             engine.evaluate({ defcon: 1, threats: [] }, []);

             assert.ok(uiMock.notifications.find(n => n.msg.includes('SYSTEM LOCKDOWN')));
        });
    });
});

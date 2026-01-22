
import { ValkyrieEngine } from '../js/valkyrie.js';
import assert from 'assert';

console.log('--- TESTING VALKYRIE ENGINE ---');

// Mock Dependencies
const mockTerminal = {
    log: (msg, type) => console.log(`[TERMINAL:${type}] ${msg}`)
};

const mockUI = {
    showNotification: (msg, type) => console.log(`[UI:${type}] ${msg}`)
};

const mockLedger = {};

const valkyrie = new ValkyrieEngine(mockTerminal, mockUI, mockLedger);

// Test 1: Initialization
assert.strictEqual(valkyrie.status, 'ACTIVE');
assert.strictEqual(valkyrie.getProtocols().length, 3);
console.log('✓ Initialization successful');

// Test 2: Trigger Condition (OMEGA PROTOCOL - DEFCON 3)
const mockSentinelReport = {
    defcon: 2,
    threats: []
};

console.log('Testing Omega Protocol (DEFCON < 3)...');
valkyrie.evaluate(mockSentinelReport, []);

// Check logs (manual verification via console output for now, or we can spy)
const lastLog = valkyrie.executionLog[valkyrie.executionLog.length - 1];
assert.strictEqual(lastLog.id, 'OMEGA_PROTOCOL');
console.log('✓ Omega Protocol Triggered');

// Test 3: Cooldown
console.log('Testing Cooldown...');
valkyrie.evaluate(mockSentinelReport, []);
assert.strictEqual(valkyrie.executionLog.length, 1); // Should not increase
console.log('✓ Cooldown respected');

// Test 4: Disarm
console.log('Testing Disarm...');
valkyrie.toggleProtocol('OMEGA_PROTOCOL', false);
valkyrie.executionLog = []; // clear
// Force allow by manipulating cooldown manually for test
valkyrie.getProtocols().find(p => p.id === 'OMEGA_PROTOCOL').lastTriggered = 0;

valkyrie.evaluate(mockSentinelReport, []);
assert.strictEqual(valkyrie.executionLog.length, 0);
console.log('✓ Disarm respected');

console.log('--- ALL TESTS PASSED ---');

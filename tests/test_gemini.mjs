import { test } from 'node:test';
import assert from 'node:assert';
import { GeminiEngine } from '../js/gemini.js';

// Mock BroadcastChannel
class MockChannel {
    constructor(name) {
        this.name = name;
        this.onmessage = null;
    }
    postMessage(data) {
        if (MockChannel.lastMessageCallback) {
            MockChannel.lastMessageCallback(data);
        }
    }
}
MockChannel.lastMessageCallback = null;

// Mock Globals
global.BroadcastChannel = MockChannel;
global.window = {
    location: { search: '?mode=test' },
    URLSearchParams: class {
        constructor(s) { this.s = s; }
        get(k) { return 'test'; }
    }
};

test('GeminiEngine Initialization', async (t) => {
    const gemini = new GeminiEngine({}, {}, {}, {});
    assert.ok(gemini.id);
    clearInterval(gemini.heartbeatInterval);
});

test('GeminiEngine Broadcast', async (t) => {
    const gemini = new GeminiEngine({}, {}, {}, {});

    let received = null;
    MockChannel.lastMessageCallback = (msg) => {
        received = msg;
    };

    gemini.broadcast('TEST_TYPE', { foo: 'bar' });

    assert.strictEqual(received.type, 'TEST_TYPE');
    assert.strictEqual(received.payload.foo, 'bar');
    assert.strictEqual(received.sender, gemini.id);

    clearInterval(gemini.heartbeatInterval);
});

test('GeminiEngine Message Handling', async (t) => {
    const gemini = new GeminiEngine({}, { status: 'READY' }, {}, { updateGeminiStatus: () => {} });

    // Simulate incoming HELLO from another peer
    const otherId = 'peer_123';
    gemini._handleMessage({
        type: 'HELLO',
        payload: { id: otherId, mode: 'default' },
        sender: otherId
    });

    assert.strictEqual(gemini.getPeerCount(), 1);

    clearInterval(gemini.heartbeatInterval);
});

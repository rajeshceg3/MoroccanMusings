import { test, describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import { HorizonEngine } from '../js/horizon.js';
import { SynthesisEngine } from '../js/alchemy.js';
import { TapestryLedger } from '../js/tapestry.js';

// --- TACTICAL SHIMS ---
// Simulate Browser Environment for Testing
if (!global.window) {
    global.window = {
        crypto: global.crypto,
        btoa: global.btoa,
        atob: global.atob
    };
}

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

describe('Tactical Unit Verification', () => {

    describe('HorizonEngine (Strategic Analysis)', () => {
        const engine = new HorizonEngine();

        it('should return neutral state for empty threads', () => {
            const result = engine.analyze([]);
            assert.strictEqual(result.dominance.intention, 'None');
            assert.strictEqual(result.balanceScore, 0);
        });

        it('should correctly identify dominant intention', () => {
            const threads = [
                { intention: 'serenity', time: 'dawn' },
                { intention: 'serenity', time: 'dusk' },
                { intention: 'vibrancy', time: 'midday' }
            ];
            const result = engine.analyze(threads);
            assert.strictEqual(result.dominance.intention, 'serenity');
            assert.strictEqual(result.counts.serenity, 2);
        });

        it('should calculate balance score', () => {
            // Perfect balance: 1 of each (4 total)
            const threads = [
                { intention: 'serenity' },
                { intention: 'vibrancy' },
                { intention: 'awe' },
                { intention: 'legacy' }
            ];
            const result = engine.analyze(threads);
            assert.strictEqual(result.balanceScore, 100);
        });

        it('should project momentum and balance ghosts', () => {
             const threads = [
                { intention: 'serenity', time: 'dawn' },
                { intention: 'serenity', time: 'dusk' }
            ];
            const projections = engine.project(threads);
            assert.strictEqual(projections.length, 2);

            const momentum = projections.find(p => p.type === 'momentum');
            assert.ok(momentum);
            assert.strictEqual(momentum.intention, 'serenity');

            const balance = projections.find(p => p.type === 'balance');
            assert.ok(balance);
            // Least common could be anything other than serenity, likely 'vibrancy', 'awe', or 'legacy' (0 count)
            assert.notStrictEqual(balance.intention, 'serenity');
        });
    });

    describe('SynthesisEngine (Alchemy)', () => {
        const engine = new SynthesisEngine();

        it('should fuse two threads into a phantom', async () => {
            const t1 = {
                id: '1', hash: 'abc',
                intention: 'serenity', region: 'coast', time: 'dawn',
                title: 'A', subtitle: 'Sub A',
                narrative: 'Narrative A.'
            };
            const t2 = {
                id: '2', hash: 'def',
                intention: 'vibrancy', region: 'medina', time: 'midday',
                title: 'B', subtitle: 'Sub B',
                narrative: 'Narrative B.'
            };

            const result = await engine.fuse(t1, t2);

            assert.ok(result.isPhantom);
            assert.ok(result.id.startsWith('phantom-'));
            assert.ok(result.title.length > 0);
            assert.ok(result.sensory.sight.color);
        });

        it('should be deterministic based on hash', async () => {
             const t1 = { id: '1', hash: 'abc', intention: 'serenity', region: 'coast', time: 'dawn' };
             const t2 = { id: '2', hash: 'def', intention: 'vibrancy', region: 'medina', time: 'midday' };

             const r1 = await engine.fuse(t1, t2);
             const r2 = await engine.fuse(t2, t1); // Reverse order

             assert.strictEqual(r1.title, r2.title);
             assert.strictEqual(r1.sensory.sight.color, r2.sensory.sight.color);
        });
    });

    describe('TapestryLedger (Mission Log)', () => {
        let ledger;

        beforeEach(async () => {
            localStorage.clear();
            ledger = new TapestryLedger('test_ledger');
            await ledger.initialize();
        });

        it('should start empty and ready', () => {
            assert.strictEqual(ledger.status, 'READY');
            assert.strictEqual(ledger.getThreads().length, 0);
        });

        it('should add a thread and generate a valid hash', async () => {
            const data = {
                intention: 'serenity',
                time: 'dawn',
                region: 'coast',
                title: 'Test Thread'
            };
            const thread = await ledger.addThread(data);

            assert.strictEqual(ledger.getThreads().length, 1);
            assert.strictEqual(thread.title, 'Test Thread');
            assert.ok(thread.hash);
            assert.match(thread.hash, /^[a-f0-9]{64}$/i);
            assert.strictEqual(thread.previousHash, 'GENESIS_HASH');
        });

        it('should link threads via hash (Blockchain Logic)', async () => {
             const t1 = await ledger.addThread({ intention: 'serenity', time: 'dawn', region: 'coast', title: 'T1' });
             const t2 = await ledger.addThread({ intention: 'vibrancy', time: 'midday', region: 'medina', title: 'T2' });

             assert.strictEqual(t2.previousHash, t1.hash);
        });

        it('should verify integrity of a valid chain', async () => {
             await ledger.addThread({ intention: 'serenity', time: 'dawn', region: 'coast', title: 'T1' });
             await ledger.addThread({ intention: 'vibrancy', time: 'midday', region: 'medina', title: 'T2' });

             const isValid = await ledger.verifyIntegrity();
             assert.strictEqual(isValid, true);
        });

        it('should detect corruption', async () => {
             await ledger.addThread({ intention: 'serenity', time: 'dawn', region: 'coast', title: 'T1' });

             // Tamper with the ledger in memory
             ledger.threads[0].title = 'CORRUPTED TITLE';

             const isValid = await ledger.verifyIntegrity();
             assert.strictEqual(isValid, false);
             assert.strictEqual(ledger.threads[0].integrityStatus, 'corrupted');
        });

        it('should validate imported scroll schema', async () => {
            // Invalid thread (missing hash)
            const badData = JSON.stringify([{
                id: '123',
                title: 'Bad Thread'
            }]);

            await assert.rejects(async () => {
                await ledger.importScroll(badData);
            }, /Invalid schema/);
        });

        it('should reject XSS attempts in imported data', async () => {
            // Thread with script tag in title
            // Note: We need to mock a valid hash/structure to even get to the regex check,
            // or just rely on the regex check failing.
            const maliciousThread = {
                id: '123',
                intention: 'serenity',
                time: 'dawn',
                region: 'coast',
                title: '<script>alert(1)</script>',
                timestamp: 1234567890,
                hash: 'a'.repeat(64) // valid length
            };

            const json = JSON.stringify([maliciousThread]);

            await assert.rejects(async () => {
                await ledger.importScroll(json);
            }, /Invalid schema/);
        });

        it('should clear the ledger', async () => {
            await ledger.addThread({ intention: 'serenity', time: 'dawn', region: 'coast', title: 'T1' });
            assert.strictEqual(ledger.getThreads().length, 1);
            ledger.clear();
            assert.strictEqual(ledger.getThreads().length, 0);
        });

        it('should lock and unlock the ledger with encryption', async () => {
             const password = 'tactical_password';
             await ledger.addThread({ intention: 'serenity', time: 'dawn', region: 'coast', title: 'Secret Thread' });

             // Encrypt/Lock
             await ledger.enableEncryption(password);
             await ledger.lock();

             assert.strictEqual(ledger.status, 'LOCKED');
             assert.strictEqual(ledger.getThreads().length, 0); // Memory cleared

             // Unlock
             const success = await ledger.unlock(password);
             assert.strictEqual(success, true);
             assert.strictEqual(ledger.status, 'READY');
             assert.strictEqual(ledger.getThreads().length, 1);
             assert.strictEqual(ledger.getThreads()[0].title, 'Secret Thread');
        });
    });

});

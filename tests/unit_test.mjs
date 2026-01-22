import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { HorizonEngine } from '../js/horizon.js';
import { SynthesisEngine } from '../js/alchemy.js';

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

});

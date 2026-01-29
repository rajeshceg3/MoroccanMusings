import { test, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MnemosyneEngine } from '../js/mnemosyne.js';

describe('MnemosyneEngine', () => {
    let engine;

    beforeEach(() => {
        engine = new MnemosyneEngine();
    });

    it('should tokenize text correctly', () => {
        const text = "The quick brown fox jumps over the lazy dog";
        const tokens = engine._tokenize(text);
        assert.ok(tokens.includes('quick'));
        assert.ok(!tokens.includes('the')); // Stop word
        assert.ok(tokens.includes('dog')); // Length 3 > 2
        assert.ok(!tokens.includes('at')); // Length 2 <= 2 (if present)
    });

    it('should calculate TF-IDF and similarity', () => {
        const threads = [
            { id: '1', content: 'Apple banana cherry' },
            { id: '2', content: 'Apple banana date' },
            { id: '3', content: 'Xenon Yttrium Zinc' }
        ];

        engine.ingest(threads);

        const similarTo1 = engine.findSimilar('1');

        // 1 and 2 share "Apple", "banana".
        assert.strictEqual(similarTo1.length, 1);
        assert.strictEqual(similarTo1[0].id, '2');
        assert.ok(similarTo1[0].score > 0.1);

        const similarTo3 = engine.findSimilar('3');
        assert.strictEqual(similarTo3.length, 0);
    });

    it('should handle incremental updates', () => {
         // Need a noise thread so common term 'alpha' isn't in 100% of docs (which would make IDF 0)
         const threads = [
             { id: '1', content: 'alpha beta' },
             { id: 'noise', content: 'zulu yankee' }
         ];
         engine.ingest(threads);

         // Add target. Now 'alpha' is in 2/3 docs.
         engine.addThread({ id: '2', content: 'alpha gamma' });

         const results = engine.findSimilar('1');
         assert.strictEqual(results.length, 1);
         assert.strictEqual(results[0].id, '2');
         assert.ok(results[0].commonTerms.includes('alpha'));
    });

    it('should ignore stop words effectively', () => {
        const threads = [
            { id: '1', content: 'the is a' },
            { id: '2', content: 'the is a' }
        ];
        engine.ingest(threads);

        // Both are empty after tokenization
        // Vectors should be empty or 0 magnitude
        const similar = engine.findSimilar('1');
        assert.strictEqual(similar.length, 0);
    });
});

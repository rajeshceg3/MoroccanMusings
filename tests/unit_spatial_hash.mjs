import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { SpatialHash } from '../js/synapse.js';

describe('SpatialHash Optimization', () => {

    it('should insert items and retrieve them correctly', () => {
        // Grid size 100x100
        const grid = new SpatialHash(100);

        const item1 = { id: 1, x: 50, y: 50 };   // Cell 0,0
        const item2 = { id: 2, x: 150, y: 150 }; // Cell 1,1 (Neighbor of 0,0)
        const item3 = { id: 3, x: 60, y: 60 };   // Cell 0,0
        const item4 = { id: 4, x: 500, y: 500 }; // Cell 5,5 (Far away)

        grid.insert(item1);
        grid.insert(item2);
        grid.insert(item3);
        grid.insert(item4);

        // Query near item1 (should get item1, item3, and item2 because 1,1 is neighbor)
        const neighbors = grid.query(50, 50);

        assert.ok(neighbors.includes(item1));
        assert.ok(neighbors.includes(item3));
        assert.ok(neighbors.includes(item2)); // Adjacent cell

        // Should NOT include item4
        assert.ok(!neighbors.includes(item4));
    });

    it('should handle boundary conditions', () => {
        const grid = new SpatialHash(100);
        const item = { id: 1, x: 99, y: 99 };
        grid.insert(item);

        const neighbors = grid.query(101, 101);
        assert.ok(neighbors.includes(item));
    });

    it('should clear the grid', () => {
        const grid = new SpatialHash(100);
        grid.insert({ id: 1, x: 50, y: 50 });
        grid.clear();
        const neighbors = grid.query(50, 50);
        assert.strictEqual(neighbors.length, 0);
    });
});

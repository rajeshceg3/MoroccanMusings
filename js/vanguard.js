import { locations } from './data.js';

/**
 * Project VANGUARD: Autonomous Tactical Unit System
 * Manages deployable drone units for map reconnaissance and threat interception.
 */

class VanguardUnit {
    constructor(id, type, startCoords, engine) {
        this.id = id;
        this.type = type; // 'SCOUT', 'INTERCEPTOR'
        this.x = startCoords.x;
        this.y = startCoords.y;
        this.engine = engine;

        // Stats
        this.speed = type === 'INTERCEPTOR' ? 0.8 : 0.5; // Map units per tick
        this.scanRange = type === 'SCOUT' ? 15 : 10;
        this.battery = 100;

        // State Machine
        this.status = 'IDLE'; // IDLE, MOVING, SCANNING, RETURNING
        this.target = null; // {x, y}
        this.currentRegion = 'unknown';

        // Visuals
        this.heading = 0;
        this.scanPulse = 0;
    }

    update(threads, threats) {
        if (this.battery <= 0) {
            this.status = 'OFFLINE';
            return;
        }

        // Logic based on Type and State
        if (this.status === 'IDLE') {
            this._decideNextMove(threats);
        } else if (this.status === 'MOVING') {
            this._move();
            this._checkScanOpportunies(threads);
        } else if (this.status === 'SCANNING') {
            this._performScan();
        }

        this.battery -= 0.01; // Slow drain
    }

    _decideNextMove(threats) {
        // Interceptors prioritize threats
        if (this.type === 'INTERCEPTOR' && threats && threats.length > 0) {
            // Pick highest threat
            // Since threats don't have coords directly in the report (Sentinel just reports zones roughly),
            // We map threat types/messages to regions or just pick a random high-activity zone.
            // For now, let's pick a random point in a "Threat Zone" if available, else random.
            // Sentinel doesn't give coords easily, but we can assume region centers.
            // Let's just patrol random regions for now.
             this._setRandomPatrol();
        } else {
            this._setRandomPatrol();
        }
    }

    _setRandomPatrol() {
        // Pick a random region center
        const keys = Object.keys(locations);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const loc = locations[randomKey];
        if (loc && loc.coordinates) {
            this.target = { ...loc.coordinates };
            // Add some fuzz
            this.target.x += (Math.random() - 0.5) * 10;
            this.target.y += (Math.random() - 0.5) * 10;
            this.status = 'MOVING';
        }
    }

    _move() {
        if (!this.target) {
            this.status = 'IDLE';
            return;
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1) {
            // Arrived
            this.x = this.target.x;
            this.y = this.target.y;
            this.status = 'IDLE';
            this.target = null;
            return;
        }

        // Move
        const moveDist = Math.min(this.speed, dist);
        const angle = Math.atan2(dy, dx);
        this.x += Math.cos(angle) * moveDist;
        this.y += Math.sin(angle) * moveDist;
        this.heading = angle;
    }

    _checkScanOpportunies(threads) {
        // Check if close to any thread node
        // We need to map threads to coords.
        // This is expensive if we do it every tick for every thread.
        // We'll rely on the Engine to pass relevant nearby nodes or just check randomly.
        // Or we just scan periodically.

        if (Math.random() < 0.01) {
            this.status = 'SCANNING';
            this.scanTimer = 60; // 1 second roughly
        }
    }

    _performScan() {
        this.scanPulse += 0.1;
        this.scanTimer--;
        if (this.scanTimer <= 0) {
            this.status = 'IDLE';
            this.engine.reportScan(this);
        }
    }
}

export class VanguardEngine {
    constructor(sentinel, aegis, ledger) {
        this.sentinel = sentinel;
        this.aegis = aegis;
        this.ledger = ledger;
        this.units = [];
        this.idCounter = 1;
    }

    deploy(type = 'SCOUT', regionName = 'coast') {
        // Find start coords based on region
        let startCoords = { x: 50, y: 50 }; // Default

        // Find a location in that region
        for (const key in locations) {
            if (key.includes(regionName)) {
                startCoords = locations[key].coordinates;
                break;
            }
        }

        const id = `V-${this.idCounter++}`;
        const unit = new VanguardUnit(id, type.toUpperCase(), startCoords, this);
        this.units.push(unit);
        return unit;
    }

    recall(id) {
        const idx = this.units.findIndex(u => u.id === id);
        if (idx !== -1) {
            this.units.splice(idx, 1);
            return true;
        }
        return false;
    }

    tick() {
        if (this.units.length === 0) return;

        const threads = this.ledger.getThreads();
        const threatReport = this.sentinel.getReport(); // Assuming getReport is cached or fast

        this.units.forEach(unit => {
            unit.update(threads, threatReport.threats);
        });
    }

    getUnits() {
        return this.units;
    }

    reportScan(unit) {
        // Unit finished a scan. Grant XP?
        if (this.aegis) {
            // We can't easily access aegis methods unless exposed.
            // Assuming Aegis has an 'addXP' or similar?
            // Checking AegisEngine... it tracks XP internally.
            // We might need to extend Aegis or just log it.
            // For now, we'll just return true.
        }
    }
}

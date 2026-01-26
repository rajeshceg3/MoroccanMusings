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
        this.status = 'IDLE'; // IDLE, MOVING, SCANNING, RETURNING, INTERCEPTING, PURGING
        this.target = null; // {x, y}
        this.assignedTarget = null; // Manual override
        this.interceptTarget = null; // Threat object
        this.currentRegion = 'unknown';

        // Visuals
        this.heading = 0;
        this.scanPulse = 0;
    }

    command(coords) {
        this.assignedTarget = coords;
        this.target = coords;
        this.status = 'MOVING';
    }

    intercept(threat) {
        // Map threat region to coords
        if (threat.region) {
            const locs = Object.values(locations).filter(l => l.region === threat.region || (l.coordinates && threat.region === 'global'));
            if (locs.length > 0) {
                 const target = locs[Math.floor(Math.random() * locs.length)].coordinates;
                 this.command(target);
                 this.interceptTarget = threat;
                 this.status = 'INTERCEPTING'; // Moving with intent to purge
            }
        }
    }

    purge() {
        if (this.battery < 20) return; // Insufficient power
        this.status = 'PURGING';
        this.scanTimer = 100; // Purge takes longer
    }

    update(threads, threats) {
        if (this.battery <= 0) {
            this.status = 'OFFLINE';
            return;
        }

        // Logic based on Type and State
        if (this.status === 'IDLE') {
            if (this.assignedTarget) {
                 this.target = this.assignedTarget;
                 this.status = 'MOVING';
            } else {
                this._decideNextMove(threats);
            }
        } else if (this.status === 'MOVING' || this.status === 'INTERCEPTING') {
            this._move();
            if (this.status === 'MOVING') {
                this._checkScanOpportunies(threads);
            }
        } else if (this.status === 'SCANNING') {
            this._performScan();
        } else if (this.status === 'PURGING') {
            this._performPurge();
        }

        this.battery -= 0.01; // Slow drain
    }

    _decideNextMove(threats) {
        if (this.assignedTarget) return; // Do not override manual commands

        // Interceptors prioritize threats
        if (this.type === 'INTERCEPTOR' && threats && threats.length > 0) {
            this._setRandomPatrol(); // Simplified for now, advanced intercept logic handled via intercept()
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
            this.assignedTarget = null;

            if (this.status === 'INTERCEPTING') {
                this.purge();
            } else {
                this.status = 'IDLE';
            }
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

    _performPurge() {
        this.scanPulse += 0.3; // Faster pulse
        this.scanTimer--;
        this.battery -= 0.1; // High drain
        if (this.scanTimer <= 0) {
            this.status = 'IDLE';
            this.engine.reportPurge(this);
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

    getUnitAt(x, y, threshold = 5) {
        // Find closest unit within threshold (map units)
        let closest = null;
        let minInfo = threshold;

        this.units.forEach(u => {
            const dx = u.x - x;
            const dy = u.y - y;
            const d = Math.sqrt(dx*dx + dy*dy);
            if (d < minInfo) {
                minInfo = d;
                closest = u;
            }
        });
        return closest;
    }

    reportScan(unit) {
        // Unit finished a scan. Grant XP?
        if (this.aegis) {
             // Future Integration
        }
    }

    reportPurge(unit) {
        console.log(`Unit ${unit.id} PURGED sector.`);
    }
}

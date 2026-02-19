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
        this.status = 'IDLE'; // IDLE, MOVING, SCANNING, RETURNING, INTERCEPTING, PURGING, SYNTHESIZING, FOLLOW
        this.target = null; // {x, y}
        this.assignedTarget = null; // Manual override
        this.interceptTarget = null; // Threat object
        this.mission = null; // { type, data }
        this.currentRegion = 'unknown';

        // Squad capabilities
        this.squadId = null;
        this.role = 'SOLO'; // SOLO, LEADER, WINGMAN
        this.formationOffset = { x: 0, y: 0 };
        this.leader = null; // Reference to leader unit

        // Visuals
        this.heading = 0;
        this.scanPulse = 0;
    }

    hydrate(state) {
        Object.assign(this, state);
    }

    joinSquad(squadId, role, offset, leader = null) {
        this.squadId = squadId;
        this.role = role;
        this.formationOffset = offset;
        this.leader = leader;
        if (role === 'WINGMAN') {
            this.status = 'FOLLOW';
        }
    }

    leaveSquad() {
        this.squadId = null;
        this.role = 'SOLO';
        this.leader = null;
        this.status = 'IDLE';
    }

    assignMission(type, data) {
        this.mission = { type, data };
        if (data.x !== undefined && data.y !== undefined) {
            this.command({ x: data.x, y: data.y });
        }
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
            // Check for Mission Arrival
            if (this.mission && this.mission.type === 'SYNTHESIS') {
                 const dx = this.x - this.mission.data.x;
                 const dy = this.y - this.mission.data.y;
                 if (Math.sqrt(dx*dx + dy*dy) < 2) {
                     this.status = 'SYNTHESIZING';
                     this.scanTimer = 150; // Synthesis duration
                 }
            }

            if (this.status !== 'SYNTHESIZING') {
                if (this.assignedTarget) {
                     this.target = this.assignedTarget;
                     this.status = 'MOVING';
                } else {
                    this._decideNextMove(threats);
                }
            }
        } else if (this.status === 'MOVING' || this.status === 'INTERCEPTING') {
            this._move();
            if (this.status === 'MOVING') {
                this._checkScanOpportunies(threads);
            }
        } else if (this.status === 'FOLLOW') {
            this._followLeader();
        } else if (this.status === 'SCANNING') {
            this._performScan();
        } else if (this.status === 'PURGING') {
            this._performPurge();
        } else if (this.status === 'SYNTHESIZING') {
            this._performSynthesis();
        }

        this.battery -= 0.01; // Slow drain
    }

    _followLeader() {
        if (!this.leader || this.leader.status === 'OFFLINE') {
            this.status = 'IDLE'; // Leader lost
            return;
        }

        // Calculate target position based on leader pos + rotated offset
        // We rotate offset by leader's heading
        const cos = Math.cos(this.leader.heading);
        const sin = Math.sin(this.leader.heading);

        const tx = this.leader.x + (this.formationOffset.x * cos - this.formationOffset.y * sin);
        const ty = this.leader.y + (this.formationOffset.x * sin + this.formationOffset.y * cos);

        this.target = { x: tx, y: ty };
        this._move();
    }

    _decideNextMove(threats) {
        if (this.assignedTarget) return; // Do not override manual commands
        if (this.status === 'FOLLOW') return; // Do not override formation

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

    _performSynthesis() {
        this.scanPulse += 0.05; // Gentle pulse
        this.scanTimer--;
        if (this.scanTimer <= 0) {
            this.status = 'IDLE';
            this.engine.reportSynthesis(this);
            this.mission = null;
        }
    }
}

export class VanguardEngine {
    constructor(sentinel, aegis, ledger) {
        this.sentinel = sentinel;
        this.aegis = aegis;
        this.ledger = ledger;
        this.units = [];
        this.squads = new Map(); // id -> { id, leaderId, memberIds, type }
        this.idCounter = 1;
    }

    createSquad(unitIds, type = 'V-WING') {
        const squadId = `SQ-${Date.now().toString(36).substring(7).toUpperCase()}`;
        const members = this.units.filter(u => unitIds.includes(u.id));

        if (members.length === 0) return null;

        const leader = members[0];

        // Define offsets based on type
        // V-WING: Leader at 0,0. Wingmen back and out.
        members.forEach((u, i) => {
            if (i === 0) {
                u.joinSquad(squadId, 'LEADER', {x:0, y:0});
            } else {
                // Alternating left/right
                const side = i % 2 === 0 ? 1 : -1;
                const row = Math.ceil(i/2);
                u.joinSquad(squadId, 'WINGMAN', { x: -3 * row, y: 3 * side * row }, leader);
            }
        });

        this.squads.set(squadId, {
            id: squadId,
            leaderId: leader.id,
            memberIds: members.map(u => u.id),
            type
        });

        return squadId;
    }

    getSquads() {
        return Array.from(this.squads.values()).map(s => {
            const leader = this.units.find(u => u.id === s.leaderId);
            return {
                ...s,
                leader: leader, // Pass object reference for rendering
                members: this.units.filter(u => s.memberIds.includes(u.id))
            };
        });
    }

    disbandSquad(squadId) {
        if (!this.squads.has(squadId)) return false;
        const squad = this.squads.get(squadId);

        squad.memberIds.forEach(id => {
            const u = this.units.find(unit => unit.id === id);
            if (u) u.leaveSquad();
        });

        this.squads.delete(squadId);
        return true;
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
        // Purge logic executed
    }

    reportSynthesis(unit) {
        const event = new CustomEvent('vanguard-synthesis-complete', { detail: { unit } });
        window.dispatchEvent(event);
    }

    getSnapshot() {
        return this.units.map(u => {
            const snapshot = {};
            // Shallow copy properties, excluding circular references (engine)
            for (const key in u) {
                if (key !== 'engine' && typeof u[key] !== 'function') {
                    snapshot[key] = u[key];
                }
            }
            return snapshot;
        });
    }

    loadSnapshot(data) {
        this.units = [];
        data.forEach(uData => {
            const unit = new VanguardUnit(uData.id, uData.type, {x: uData.x, y: uData.y}, this);
            unit.hydrate(uData);
            this.units.push(unit);
        });

        const maxId = data.reduce((max, u) => {
             const parts = u.id.split('-');
             const num = parts.length > 1 ? parseInt(parts[1]) : 0;
             return num > max ? num : max;
        }, 0);
        this.idCounter = maxId + 1;
    }
}

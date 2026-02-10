/**
 * Project LEGION: Swarm Intelligence Engine
 * Orchestrates Vanguard units into autonomous tactical squads.
 * Leverages Chronos for predictive interception and Cortex for cluster targeting.
 */

export class LegionEngine {
    constructor(vanguard, chronos, sentinel, citadel, cortex, locations) {
        this.vanguard = vanguard;
        this.chronos = chronos;
        this.sentinel = sentinel;
        this.citadel = citadel;
        this.cortex = cortex;
        this.locations = locations;

        this.tickCount = 0;
        this.lastSimulation = 0;
        this.isActive = true;

        // Configuration
        this.SIM_INTERVAL = 300; // Ticks between Chronos runs
        this.SQUAD_SIZE = 3;
    }

    tick(ledger) {
        if (!this.isActive) return;
        this.tickCount++;

        // 1. Swarm Maintenance
        this._maintainSquads();

        // 2. Predictive Analysis (Throttled)
        if (this.tickCount - this.lastSimulation > this.SIM_INTERVAL) {
            this._runStrategicSimulation(ledger);
            this.lastSimulation = this.tickCount;
        }

        // 3. Citadel Reinforcement
        if (this.citadel) {
             // Check if any zone is actively breached?
             // Citadel doesn't currently expose "breached" state easily without event listener,
             // but we can check thread intersections if we wanted.
             // For now, we rely on Sentinel reports.
        }
    }

    _maintainSquads() {
        const units = this.vanguard.getUnits();
        // Prune empty squads (handled by Vanguard usually, but good to check)

        // Auto-form squads if we have enough idle solo units
        const soloIdleUnits = units.filter(u => u.squadId === null && u.status === 'IDLE');

        if (soloIdleUnits.length >= this.SQUAD_SIZE) {
            // Take first 3
            const recruitIds = soloIdleUnits.slice(0, this.SQUAD_SIZE).map(u => u.id);
            this.vanguard.createSquad(recruitIds, 'V-WING');
            // Notify?
            // console.log(`LEGION: Formed Squad`);
        }
    }

    _runStrategicSimulation(ledger) {
        // We simulate the impact of a "Hypothetical Threat" in a random key region
        // to see if defenses are adequate.

        // Pick a random region target
        const keys = Object.keys(this.locations);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const targetLoc = this.locations[randomKey];

        // Hypothetical hostile thread
        const simThread = {
            intention: 'malice', // Sentinel triggers on this
            region: targetLoc.region || 'unknown',
            time: 'night',
            title: 'SIMULATED INCURSION'
        };

        const report = this.chronos.simulate(ledger.getThreads(), simThread);

        // If the simulation shows critical failure (DEFCON drop), we need to reinforce that area.
        if (report.projected.defcon < 3 || report.deltas.defcon < 0) {
            this._dispatchInterception(targetLoc.coordinates);
        }
    }

    _dispatchInterception(coordinates) {
        const squads = this.vanguard.getSquads();
        // Find a squad that is IDLE (Leader is IDLE)
        const readySquad = squads.find(s => s.leader && s.leader.status === 'IDLE');

        if (readySquad && readySquad.leader) {
            readySquad.leader.command(coordinates);
            // Wingmen will automatically follow due to Vanguard update
        }
    }

    // --- Public API ---

    getSquadStatus() {
        return this.vanguard.getSquads().map(s => ({
            id: s.id,
            leader: s.leaderId,
            size: s.memberIds.length,
            status: s.leader ? s.leader.status : 'OFFLINE',
            pos: s.leader ? { x: Math.floor(s.leader.x), y: Math.floor(s.leader.y) } : null
        }));
    }

    manualForm(unitIds) {
        return this.vanguard.createSquad(unitIds);
    }

    manualDisband(squadId) {
        return this.vanguard.disbandSquad(squadId);
    }

    manualEngage(squadId, targetCoords) {
        const squads = this.vanguard.getSquads();
        const squad = squads.find(s => s.id === squadId);
        if (squad && squad.leader) {
            squad.leader.command(targetCoords);
            return true;
        }
        return false;
    }
}

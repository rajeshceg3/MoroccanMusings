/**
 * Project STRATAGEM: Strategic Simulation Engine
 * Provides a sandbox environment for tactical war games ("Shadow Operations").
 * Allows operators to fork reality, test complex scenarios, and predict outcomes.
 */

export class StratagemEngine {
    /**
     * @param {Object} classes - Class constructors for engines
     * @param {Class} classes.TapestryLedger
     * @param {Class} classes.VanguardEngine
     * @param {Class} classes.CitadelEngine
     * @param {Class} classes.SentinelEngine
     * @param {Class} classes.HorizonEngine
     * @param {Object} locations - Location data for coordinate resolution
     */
    constructor(classes, locations) {
        this.classes = classes;
        this.locations = locations;

        this.simLedger = null;
        this.simVanguard = null;
        this.simCitadel = null;
        this.simSentinel = null;
        this.simHorizon = null;

        this.isActive = false;
        this.tickCount = 0;
        this.history = []; // { tick, defcon, balance, threatCount }
        this.activeScenario = null; // { id, objectives, constraints, timeLeft }
    }

    /**
     * Initializes the simulation sandbox by cloning the live state.
     * @param {Object} liveState - The current state of the application engines
     * @param {TapestryLedger} liveState.ledger
     * @param {VanguardEngine} liveState.vanguard
     * @param {CitadelEngine} liveState.citadel
     */
    async init(liveState) {
        this.isActive = true;
        this.tickCount = 0;
        this.history = [];
        this.activeScenario = null;

        await this._setupSandbox(
            liveState.ledger.getSnapshot(),
            liveState.citadel ? liveState.citadel.getSnapshot() : [],
            liveState.vanguard ? liveState.vanguard.getSnapshot() : []
        );
    }

    /**
     * Initializes the simulation from a static scenario definition (Project DAEDALUS).
     * @param {Object} scenarioData - The scenario definition
     */
    async loadScenario(scenarioData) {
        this.isActive = true;
        this.tickCount = 0;
        this.history = [];
        this.activeScenario = {
            ...scenarioData,
            timeLeft: scenarioData.constraints.timeLimit
        };

        await this._setupSandbox(
            scenarioData.initialThreads || [],
            [], // Citadel starts empty
            []  // Vanguard starts empty
        );
    }

    async _setupSandbox(threads, zones, units) {
        // 1. Clone Ledger (Deep Copy)
        this.simLedger = new this.classes.TapestryLedger('stratagem_sandbox');
        this.simLedger._save = async () => {}; // Disable LocalStorage IO
        await this.simLedger.loadSnapshot(threads);

        // 2. Clone Citadel
        this.simCitadel = new this.classes.CitadelEngine(this.locations);
        this.simCitadel.save = () => {};
        this.simCitadel.loadSnapshot(zones);

        // 3. Clone Horizon
        this.simHorizon = new this.classes.HorizonEngine();

        // 4. Clone Sentinel
        this.simSentinel = new this.classes.SentinelEngine(this.simHorizon);

        // 5. Clone Vanguard
        const mockAegis = {};
        this.simVanguard = new this.classes.VanguardEngine(this.simSentinel, mockAegis, this.simLedger);
        this.simVanguard.loadSnapshot(units);

        // Initial Assessment
        this._recordHistory();
    }

    /**
     * Advances the simulation by one tick.
     */
    step() {
        if (!this.isActive) return;

        this.tickCount++;

        // 1. Update Scenario Timer
        if (this.activeScenario) {
            this.activeScenario.timeLeft--;
            if (this.activeScenario.timeLeft <= 0) {
                this._endScenario('TIMEOUT');
                return;
            }
        }

        // 2. Update Units
        // Note: Vanguard uses the Ledger reference passed in constructor, which is our simLedger
        this.simVanguard.tick();

        // 3. Record State
        this._recordHistory();

        // 4. Check Objectives
        if (this.activeScenario) {
            this._checkObjectives();
        }
    }

    /**
     * Runs the simulation for a specified number of ticks.
     * @param {number} count
     */
    run(count = 50) {
        for (let i = 0; i < count; i++) {
            this.step();
        }
        return this.history[this.history.length - 1];
    }

    /**
     * Injects a simulated thread into the sandbox.
     * @param {Object} threadData - { intention, time, region, title, content }
     */
    async addSimulatedThread(threadData) {
        if (!this.isActive) return;

        // Mark as simulated so UI can style it differently if needed
        const data = { ...threadData, title: `[SIM] ${threadData.title}` };
        await this.simLedger.addThread(data);

        // Immediate reaction check
        // Vanguard units might react in next tick
        this._recordHistory();
    }

    /**
     * Deploys a simulated unit.
     * @param {string} type - 'SCOUT' | 'INTERCEPTOR'
     * @param {string} region
     */
    deploySimulatedUnit(type, region) {
        if (!this.isActive) return;
        this.simVanguard.deploy(type, region);
    }

    /**
     * Commands a simulated unit to move to a location.
     * @param {string} unitId
     * @param {Object} coords - {x, y}
     */
    commandUnit(unitId, coords) {
        if (!this.isActive || !this.simVanguard) return;
        const unit = this.simVanguard.getUnits().find(u => u.id === unitId);
        if (unit) {
            unit.command(coords);
        }
    }

    /**
     * Commits the current simulation state to the live reality.
     * WARNING: This overwrites the live state.
     * @param {TapestryLedger} liveLedger
     * @param {VanguardEngine} liveVanguard
     * @param {CitadelEngine} liveCitadel
     */
    async commit(liveLedger, liveVanguard, liveCitadel) {
        if (!this.isActive) return;

        // Restore IO methods? No, we just export data.
        const threads = this.simLedger.getSnapshot();
        const units = this.simVanguard.getSnapshot();
        const zones = this.simCitadel.getSnapshot();

        await liveLedger.loadSnapshot(threads);
        liveVanguard.loadSnapshot(units);
        if (liveCitadel) liveCitadel.loadSnapshot(zones);

        this.isActive = false;
    }

    abort() {
        this.isActive = false;
        this.activeScenario = null;
        this.simLedger = null;
        this.simVanguard = null;
        this.simCitadel = null;
    }

    _checkObjectives() {
        const report = this.simSentinel.assess(this.simLedger.getThreads());
        const analysis = this.simHorizon.analyze(this.simLedger.getThreads());

        let allMet = true;

        for (const obj of this.activeScenario.objectives) {
            let val = 0;
            switch(obj.type) {
                case 'DEFCON': val = report.defcon; break;
                case 'BALANCE': val = analysis.balanceScore; break;
                case 'THREAD_COUNT': val = this.simLedger.getThreads().length; break;
                case 'THREAT_COUNT': val = report.threats.length; break;
            }

            let passed = false;
            if (obj.comparator === '>=') passed = val >= obj.target;
            else if (obj.comparator === '<=') passed = val <= obj.target;
            else if (obj.comparator === '==') passed = val === obj.target;

            if (!passed) {
                allMet = false;
                break;
            }
        }

        if (allMet) {
            this._endScenario('WIN');
        }
    }

    _endScenario(result) {
        this.isActive = false; // Pause simulation, but keep data for viewing
        // Dispatch event for UI
        const event = new CustomEvent('stratagem-scenario-end', {
            detail: { result, scenario: this.activeScenario }
        });
        window.dispatchEvent(event);
    }

    /**
     * Returns the current simulation state for rendering.
     */
    getRenderState() {
        if (!this.isActive) return null;

        const threads = this.simLedger.getThreads();
        const report = this.simSentinel.assess(threads);

        return {
            threads: threads,
            units: this.simVanguard.getUnits(),
            zones: this.simCitadel.getZones(),
            threats: report.threats,
            threatZones: report.zones,
            defcon: report.defcon
        };
    }

    _recordHistory() {
        const threads = this.simLedger.getThreads();
        const report = this.simSentinel.assess(threads);
        const analysis = this.simHorizon.analyze(threads);

        this.history.push({
            tick: this.tickCount,
            defcon: report.defcon,
            balance: analysis.balanceScore,
            threatCount: report.threats.length
        });
    }
}

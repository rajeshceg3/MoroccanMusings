export class ChronosEngine {
    constructor(horizonEngine, SentinelClass) {
        this.horizon = horizonEngine;
        this.SentinelClass = SentinelClass;
    }

    /**
     * Simulates the impact of a proposed thread on the system.
     * @param {Array} currentThreads - The existing tapestry.
     * @param {Object} proposedThread - The thread to simulate ({intention, region, time}).
     * @returns {Object} A tactical forecast report.
     */
    simulate(currentThreads, proposedThread) {
        // 1. Create the hypothetical timeline
        // Deep copy to ensure no reference pollution
        const simulatedThreads = JSON.parse(JSON.stringify(currentThreads));

        // Add timestamp if missing (usually added by Ledger)
        const simThread = {
            ...proposedThread,
            timestamp: Date.now(),
            id: `sim-${Date.now()}`
        };
        simulatedThreads.push(simThread);

        // 2. Establish Baseline (Current State)
        // We use fresh instances to avoid mutating the live Sentinel
        const baselineSentinel = new this.SentinelClass(this.horizon);
        const baselineReport = baselineSentinel.assess(currentThreads);
        const baselineHorizon = this.horizon.analyze(currentThreads);

        // 3. Run Simulation (Future State)
        const simSentinel = new this.SentinelClass(this.horizon);
        const simReport = simSentinel.assess(simulatedThreads);
        const simHorizon = this.horizon.analyze(simulatedThreads);

        // 4. Calculate Deltas
        const defconDelta = simReport.defcon - baselineReport.defcon;
        const balanceDelta = simHorizon.balanceScore - baselineHorizon.balanceScore;

        // Determine dominance shift
        const dominanceShift = baselineHorizon.dominance.intention !== simHorizon.dominance.intention
            ? `${baselineHorizon.dominance.intention} ➤ ${simHorizon.dominance.intention}`
            : 'Unchanged';

        return {
            valid: true,
            proposed: simThread,
            baseline: {
                defcon: baselineReport.defcon,
                balance: baselineHorizon.balanceScore,
                dominance: baselineHorizon.dominance.intention
            },
            projected: {
                defcon: simReport.defcon,
                balance: simHorizon.balanceScore,
                dominance: simHorizon.dominance.intention
            },
            deltas: {
                defcon: defconDelta,
                balance: balanceDelta,
                dominance: dominanceShift
            },
            threats: simReport.threats, // Projected threats
            advisory: this._generateAdvisory(defconDelta, balanceDelta, simReport.defcon)
        };
    }

    _generateAdvisory(defconDelta, balanceDelta, finalDefcon) {
        if (finalDefcon === 1) return "CRITICAL WARNING: Action will trigger DEFCON 1.";
        if (defconDelta < 0) return "WARNING: This action escalates the threat level.";
        if (balanceDelta > 5) return "RECOMMENDED: Significantly improves pattern equilibrium.";
        if (balanceDelta < -10) return "CAUTION: Destabilizes the narrative harmony.";
        if (defconDelta > 0) return "TACTICAL ADVANTAGE: Reduces threat level.";
        return "Standard operation. Nominal impact.";
    }
}

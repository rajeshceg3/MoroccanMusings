import { locations } from './data.js';

/**
 * Project PROMETHEUS: Autonomous Strategic Synthesis
 *
 * This engine analyzes the Tapestry for narrative gaps and deploys Vanguard units
 * to synthesize new intelligence (draft threads) from the environment.
 */
export class PrometheusEngine {
    constructor(ledger, vanguard, mnemosyne, ui) {
        this.ledger = ledger;
        this.vanguard = vanguard;
        this.mnemosyne = mnemosyne;
        this.ui = ui;
        this.isOnline = false;
        this.drafts = [];
        this.cycleInterval = null;
        this.CYCLE_TIME = 15000; // 15 seconds for testing (slower in prod)
    }

    start() {
        if (this.isOnline) return;
        this.isOnline = true;
        this.ui.showNotification('PROMETHEUS UPLINK ESTABLISHED', 'success');
        this.cycleInterval = setInterval(() => this.cycle(), this.CYCLE_TIME);
    }

    stop() {
        this.isOnline = false;
        clearInterval(this.cycleInterval);
        this.ui.showNotification('PROMETHEUS UPLINK SEVERED', 'warning');
    }

    cycle() {
        if (!this.isOnline) return;

        // 1. Analyze for Gaps
        const gap = this.analyze();
        if (!gap) return;

        // 2. Plan Mission
        this.planMission(gap);
    }

    analyze() {
        const threads = this.ledger.getThreads();
        const counts = {
            serenity: 0,
            vibrancy: 0,
            awe: 0,
            legacy: 0
        };

        threads.forEach(t => {
            if (counts[t.intention] !== undefined) {
                counts[t.intention]++;
            }
        });

        // Find intention with lowest count
        let minCount = Infinity;
        let gapIntention = null;
        const intentions = Object.keys(counts);

        // Randomize iteration order to avoid bias when counts are equal
        intentions.sort(() => Math.random() - 0.5);

        intentions.forEach(intention => {
            if (counts[intention] < minCount) {
                minCount = counts[intention];
                gapIntention = intention;
            }
        });

        if (gapIntention) {
            // Find a random region/time for this intention that isn't well covered?
            // For simplicity, pick a random location associated with this intention.
            const candidates = Object.keys(locations).filter(k => k.startsWith(gapIntention));
            if (candidates.length > 0) {
                const targetKey = candidates[Math.floor(Math.random() * candidates.length)];
                return {
                    intention: gapIntention,
                    locationKey: targetKey,
                    location: locations[targetKey]
                };
            }
        }
        return null;
    }

    planMission(gap) {
        // Check if we already have a mission for this
        const units = this.vanguard.getUnits();
        const existing = units.find(u => u.mission && u.mission.type === 'SYNTHESIS' && u.mission.targetKey === gap.locationKey);
        if (existing) return;

        // Deploy a new unit
        // Determine region name from key (intention.region.time)
        const parts = gap.locationKey.split('.');
        const regionName = parts[1];

        const unit = this.vanguard.deploy('SCOUT', regionName);
        if (unit) {
            // Assign Mission
            // We need to extend VanguardUnit to handle this, or we handle it here by
            // "remote controlling" it.
            // Better to use the engine's command system if possible, or direct assignment.
            // We will add 'assignMission' to VanguardUnit in the next step.
            if (unit.assignMission) {
                unit.assignMission('SYNTHESIS', {
                    x: gap.location.coordinates.x,
                    y: gap.location.coordinates.y,
                    key: gap.locationKey,
                    location: gap.location
                });
                // this.ui.showNotification(`PROMETHEUS: Unit ${unit.id} deployed to ${gap.location.title}`, 'info');
            }
        }
    }

    synthesize(unit) {
        // Called by Vanguard Unit when it finishes synthesizing
        const mission = unit.mission;
        if (!mission || !mission.data) return;

        const loc = mission.data.location;
        const locKey = mission.data.key;
        const parts = locKey.split('.');

        // Generate Content
        // "Intelligence Report" style
        const intro = [
            "Intercepted signal trace.",
            "Resonance pattern detected.",
            "Local memory fragment recovered.",
            "Echo from the substrate."
        ][Math.floor(Math.random() * 4)];

        const sentences = loc.narrative.split('. ');
        const fragment = sentences[Math.floor(Math.random() * sentences.length)];

        const content = `${intro}\n\n"${fragment}."\n\nPROMETHEUS ANALYSIS: High probability of ${parts[0].toUpperCase()} resonance. Recommended for integration.`;

        const draft = {
            id: `DRAFT-${Date.now()}`,
            title: `SIGNAL: ${loc.title}`,
            intention: parts[0], // serenity, etc
            region: parts[1],
            time: parts[2],
            content: content,
            isDraft: true,
            coordinates: loc.coordinates,
            locationKey: locKey
        };

        this.drafts.push(draft);

        // Notify UI/App
        const event = new CustomEvent('prometheus-draft', { detail: draft });
        window.dispatchEvent(event);
    }

    getDrafts() {
        return this.drafts;
    }

    removeDraft(id) {
        const idx = this.drafts.findIndex(d => d.id === id);
        if (idx !== -1) {
            this.drafts.splice(idx, 1);
        }
    }
}

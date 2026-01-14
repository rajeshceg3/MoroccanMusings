
// Project AEGIS: Tactical Operations & Mission Control
// Enhances the Marq experience with structured strategic objectives and long-term progression.

export class AegisEngine {
    constructor(uiSystem, horizonEngine) {
        this.ui = uiSystem;
        this.horizon = horizonEngine;
        this.storageKey = 'marq_aegis_profile';

        // Mission Definitions
        this.missionRegistry = [
            {
                id: 'M001',
                codename: 'FIRST LIGHT',
                description: 'Weave a thread during the Dawn phase.',
                type: 'tutorial',
                criteria: (threads) => threads.some(t => t.time === 'dawn'),
                reward: 'Badge: Early Riser'
            },
            {
                id: 'M002',
                codename: 'THE TRINITY',
                description: 'Weave threads with 3 unique intentions.',
                type: 'tactical',
                criteria: (threads) => {
                    const unique = new Set(threads.map(t => t.intention));
                    return unique.size >= 3;
                },
                reward: 'Badge: Triad Strategist'
            },
            {
                id: 'M003',
                codename: 'EQUILIBRIUM',
                description: 'Maintain a Balance Score > 80% with at least 8 threads.',
                type: 'strategic',
                criteria: (threads, analysis) => {
                    return threads.length >= 8 && analysis.balanceScore > 80;
                },
                reward: 'Clearance: Level 2'
            },
            {
                id: 'M004',
                codename: 'GHOST HUNTER',
                description: 'Weave a thread that aligns with a predicted Horizon Ghost Vector.',
                type: 'intel',
                // This requires stateful tracking of previous ghosts, or checking if the LAST thread matched a prediction.
                // We will implement a check in the analyze function specifically for this.
                criteria: (threads, analysis, context) => {
                    return context && context.ghostMatched === true;
                },
                reward: 'Badge: Oracle'
            },
            {
                id: 'M005',
                codename: 'DEEP DIVE',
                description: 'Weave 5 threads in the same Region sequentially.',
                type: 'endurance',
                criteria: (threads) => {
                    if (threads.length < 5) return false;
                    let maxStreak = 0;
                    let currentStreak = 1;
                    for (let i = 1; i < threads.length; i++) {
                        if (threads[i].region === threads[i-1].region) {
                            currentStreak++;
                        } else {
                            maxStreak = Math.max(maxStreak, currentStreak);
                            currentStreak = 1;
                        }
                    }
                    return Math.max(maxStreak, currentStreak) >= 5;
                },
                reward: 'Badge: Local Guide'
            }
        ];

        this.profile = this._loadProfile();
        this.activeGhosts = []; // Track ghosts for "Ghost Hunter" validation
    }

    _loadProfile() {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
            try {
                return JSON.parse(raw);
            } catch (e) {
                console.error("Aegis Profile Corrupt. Resetting.");
            }
        }
        return {
            xp: 0,
            rank: 'Operative',
            completedMissions: [], // Array of IDs
            badges: []
        };
    }

    _saveProfile() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.profile));
    }

    // Main analysis loop, called after tapestry updates
    analyze(threads) {
        // 1. Get Horizon Analysis
        const analysis = this.horizon.analyze(threads);

        // 2. Check for Ghost Matches (Contextual)
        // We check if the *latest* thread matches any ghost we were tracking from the *previous* state.
        // But since we might reload, we can't rely solely on memory.
        // Ideally, we'd store "pending ghosts" in the ledger, but we want to be non-intrusive.
        // Simplification: We check if the latest thread matches the *current* projection of the *previous* subset (n-1)?
        // No, that's computationally expensive.
        // Let's rely on runtime tracking.
        let ghostMatched = false;
        if (threads.length > 0 && this.activeGhosts.length > 0) {
            const lastThread = threads[threads.length - 1];
            // Check if last thread matches any active ghost's intention and time
            ghostMatched = this.activeGhosts.some(g =>
                g.intention === lastThread.intention &&
                g.time === lastThread.time
            );
        }

        const context = { ghostMatched };

        // 3. Evaluate Missions
        const newlyCompleted = [];

        this.missionRegistry.forEach(mission => {
            if (this.profile.completedMissions.includes(mission.id)) return; // Already done

            if (mission.criteria(threads, analysis, context)) {
                this.profile.completedMissions.push(mission.id);
                this.profile.badges.push(mission.reward);
                newlyCompleted.push(mission);
                this.profile.xp += 100; // Arbitrary XP
            }
        });

        if (newlyCompleted.length > 0) {
            this._saveProfile();
            this._notifyCompletion(newlyCompleted);
        }

        // 4. Update Active Ghosts for NEXT turn
        // We project based on current threads to see what targets are available for the user
        this.activeGhosts = this.horizon.project(threads);

        return {
            profile: this.profile,
            analysis: analysis,
            completed: newlyCompleted
        };
    }

    _notifyCompletion(missions) {
        missions.forEach(m => {
            this.ui.showNotification(`MISSION ACCOMPLISHED: ${m.codename}`, 'success');
            // Play sound? (Handled by UI/Resonance if we had access, but UI notification is good)
        });
    }

    getReport() {
        const completed = this.missionRegistry.filter(m => this.profile.completedMissions.includes(m.id));
        const active = this.missionRegistry.filter(m => !this.profile.completedMissions.includes(m.id));

        return {
            rank: this.profile.rank,
            xp: this.profile.xp,
            completedCount: completed.length,
            totalCount: this.missionRegistry.length,
            active: active,
            badges: this.profile.badges
        };
    }

    renderDashboard(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const report = this.getReport();

        let html = `
            <div class="aegis-header">
                <div class="aegis-title">TACTICAL OPERATIONS CENTER</div>
                <div class="aegis-rank">${report.rank.toUpperCase()} // XP: ${report.xp}</div>
            </div>

            <div class="aegis-section">
                <div class="aegis-section-title">ACTIVE DIRECTIVES</div>
                <div class="mission-grid">
        `;

        if (report.active.length === 0) {
            html += `<div class="mission-card completed">ALL OBJECTIVES SECURED. STANDBY FOR NEW ORDERS.</div>`;
        } else {
            report.active.forEach(m => {
                html += `
                    <div class="mission-card">
                        <div class="mission-codename">${m.codename}</div>
                        <div class="mission-desc">${m.description}</div>
                        <div class="mission-reward">${m.reward}</div>
                    </div>
                `;
            });
        }

        html += `
                </div>
            </div>

            <div class="aegis-section">
                <div class="aegis-section-title">SERVICE RECORD</div>
                <div class="badge-grid">
        `;

        if (report.badges.length === 0) {
            html += `<div class="no-data">No commendations recorded.</div>`;
        } else {
            report.badges.forEach(b => {
                html += `<div class="badge-item">${b}</div>`;
            });
        }

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;
    }
}

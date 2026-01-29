export class AegisEngine {
constructor(uiSystem, horizonEngine) {
this.ui = uiSystem;
this.horizon = horizonEngine;
this.storageKey = 'marq_aegis_profile';
this.missionRegistry = [
{
id: 'M001',
codename: 'FIRST LIGHT',
description: 'Weave a thread during the Dawn phase.',
type: 'tutorial',
criteria: (threads) => threads.some((t) => t.time === 'dawn'),
reward: 'Badge: Early Riser'
},
{
id: 'M002',
codename: 'THE TRINITY',
description: 'Weave threads with 3 unique intentions.',
type: 'tactical',
criteria: (threads) => {
const unique = new Set(threads.map((t) => t.intention));
return unique.size >= 3;
},
reward: 'Badge: Triad Strategist'
},
{
id: 'M003',
codename: 'EQUILIBRIUM',
description:
'Maintain a Balance Score > 80% with at least 8 threads.',
type: 'strategic',
criteria: (threads, analysis) => {
return threads.length >= 8 && analysis.balanceScore > 80;
},
reward: 'Clearance: Level 2'
},
{
id: 'M004',
codename: 'GHOST HUNTER',
description:
'Weave a thread that aligns with a predicted Horizon Ghost Vector.',
type: 'intel',
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
if (threads[i].region === threads[i - 1].region) {
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
} catch {
console.error('Aegis Profile Corrupt. Resetting.');
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
analyze(threads) {
const analysis = this.horizon.analyze(threads);
let ghostMatched = false;
if (threads.length > 0 && this.activeGhosts.length > 0) {
const lastThread = threads[threads.length - 1];
ghostMatched = this.activeGhosts.some(
(g) =>
g.intention === lastThread.intention &&
g.time === lastThread.time
);
}
const context = { ghostMatched };
const newlyCompleted = [];
this.missionRegistry.forEach((mission) => {
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
this.activeGhosts = this.horizon.project(threads);
return {
profile: this.profile,
analysis: analysis,
completed: newlyCompleted
};
}
_notifyCompletion(missions) {
missions.forEach((m) => {
this.ui.showNotification(
`MISSION ACCOMPLISHED: ${m.codename}`,
'success'
);
});
}
getReport() {
const completed = this.missionRegistry.filter((m) =>
this.profile.completedMissions.includes(m.id)
);
const active = this.missionRegistry.filter(
(m) => !this.profile.completedMissions.includes(m.id)
);
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
container.textContent = '';
const report = this.getReport();
const header = document.createElement('div');
header.className = 'aegis-header';
const title = document.createElement('div');
title.className = 'aegis-title';
title.textContent = 'TACTICAL OPERATIONS CENTER';
const rank = document.createElement('div');
rank.className = 'aegis-rank';
rank.textContent = `${report.rank.toUpperCase()} // XP: ${report.xp}`;
header.appendChild(title);
header.appendChild(rank);
container.appendChild(header);
const activeSection = document.createElement('div');
activeSection.className = 'aegis-section';
const activeTitle = document.createElement('div');
activeTitle.className = 'aegis-section-title';
activeTitle.textContent = 'ACTIVE DIRECTIVES';
activeSection.appendChild(activeTitle);
const missionGrid = document.createElement('div');
missionGrid.className = 'mission-grid';
if (report.active.length === 0) {
const card = document.createElement('div');
card.className = 'mission-card completed';
card.textContent = 'ALL OBJECTIVES SECURED. STANDBY FOR NEW ORDERS.';
missionGrid.appendChild(card);
} else {
report.active.forEach((m) => {
const card = document.createElement('div');
card.className = 'mission-card';
const codename = document.createElement('div');
codename.className = 'mission-codename';
codename.textContent = m.codename;
const desc = document.createElement('div');
desc.className = 'mission-desc';
desc.textContent = m.description;
const reward = document.createElement('div');
reward.className = 'mission-reward';
reward.textContent = m.reward;
card.appendChild(codename);
card.appendChild(desc);
card.appendChild(reward);
missionGrid.appendChild(card);
});
}
activeSection.appendChild(missionGrid);
container.appendChild(activeSection);
const recordSection = document.createElement('div');
recordSection.className = 'aegis-section';
const recordTitle = document.createElement('div');
recordTitle.className = 'aegis-section-title';
recordTitle.textContent = 'SERVICE RECORD';
recordSection.appendChild(recordTitle);
const badgeGrid = document.createElement('div');
badgeGrid.className = 'badge-grid';
if (report.badges.length === 0) {
const noData = document.createElement('div');
noData.className = 'no-data';
noData.textContent = 'No commendations recorded.';
badgeGrid.appendChild(noData);
} else {
report.badges.forEach((b) => {
const badge = document.createElement('div');
badge.className = 'badge-item';
badge.textContent = b;
badgeGrid.appendChild(badge);
});
}
recordSection.appendChild(badgeGrid);
container.appendChild(recordSection);
}
}
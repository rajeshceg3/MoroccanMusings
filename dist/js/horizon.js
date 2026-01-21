export class HorizonEngine {
constructor() {
this.intentions = ['serenity', 'vibrancy', 'awe', 'legacy'];
this.times = ['dawn', 'midday', 'dusk', 'night'];
}
analyze(threads) {
if (!threads || threads.length === 0) {
return {
dominance: { intention: 'None', percent: 0 },
counts: {},
balanceScore: 0,
trajectory: 'Stationary'
};
}
const counts = { serenity: 0, vibrancy: 0, awe: 0, legacy: 0 };
let lastIntention = null;
let streak = 0;
threads.forEach((t) => {
if (counts[t.intention] !== undefined) {
counts[t.intention]++;
}
if (t.intention === lastIntention) {
streak++;
} else {
streak = 1;
}
lastIntention = t.intention;
});
let maxCount = 0;
let dominantIntention = 'None';
let total = threads.length;
for (const [key, value] of Object.entries(counts)) {
if (value > maxCount) {
maxCount = value;
dominantIntention = key;
}
}
const ideal = total / 4;
let totalDeviation = 0;
for (const val of Object.values(counts)) {
totalDeviation += Math.abs(val - ideal);
}
const balanceRatio = 1 - totalDeviation / (1.5 * total);
const balanceScore = Math.round(balanceRatio * 100);
return {
dominance: {
intention: dominantIntention,
percent: Math.round((maxCount / total) * 100)
},
counts: counts,
balanceScore: balanceScore,
streak: streak,
lastIntention: lastIntention
};
}
project(threads) {
if (!threads || threads.length === 0) return [];
const analysis = this.analyze(threads);
const projections = [];
const momentumIntention = analysis.lastIntention;
const momentumGhost = this._createGhost(
momentumIntention,
this._nextTime(threads[threads.length - 1].time),
'momentum',
'Trajectory: ' + (analysis.streak > 1 ? 'Accelerating' : 'Stable')
);
projections.push(momentumGhost);
let minCount = Infinity;
let leastIntention = null;
for (const [key, value] of Object.entries(analysis.counts)) {
if (value < minCount) {
minCount = value;
leastIntention = key;
}
}
if (leastIntention && leastIntention !== momentumIntention) {
const balanceGhost = this._createGhost(
leastIntention,
this._nextTime(threads[threads.length - 1].time), // Same time step, different choice
'balance',
'Strategy: Restore Balance'
);
projections.push(balanceGhost);
}
return projections;
}
_nextTime(currentTime) {
const idx = this.times.indexOf(currentTime);
return this.times[(idx + 1) % 4];
}
_createGhost(intention, time, type, label) {
const pseudoHash = this._generatePseudoHash(intention, time, type);
return {
id: `ghost-${Date.now()}-${Math.random()}`,
intention: intention,
time: time,
hash: pseudoHash,
isGhost: true,
type: type, // 'momentum' or 'balance'
label: label
};
}
_generatePseudoHash(intention, time, type) {
let str = `${intention}-${time}-${type}`;
let hash = 0;
for (let i = 0; i < str.length; i++) {
hash = (hash << 5) - hash + str.charCodeAt(i);
hash |= 0;
}
let hex = Math.abs(hash).toString(16);
while (hex.length < 64) hex += hex;
return hex;
}
}
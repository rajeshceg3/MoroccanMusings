export class SentinelEngine {
constructor(horizonEngine) {
this.horizon = horizonEngine;
this.status = 'STANDBY'; // STANDBY, ACTIVE, ALERT
this.defcon = 5; // 5 (Peace) to 1 (Critical)
this.threats = [];
this.lastScanTime = 0;
}
/**
* Main assessment loop.
* @param {Array} threads - The full tapestry ledger
* @returns {Object} Report including defcon, threats, and zones
*/
assess(threads) {
this.lastScanTime = Date.now();
this.threats = [];
if (!threads || threads.length === 0) {
this.defcon = 5;
this.status = 'STANDBY';
return this.getReport();
}
if (threads.length >= 5) {
const recent = threads.slice(-5);
const duration =
recent[recent.length - 1].timestamp - recent[0].timestamp;
if (duration < 60 * 1000) {
this.threats.push({
type: 'TEMPORAL_SURGE',
level: 'HIGH',
message: 'Rapid narrative acceleration detected.',
region: recent[recent.length - 1].region
});
}
}
const analysis = this.horizon.analyze(threads);
if (analysis.balanceScore < 25 && threads.length > 5) {
this.threats.push({
type: 'POLARIZATION',
level: 'MEDIUM',
message: `Extreme dominance of ${analysis.dominance.intention}. System equilibrium at risk.`,
region: 'global'
});
}
if (threads.length >= 3) {
const recent = threads.slice(-3);
const region = recent[0].region;
if (recent.every((t) => t.region === region)) {
this.threats.push({
type: 'LOCALIZED_CONGESTION',
level: 'LOW',
message: `High concentration in ${region} sector.`,
region: region
});
}
}
this._updateDefcon();
return this.getReport();
}
_updateDefcon() {
let maxSeverity = 0;
const severityMap = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
this.threats.forEach((t) => {
if (severityMap[t.level] > maxSeverity)
maxSeverity = severityMap[t.level];
});
this.defcon = 5 - maxSeverity;
if (this.defcon < 3) this.status = 'ALERT';
else if (this.defcon < 5) this.status = 'ACTIVE';
else this.status = 'STANDBY';
}
getReport() {
return {
status: this.status,
defcon: this.defcon,
threats: this.threats,
zones: this._generateThreatZones()
};
}
_generateThreatZones() {
const zones = [];
const regionCoords = {
coast: { x: 25, y: 55, r: 15 },
medina: { x: 60, y: 30, r: 12 },
sahara: { x: 75, y: 75, r: 20 },
kasbah: { x: 50, y: 50, r: 10 } // Generic center
};
this.threats.forEach((t) => {
if (t.region && t.region !== 'global' && regionCoords[t.region]) {
zones.push({
...regionCoords[t.region],
level: t.level,
type: t.type
});
}
});
return zones;
}
}
export class OracleEngine {
constructor(horizon, mapRenderer, locations) {
this.horizon = horizon;
this.mapRenderer = mapRenderer;
this.locations = locations;
this.activeMode = false;
this.baseCoordinates = {
serenity: { x: 25, y: 55, region: 'coast' }, // Essaouira
vibrancy: { x: 60, y: 30, region: 'medina' }, // Fes
awe: { x: 75, y: 75, region: 'sahara' }, // Merzouga
legacy: { x: 45, y: 15, region: 'atlas' } // Middle Atlas/North
};
}
toggle() {
this.activeMode = !this.activeMode;
return this.activeMode;
}
generateStrategicMap(threads) {
const projections = this.horizon.project(threads);
const strategicGhosts = projections.map((ghost) => {
const locationData = this._resolveLocation(
ghost.intention,
ghost.time
);
return {
...ghost,
coordinates: locationData.coordinates,
region: locationData.region,
locationTitle: locationData.title || 'Unknown Sector',
strategicValue: ghost.type === 'balance' ? 'High' : 'Normal'
};
});
return strategicGhosts;
}
_resolveLocation(intention, time) {
for (const [key, data] of Object.entries(this.locations)) {
const parts = key.split('.');
if (parts[0] === intention && parts[2] === time) {
return {
coordinates: data.coordinates,
region: parts[1],
title: data.title
};
}
}
const base = this.baseCoordinates[intention] || {
x: 50,
y: 50,
region: 'unknown'
};
return {
coordinates: { x: base.x, y: base.y },
region: base.region,
title: `${intention.charAt(0).toUpperCase() + intention.slice(1)} Outpost`
};
}
render(threads) {
if (!this.activeMode) return;
const ghosts = this.generateStrategicMap(threads);
this.mapRenderer.render(threads, this.locations, ghosts);
}
}
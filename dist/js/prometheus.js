export class PrometheusEngine {
constructor() {
this.canvas = document.createElement('canvas');
this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
this.width = 0;
this.height = 0;
this.palette = this._generatePalette();
}
_generatePalette() {
const palette = new Uint8ClampedArray(256 * 4);
for (let i = 0; i < 256; i++) {
let r, g, b, a;
const t = i / 255;
if (t < 0.2) {
r = 0;
g = 0;
b = 100 + t * 5 * 155;
a = t * 5 * 150; // Max alpha 150
} else if (t < 0.4) {
r = 0;
g = (t - 0.2) * 5 * 255;
b = 255;
a = 160;
} else if (t < 0.6) {
r = 0;
g = 255;
b = 255 - (t - 0.4) * 5 * 255;
a = 180;
} else if (t < 0.8) {
r = (t - 0.6) * 5 * 255;
g = 255;
b = 0;
a = 200;
} else {
r = 255;
g = 255 - (t - 0.8) * 5 * 255;
b = 0;
a = 220;
}
palette[i * 4] = r;
palette[i * 4 + 1] = g;
palette[i * 4 + 2] = b;
palette[i * 4 + 3] = a;
}
return palette;
}
/**
* Updates the heatmap based on threads.
* @param {Array} threads - The tapestry threads.
* @param {Object} locations - The location definitions.
* @param {number} width - Target width.
* @param {number} height - Target height.
*/
update(threads, locations, width, height) {
if (this.width !== width || this.height !== height) {
this.canvas.width = width;
this.canvas.height = height;
this.width = width;
this.height = height;
}
this.ctx.clearRect(0, 0, width, height);
if (!threads || threads.length === 0) return;
const padding = 40;
const mapW = width - padding * 2;
const mapH = height - padding * 2;
this.ctx.globalCompositeOperation = 'lighter';
threads.forEach((thread) => {
const coords = this._getThreadCoords(thread, locations);
if (!coords) return;
const jitter = this._calculateJitter(thread);
const x = ((coords.x + jitter.x) / 100) * mapW + padding;
const y = ((coords.y + jitter.y) / 100) * mapH + padding;
const radius = Math.max(20, width * 0.05);
const grad = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)'); // Center intensity
grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
this.ctx.fillStyle = grad;
this.ctx.beginPath();
this.ctx.arc(x, y, radius, 0, Math.PI * 2);
this.ctx.fill();
});
this._colorize();
}
_colorize() {
const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
const data = imageData.data;
const len = data.length;
for (let i = 0; i < len; i += 4) {
const intensity = data[i]; // 0-255
if (intensity > 0) {
const pIdx = Math.min(255, intensity) * 4;
data[i] = this.palette[pIdx];     // R
data[i + 1] = this.palette[pIdx + 1]; // G
data[i + 2] = this.palette[pIdx + 2]; // B
data[i + 3] = this.palette[pIdx + 3]; // A
}
}
this.ctx.putImageData(imageData, 0, 0);
}
_calculateJitter(thread) {
if (!thread.hash) return { x: 0, y: 0 };
const h1 = parseInt(thread.hash.charAt(thread.hash.length - 1), 16);
const h2 = parseInt(thread.hash.charAt(thread.hash.length - 2), 16);
const x = (h1 / 15 - 0.5) * 6;
const y = (h2 / 15 - 0.5) * 6;
return { x, y };
}
_getThreadCoords(thread, locations) {
const key = `${thread.intention}.${thread.region}.${thread.time}`;
if (locations[key]) return locations[key].coordinates;
if (thread.region === 'coast') return { x: 25, y: 55 };
if (thread.region === 'medina') return { x: 60, y: 30 };
if (thread.region === 'sahara') return { x: 75, y: 75 };
if (thread.region === 'kasbah') return { x: 50, y: 50 }; // Added kasbah
return { x: 50, y: 50 };
}
}
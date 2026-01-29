import { CryptoGuard } from './crypto-guard.js';
async function sha256(message) {
const msgBuffer = new TextEncoder().encode(message);
const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
const hashArray = Array.from(new Uint8Array(hashBuffer));
return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
export class TapestryLedger {
constructor(storageKey = 'marq_tapestry_threads') {
this.storageKey = storageKey;
this.crypto = new CryptoGuard();
this.isIntegrityVerified = false;
this.status = 'UNINITIALIZED'; // UNINITIALIZED, LOCKED, READY
this.threads = []; // Will be populated in initialize
}
_loadRaw() {
return localStorage.getItem(this.storageKey);
}
async _save() {
if (this.status === 'LOCKED') return; // Cannot save if locked
try {
let dataToSave = this.threads;
if (this.crypto.hasSession()) {
const password = this.crypto.getSessionPassword();
dataToSave = await this.crypto.encrypt(this.threads, password);
}
localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
} catch (e) {
console.error('Failed to save tapestry threads', e);
}
}
async initialize() {
const raw = this._loadRaw();
if (!raw) {
this.threads = [];
this.status = 'READY';
this.isIntegrityVerified = true;
return this.status;
}
let parsed;
try {
parsed = JSON.parse(raw);
} catch {
console.error('Corrupt storage.');
this.threads = [];
return 'READY';
}
if (parsed && parsed.tag === 'AEGIS_SECURE') {
this.status = 'LOCKED';
return 'LOCKED';
}
if (Array.isArray(parsed)) {
this.threads = parsed;
const needsMigration = this.threads.some((t) => !t.hash);
if (needsMigration) {
await this._migrateData();
}
await this.verifyIntegrity();
this.status = 'READY';
return 'READY';
}
console.error('Unknown storage format. Resetting.');
this.threads = [];
this.status = 'READY';
return 'READY';
}
async unlock(password) {
if (this.status !== 'LOCKED') return true;
const raw = this._loadRaw();
const encrypted = JSON.parse(raw);
try {
const decrypted = await this.crypto.decrypt(encrypted, password);
this.threads = decrypted;
this.crypto.setSessionPassword(password);
this.status = 'READY';
await this.verifyIntegrity();
return true;
} catch (e) {
console.error('Unlock failed:', e);
return false;
}
}
async lock() {
if (!this.crypto.hasSession()) return false; // Can't lock if no password known
this.status = 'LOCKED';
this.threads = []; // Clear memory
this.crypto.clearSession(); // Clear key from memory
return true;
}
async enableEncryption(password) {
this.crypto.setSessionPassword(password);
await this._save(); // Will encrypt now
}
async disableEncryption() {
if (!this.crypto.hasSession()) return false;
this.crypto.clearSession();
await this._save(); // Will save as plaintext
return true;
}
async _migrateData() {
const migratedThreads = [];
let previousHash = 'GENESIS_HASH';
for (const thread of this.threads) {
const timestamp = thread.timestamp || Date.now();
const intention = thread.intention || 'unknown';
const payload = {
intention: intention,
time: thread.time || 'midday',
region: thread.region || 'unknown',
title: thread.title || 'Legacy Thread',
timestamp: timestamp,
previousHash: previousHash
};
const hash = await sha256(JSON.stringify(payload));
migratedThreads.push({
id: hash.substring(0, 12),
...payload,
hash: hash
});
previousHash = hash;
}
this.threads = migratedThreads;
await this._save();
}
async verifyIntegrity() {
if (this.threads.length === 0) {
this.isIntegrityVerified = true;
return true;
}
let previousHash = 'GENESIS_HASH';
for (let i = 0; i < this.threads.length; i++) {
const thread = this.threads[i];
const dataString = JSON.stringify({
intention: thread.intention,
time: thread.time,
region: thread.region,
title: thread.title,
timestamp: thread.timestamp,
previousHash: previousHash
});
const calculatedHash = await sha256(dataString);
if (calculatedHash !== thread.hash) {
console.warn(
`Integrity failure at thread ${i}. Expected ${calculatedHash}, got ${thread.hash}`
);
thread.integrityStatus = 'corrupted';
this.isIntegrityVerified = false;
return false;
}
previousHash = thread.hash;
}
this.isIntegrityVerified = true;
return true;
}
async addThread(data) {
if (this.status === 'LOCKED') throw new Error('Ledger is Locked');
const previousHash =
this.threads.length > 0
? this.threads[this.threads.length - 1].hash
: 'GENESIS_HASH';
const timestamp = Date.now();
const payload = {
intention: data.intention,
time: data.time,
region: data.region,
title: data.title,
timestamp: timestamp,
previousHash: previousHash
};
const hash = await sha256(JSON.stringify(payload));
const thread = {
id: hash.substring(0, 12), // Short ID for UI
...payload,
hash: hash
};
this.threads.push(thread);
await this._save();
return thread;
}
async reload() {
const raw = this._loadRaw();
if (!raw) {
this.threads = [];
return;
}
let parsed;
try {
parsed = JSON.parse(raw);
} catch {
console.error('Corrupt storage during reload.');
return;
}
if (parsed && parsed.tag === 'AEGIS_SECURE') {
if (this.crypto.hasSession()) {
try {
const password = this.crypto.getSessionPassword();
const decrypted = await this.crypto.decrypt(
parsed,
password
);
this.threads = decrypted;
await this.verifyIntegrity();
} catch (e) {
console.error(
'Reload failed: Key mismatch or corruption',
e
);
this.status = 'LOCKED';
this.threads = [];
}
} else {
this.status = 'LOCKED';
this.threads = [];
}
} else {
if (Array.isArray(parsed)) {
this.threads = parsed;
await this.verifyIntegrity();
this.status = 'READY';
}
}
}
getThreads() {
if (this.status === 'LOCKED') return [];
return [...this.threads];
}
async importScroll(jsonString) {
if (this.status === 'LOCKED')
throw new Error('Unlock ledger to import');
try {
if (jsonString.length > 5 * 1024 * 1024)
throw new Error('File too large');
const imported = JSON.parse(jsonString);
if (!Array.isArray(imported))
throw new Error('Invalid format: Root must be an array');
if (imported.length > 1000)
throw new Error('Too many threads in scroll (Limit: 1000)');
const validSchema = imported.every((thread) =>
this._validateThreadSchema(thread)
);
if (!validSchema)
throw new Error(
'Invalid schema or data types in imported threads'
);
const tempLedger = new TapestryLedger('temp');
tempLedger.threads = imported;
const valid = await tempLedger.verifyIntegrity();
if (!valid)
throw new Error('Integrity check failed for imported scroll');
this.threads = imported;
await this._save();
return true;
} catch (e) {
console.error('Import failed', e);
throw e;
}
}
_validateThreadSchema(thread) {
if (typeof thread.id !== 'string') return false;
if (typeof thread.intention !== 'string') return false;
if (typeof thread.time !== 'string') return false;
if (typeof thread.region !== 'string') return false;
if (typeof thread.title !== 'string') return false;
if (typeof thread.hash !== 'string') return false;
if (typeof thread.timestamp !== 'number') return false;
if (thread.id.length > 32) return false;
if (thread.title.length > 100) return false;
if (thread.region.length > 50) return false;
const safeTextRegex = /^[a-zA-Z0-9\s\-_.,!?'"()]+$/;
if (!safeTextRegex.test(thread.title)) return false;
if (!safeTextRegex.test(thread.region)) return false;
const validIntentions = [
'serenity',
'vibrancy',
'awe',
'legacy',
'unknown'
];
const validTimes = ['dawn', 'midday', 'dusk', 'night', 'unknown'];
if (!validIntentions.includes(thread.intention)) return false;
if (!validTimes.includes(thread.time)) return false;
if (!/^[a-f0-9]{64}$/i.test(thread.hash)) return false;
return true;
}
exportScroll() {
if (this.status === 'LOCKED') throw new Error('Ledger Locked');
return JSON.stringify(this.threads, null, 2);
}
clear() {
if (this.status === 'LOCKED') return;
this.threads = [];
this._save();
}
}
export class MandalaRenderer {
constructor(canvas) {
this.canvas = canvas;
this.ctx = canvas.getContext('2d');
this.dpr = window.devicePixelRatio || 1;
this.selectedIndices = []; // Added for selection state
this.focusedIndex = -1; // For keyboard navigation
this.a11yContainer = document.createElement('div');
this.a11yContainer.id = 'tapestry-a11y-layer';
this.a11yContainer.style.cssText =
'position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; overflow:hidden; z-index:10;';
this.canvas.parentElement.appendChild(this.a11yContainer);
this.canvas.parentElement.style.position = 'relative'; // Ensure parent is positioned
this.resize();
}
resize() {
const rect = this.canvas.getBoundingClientRect();
this.canvas.width = rect.width * this.dpr;
this.canvas.height = rect.height * this.dpr;
this.ctx.scale(this.dpr, this.dpr);
this.width = rect.width;
this.height = rect.height;
}
setSelection(indices) {
this.selectedIndices = indices || [];
}
setFocus(index) {
this.focusedIndex = index;
}
render(threads, projections = []) {
const currentHash =
threads.length +
':' +
(threads.length > 0 ? threads[threads.length - 1].hash : '');
if (this.lastA11yHash !== currentHash) {
this.updateAccessibilityTree(threads); // Sync DOM
this.lastA11yHash = currentHash;
}
this.ctx.clearRect(0, 0, this.width, this.height);
const cx = this.width / 2;
const cy = this.height / 2;
const gradient = this.ctx.createRadialGradient(
cx,
cy,
10,
cx,
cy,
this.width / 1.5
);
gradient.addColorStop(0, '#1a1a1a');
gradient.addColorStop(1, '#000000');
this.ctx.fillStyle = gradient;
this.ctx.fillRect(0, 0, this.width, this.height);
if (threads.length === 0 && projections.length === 0) {
this.ctx.fillStyle = '#444';
this.ctx.font = 'italic 16px Inter';
this.ctx.textAlign = 'center';
this.ctx.fillText('The Loom awaits your thread.', cx, cy);
return;
}
this.ctx.save();
this.ctx.translate(cx, cy);
threads.forEach((thread, i) => {
if (!thread.hash) return;
this.drawMandalaLayer(thread, i, threads.length);
});
if (projections.length > 0) {
projections.forEach((ghost, i) => {
this.drawMandalaLayer(
ghost,
threads.length + i,
threads.length + projections.length
);
});
}
this.ctx.restore();
}
updateAccessibilityTree(threads) {
this.a11yContainer.innerHTML = '';
const cx = this.width / 2;
const cy = this.height / 2;
threads.forEach((thread, index) => {
const btn = document.createElement('button');
btn.setAttribute('type', 'button');
btn.setAttribute(
'aria-label',
`Thread ${index + 1}: ${thread.title} (${thread.intention}, ${thread.time})`
);
btn.setAttribute(
'aria-pressed',
this.selectedIndices.includes(index) ? 'true' : 'false'
);
const radius = 40 + index * 20;
btn.style.cssText = `
position: absolute;
left: ${cx / this.dpr}px;
top: ${cy / this.dpr - radius}px;
width: 20px;
height: 20px;
transform: translate(-50%, -50%);
pointer-events: auto; /* Allow interaction */
opacity: 0.01; /* Almost invisible but clickable for debugging/mouse */
cursor: pointer;
`;
btn.addEventListener('focus', () => {
this.setFocus(index);
this.render(threads); // Re-render to show focus
});
btn.addEventListener('blur', () => {
this.setFocus(-1);
this.render(threads);
});
btn.addEventListener('click', (e) => {
const event = new CustomEvent('tapestry-thread-click', {
detail: { index }
});
this.canvas.dispatchEvent(event);
});
this.a11yContainer.appendChild(btn);
});
}
drawMandalaLayer(thread, index, total) {
const hashVal = parseInt(thread.hash.substring(0, 8), 16);
const sides = 3 + (hashVal % 12); // 3 to 14 sides
const radius = 40 + index * 20; // Growing radius
const isSelected = this.selectedIndices.includes(index);
const isFocused = this.focusedIndex === index;
const isGhost = thread.isGhost === true;
const colors = {
serenity: '#4a7c82',
vibrancy: '#c67605',
awe: '#b85b47',
legacy: '#5d4037'
};
const baseColor = colors[thread.intention] || '#888';
if (isFocused) {
this.ctx.strokeStyle = '#55aaff'; // Focus color (Tactical Blue)
this.ctx.lineWidth = 4 + index * 0.1;
} else {
this.ctx.strokeStyle = isSelected ? '#ffffff' : baseColor;
this.ctx.lineWidth = isSelected
? 3 + index * 0.1
: isGhost
? 1
: 1 + index * 0.1;
}
if (isGhost) {
this.ctx.setLineDash([5, 5]); // Dashed line for ghosts
this.ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 500) * 0.2; // Pulsing
} else {
this.ctx.setLineDash([]);
this.ctx.globalAlpha = isSelected
? 1.0
: 0.6 + 0.4 * (index / total);
}
const rotationOffset = (hashVal % 360) * (Math.PI / 180);
this.ctx.beginPath();
for (let i = 0; i <= sides; i++) {
const theta = (i / sides) * 2 * Math.PI + rotationOffset;
const x = radius * Math.cos(theta);
const y = radius * Math.sin(theta);
if (i === 0) this.ctx.moveTo(x, y);
else this.ctx.lineTo(x, y);
}
this.ctx.closePath();
this.ctx.stroke();
const decor = (hashVal >> 4) % 3;
if (decor === 0 || isSelected) {
for (let i = 0; i < sides; i++) {
const theta = (i / sides) * 2 * Math.PI + rotationOffset;
this.ctx.fillStyle = isSelected ? '#ffffff' : baseColor;
this.ctx.beginPath();
this.ctx.arc(
radius * Math.cos(theta),
radius * Math.sin(theta),
isSelected ? 4 : 2,
0,
Math.PI * 2
);
this.ctx.fill();
}
}
}
getThreadIndexAt(x, y) {
const rect = this.canvas.getBoundingClientRect();
const cx = rect.width / 2;
const cy = rect.height / 2;
const dx = x - rect.left - cx;
const dy = y - rect.top - cy;
const distance = Math.sqrt(dx * dx + dy * dy);
const estimatedIndex = (distance - 40) / 20;
const roundedIndex = Math.round(estimatedIndex);
if (
Math.abs(estimatedIndex - roundedIndex) < 0.4 &&
roundedIndex >= 0
) {
return roundedIndex;
}
return -1;
}
}
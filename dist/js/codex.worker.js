const MAGIC = [0x4d, 0x41, 0x52, 0x51]; // 'MARQ'
const VERSION = 1;
const HEADER_SIZE = 9;
self.onmessage = async (e) => {
const { type, id, payload } = e.data;
try {
if (type === 'forge') {
const result = await forgeShard(
payload.data,
payload.carrierBitmap
);
self.postMessage({ type: 'success', id, result });
} else if (type === 'scan') {
const result = await scanShard(payload.imageBitmap);
self.postMessage({ type: 'success', id, result });
} else {
throw new Error(`Unknown worker command: ${type}`);
}
} catch (error) {
self.postMessage({ type: 'error', id, error: error.message });
}
};
async function forgeShard(data, carrierBitmap = null) {
const jsonString = JSON.stringify(data);
const textEncoder = new TextEncoder();
const payloadData = textEncoder.encode(jsonString);
const totalSize = HEADER_SIZE + payloadData.length;
const requiredPixels = Math.ceil((totalSize * 8) / 3);
let width, height;
let canvas;
let ctx;
if (carrierBitmap) {
width = carrierBitmap.width;
height = carrierBitmap.height;
canvas = new OffscreenCanvas(width, height);
ctx = canvas.getContext('2d');
ctx.drawImage(carrierBitmap, 0, 0);
} else {
const dim = Math.ceil(Math.sqrt(requiredPixels));
width = Math.max(dim + 20, 200);
height = Math.max(dim + 20, 200);
canvas = new OffscreenCanvas(width, height);
ctx = canvas.getContext('2d');
_generateCamouflage(ctx, width, height);
}
if (width * height < requiredPixels) {
throw new Error(
`Carrier image too small. Need ${requiredPixels} pixels, got ${width * height}.`
);
}
const imageData = ctx.getImageData(0, 0, width, height);
const pixels = imageData.data;
const fullData = new Uint8Array(totalSize);
fullData.set(MAGIC, 0);
fullData[4] = VERSION;
fullData[5] = (payloadData.length >> 24) & 0xff;
fullData[6] = (payloadData.length >> 16) & 0xff;
fullData[7] = (payloadData.length >> 8) & 0xff;
fullData[8] = payloadData.length & 0xff;
fullData.set(payloadData, 9);
let dataIndex = 0;
let bitIndex = 0;
for (let i = 0; i < pixels.length; i += 4) {
if (dataIndex >= totalSize) break;
for (let c = 0; c < 3; c++) {
if (dataIndex >= totalSize) break;
const byte = fullData[dataIndex];
const bit = (byte >> (7 - bitIndex)) & 1;
pixels[i + c] = (pixels[i + c] & 0xfe) | bit;
bitIndex++;
if (bitIndex === 8) {
bitIndex = 0;
dataIndex++;
}
}
}
ctx.putImageData(imageData, 0, 0);
const blob = await canvas.convertToBlob({ type: 'image/png' });
return blob;
}
async function scanShard(imageBitmap) {
const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
const ctx = canvas.getContext('2d');
ctx.drawImage(imageBitmap, 0, 0);
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
const pixels = imageData.data;
const headerBytes = _readBytes(pixels, 9);
if (
headerBytes[0] !== MAGIC[0] ||
headerBytes[1] !== MAGIC[1] ||
headerBytes[2] !== MAGIC[2] ||
headerBytes[3] !== MAGIC[3]
) {
throw new Error('Invalid Codex Shard: Magic header mismatch.');
}
const version = headerBytes[4];
if (version !== VERSION) {
throw new Error(`Unsupported Codex version: ${version}`);
}
const dataLength =
(headerBytes[5] << 24) |
(headerBytes[6] << 16) |
(headerBytes[7] << 8) |
headerBytes[8];
if (dataLength <= 0 || dataLength > 5000000) {
throw new Error(`Invalid data length: ${dataLength}`);
}
const payloadBytes = _readBytes(pixels, dataLength, 9);
const textDecoder = new TextDecoder();
const jsonString = textDecoder.decode(payloadBytes);
try {
return JSON.parse(jsonString);
} catch (e) {
throw new Error('Corrupted Shard: Invalid JSON payload.');
}
}
function _readBytes(pixels, length, byteOffset = 0) {
const result = new Uint8Array(length);
let currentByte = 0;
let bitsRead = 0;
let byteIndex = 0;
let totalBitsPassed = byteOffset * 8;
let pixelIndex = Math.floor(totalBitsPassed / 3) * 4;
let channelIndex = totalBitsPassed % 3;
for (let i = pixelIndex; i < pixels.length; i += 4) {
if (byteIndex >= length) break;
for (let c = channelIndex; c < 3; c++) {
if (byteIndex >= length) break;
const bit = pixels[i + c] & 1;
currentByte = (currentByte << 1) | bit;
bitsRead++;
if (bitsRead === 8) {
result[byteIndex] = currentByte;
byteIndex++;
currentByte = 0;
bitsRead = 0;
}
}
channelIndex = 0;
}
return result;
}
function _generateCamouflage(ctx, width, height) {
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, width, height);
const cols = ['#1a1a1a', '#222', '#0f0f0f', '#2a2a2a'];
for (let i = 0; i < width; i += 4) {
for (let j = 0; j < height; j += 4) {
if (Math.random() > 0.5) {
ctx.fillStyle = cols[Math.floor(Math.random() * cols.length)];
ctx.fillRect(i, j, 4, 4);
}
}
}
ctx.strokeStyle = '#333';
ctx.lineWidth = 1;
ctx.beginPath();
for (let i = 0; i < 10; i++) {
ctx.moveTo(0, Math.random() * height);
ctx.lineTo(width, Math.random() * height);
}
ctx.stroke();
ctx.fillStyle = '#c67605';
ctx.font = '10px monospace';
ctx.fillText('MARQ_SHARD_v1', 5, height - 5);
}
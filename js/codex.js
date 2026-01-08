
// The Crystalline Codex: Steganographic Data Transport
// Implements LSB steganography to embed Tapestry data into PNG shards.
// Protocol: MAGIC ('MARQ') + VERSION (1b) + LENGTH (4b) + PAYLOAD

export class CodexEngine {
    constructor() {
        this.MAGIC = [0x4D, 0x41, 0x52, 0x51]; // 'MARQ'
        this.VERSION = 1;
        this.HEADER_SIZE = 9; // 4 Magic + 1 Ver + 4 Len
    }

    // Embeds data into a carrier image
    // If no carrier provided, generates a noise pattern
    async forgeShard(data, carrierImage = null) {
        const jsonString = JSON.stringify(data);
        const payload = new TextEncoder().encode(jsonString);
        const totalSize = this.HEADER_SIZE + payload.length;
        const requiredPixels = Math.ceil((totalSize * 8) / 3); // 3 bits per pixel

        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');

        let width, height;

        if (carrierImage) {
            width = carrierImage.width;
            height = carrierImage.height;
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(carrierImage, 0, 0);
        } else {
            // Generate carrier
            const dim = Math.ceil(Math.sqrt(requiredPixels));
            // Add some padding and make it look nice (minimum 200x200)
            width = Math.max(dim + 20, 200);
            height = Math.max(dim + 20, 200);
            canvas.width = width;
            canvas.height = height;

            // Generate "Digital Noise" / Camouflage
            this._generateCamouflage(ctx, width, height);
        }

        if (width * height < requiredPixels) {
            throw new Error(`Carrier image too small. Need ${requiredPixels} pixels, got ${width * height}.`);
        }

        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        // Construct full binary stream
        const fullData = new Uint8Array(totalSize);
        fullData.set(this.MAGIC, 0);
        fullData[4] = this.VERSION;
        // Length (Big Endian)
        fullData[5] = (payload.length >> 24) & 0xFF;
        fullData[6] = (payload.length >> 16) & 0xFF;
        fullData[7] = (payload.length >> 8) & 0xFF;
        fullData[8] = payload.length & 0xFF;
        fullData.set(payload, 9);

        let dataIndex = 0;
        let bitIndex = 0;

        for (let i = 0; i < pixels.length; i += 4) {
            if (dataIndex >= totalSize) break;

            // Process R, G, B channels
            for (let c = 0; c < 3; c++) {
                if (dataIndex >= totalSize) break;

                const byte = fullData[dataIndex];
                const bit = (byte >> (7 - bitIndex)) & 1;

                // Clear LSB and set new bit
                pixels[i + c] = (pixels[i + c] & 0xFE) | bit;

                bitIndex++;
                if (bitIndex === 8) {
                    bitIndex = 0;
                    dataIndex++;
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/png');
        });
    }

    // Extracts data from a shard image
    async scanShard(imageFile) {
        const bitmap = await createImageBitmap(imageFile);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        ctx.drawImage(bitmap, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        // 1. Read Header
        // We need 9 bytes * 8 bits = 72 bits. 72 / 3 = 24 pixels.
        const headerBytes = this._readBytes(pixels, 9);

        // Validate Magic
        if (headerBytes[0] !== this.MAGIC[0] ||
            headerBytes[1] !== this.MAGIC[1] ||
            headerBytes[2] !== this.MAGIC[2] ||
            headerBytes[3] !== this.MAGIC[3]) {
            throw new Error("Invalid Codex Shard: Magic header mismatch.");
        }

        const version = headerBytes[4];
        if (version !== this.VERSION) {
            throw new Error(`Unsupported Codex version: ${version}`);
        }

        // Read Length (Big Endian)
        const dataLength = (headerBytes[5] << 24) | (headerBytes[6] << 16) | (headerBytes[7] << 8) | headerBytes[8];

        if (dataLength <= 0 || dataLength > 5000000) { // 5MB sanity check
             throw new Error(`Invalid data length: ${dataLength}`);
        }

        // 2. Read Payload
        // Offset is 9 bytes.
        const payloadBytes = this._readBytes(pixels, dataLength, 9);
        const jsonString = new TextDecoder().decode(payloadBytes);

        try {
            return JSON.parse(jsonString);
        } catch (e) {
            throw new Error("Corrupted Shard: Invalid JSON payload.");
        }
    }

    _readBytes(pixels, length, byteOffset = 0) {
        const result = new Uint8Array(length);
        let currentByte = 0;
        let bitsRead = 0;
        let byteIndex = 0;

        // Calculate start pixel/channel based on byteOffset
        // Total bits skipped = byteOffset * 8
        // Pixel index = floor(totalBits / 3) * 4
        // Channel index = totalBits % 3

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
            channelIndex = 0; // Reset for next pixel
        }

        return result;
    }

    _generateCamouflage(ctx, width, height) {
        // Create a "Cyber-Camo" pattern
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        const cols = ['#1a1a1a', '#222', '#0f0f0f', '#2a2a2a'];

        // Grid noise
        for(let i=0; i<width; i+=4) {
            for(let j=0; j<height; j+=4) {
                if (Math.random() > 0.5) {
                    ctx.fillStyle = cols[Math.floor(Math.random() * cols.length)];
                    ctx.fillRect(i, j, 4, 4);
                }
            }
        }

        // Overlay interference lines
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<10; i++) {
             ctx.moveTo(0, Math.random() * height);
             ctx.lineTo(width, Math.random() * height);
        }
        ctx.stroke();

        // Add visual marker
        ctx.fillStyle = '#c67605';
        ctx.font = '10px monospace';
        ctx.fillText('MARQ_SHARD_v1', 5, height - 5);
    }
}

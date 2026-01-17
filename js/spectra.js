export class SpectraEngine {
    constructor() {
        // Protocol Constants
        this.SAMPLE_RATE = 44100;
        this.HEADER = 'SPCT'; // Spectra
        this.VERSION = 1;

        // FSK Parameters
        this.BAUD_RATE = 200; // Bits per second (Conservative for reliability)
        this.MARK_FREQ = 18000; // 1 (Hz)
        this.SPACE_FREQ = 16000; // 0 (Hz)

        // Audio Context (Lazy init)
        this.ctx = null;
    }

    _init() {
        if (!this.ctx) {
            // Use OfflineAudioContext for rendering without hardware limitation if possible,
            // but for decoding we might need real-time or just math on arraybuffer.
            // For generation we use OfflineAudioContext.
        }
    }

    /**
     * Encodes data into a Sonic Shard (WAV Blob).
     * @param {Object} data - The JSON data to encode.
     * @returns {Promise<Blob>} - The WAV file.
     */
    async forgeSignal(data) {
        const jsonString = JSON.stringify(data);
        const textEncoder = new TextEncoder();
        const payloadBytes = textEncoder.encode(jsonString);

        // Construct Binary Message: Header (4) + Version (1) + Length (4) + Payload (N)
        const totalSize = 4 + 1 + 4 + payloadBytes.length;
        const messageBuffer = new Uint8Array(totalSize);

        // Header "SPCT"
        messageBuffer.set([0x53, 0x50, 0x43, 0x54], 0);
        // Version
        messageBuffer[4] = this.VERSION;
        // Length (Big Endian)
        const len = payloadBytes.length;
        messageBuffer[5] = (len >> 24) & 0xff;
        messageBuffer[6] = (len >> 16) & 0xff;
        messageBuffer[7] = (len >> 8) & 0xff;
        messageBuffer[8] = len & 0xff;
        // Payload
        messageBuffer.set(payloadBytes, 9);

        // Calculate Duration
        // Bits: totalSize * 8
        // Duration: bits / BAUD_RATE
        const totalBits = totalSize * 8;
        const signalDuration = Math.ceil(totalBits / this.BAUD_RATE);
        const duration = Math.max(signalDuration, 10); // Minimum 10 seconds for ambience

        // Create Offline Context
        const offlineCtx = new OfflineAudioContext(
            1,
            duration * this.SAMPLE_RATE,
            this.SAMPLE_RATE
        );

        // 1. Generate Ambience (Drone)
        this._generateDrone(offlineCtx, duration);

        // 2. Generate Data Signal (FSK)
        this._generateFSK(offlineCtx, messageBuffer, totalBits);

        // Render
        const audioBuffer = await offlineCtx.startRendering();

        // Convert to WAV
        return this._bufferToWav(audioBuffer);
    }

    /**
     * Decodes data from a Sonic Shard (ArrayBuffer).
     * @param {ArrayBuffer} arrayBuffer - The audio file data.
     * @returns {Promise<Object>} - The decoded JSON data.
     */
    async scanSignal(arrayBuffer) {
        // We need to decode the audio data first
        // Since we are in a browser, we can use a temporary AudioContext
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const pcmData = audioBuffer.getChannelData(0); // Mono is sufficient

        // Decode FSK
        return this._decodeFSK(pcmData, ctx.sampleRate);
    }

    _generateDrone(ctx, duration) {
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = 110; // A2

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 165; // E3 (Fifth)

        const noise = ctx.createBufferSource();
        const noiseBufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(
            1,
            noiseBufferSize,
            ctx.sampleRate
        );
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        noise.buffer = noiseBuffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;

        const masterGain = ctx.createGain();
        masterGain.gain.value = 0.5; // -6dB

        osc1.connect(masterGain);
        osc2.connect(masterGain);
        noise.connect(filter);
        filter.connect(masterGain);
        masterGain.connect(ctx.destination);

        osc1.start(0);
        osc2.start(0);
        noise.start(0);

        // Fade out
        masterGain.gain.setValueAtTime(0.5, duration - 1);
        masterGain.gain.linearRampToValueAtTime(0, duration);
    }

    _generateFSK(ctx, messageBuffer, totalBits) {
        const osc = ctx.createOscillator();
        osc.type = 'sine'; // Pure sine for FSK

        const gain = ctx.createGain();
        gain.gain.value = 0.05; // Low volume high freq signal (subliminal-ish)

        // Schedule Frequencies
        let currentTime = 0;
        let bitIndex = 0;
        let byteIndex = 0;

        // Initial silence/sync
        osc.frequency.setValueAtTime(this.SPACE_FREQ, 0);

        for (let i = 0; i < totalBits; i++) {
            const byte = messageBuffer[byteIndex];
            const bit = (byte >> (7 - bitIndex)) & 1;

            const freq = bit === 1 ? this.MARK_FREQ : this.SPACE_FREQ;
            osc.frequency.setValueAtTime(freq, currentTime);

            currentTime += 1 / this.BAUD_RATE;
            bitIndex++;
            if (bitIndex === 8) {
                bitIndex = 0;
                byteIndex++;
            }
        }

        // Turn off signal after data
        gain.gain.setValueAtTime(0.05, currentTime);
        gain.gain.setValueAtTime(0, currentTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
        osc.stop(currentTime + 0.5);
    }

    _decodeFSK(pcmData, sampleRate) {
        // Let's use simple correlation over the bit period window

        const samplesPerBit = Math.floor(sampleRate / this.BAUD_RATE);
        const totalSamples = pcmData.length;

        // Phase 1: Find Sync / Start
        // We look for the "SPCT" header (0x53 0x50 0x43 0x54)

        // Robustness hack: Look for strong 18k or 16k signal presence
        // We scan through the buffer in bit-sized chunks

        let bitStream = [];

        const correlate = (startSample, freq) => {
            let sumI = 0;
            let sumQ = 0;
            const omega = (2 * Math.PI * freq) / sampleRate;

            for (let i = 0; i < samplesPerBit; i++) {
                const s = pcmData[startSample + i];
                sumI += s * Math.cos(omega * i);
                sumQ += s * Math.sin(omega * i);
            }
            return Math.sqrt(sumI * sumI + sumQ * sumQ);
        };

        // Read bits
        const maxBits = Math.floor(totalSamples / samplesPerBit);

        for (let i = 0; i < maxBits; i++) {
            const sampleIdx = i * samplesPerBit;
            if (sampleIdx + samplesPerBit > totalSamples) break;

            const markEnergy = correlate(sampleIdx, this.MARK_FREQ);
            const spaceEnergy = correlate(sampleIdx, this.SPACE_FREQ);

            if (markEnergy > spaceEnergy) {
                bitStream.push(1);
            } else {
                bitStream.push(0);
            }
        }

        // Convert bits to bytes
        const bytes = [];
        for (let i = 0; i < bitStream.length; i += 8) {
            let b = 0;
            for (let j = 0; j < 8; j++) {
                if (i + j < bitStream.length) {
                    b = (b << 1) | bitStream[i + j];
                }
            }
            bytes.push(b);
        }

        // Validate Header
        // Header: S P C T (83 80 67 84)
        if (
            bytes[0] !== 0x53 ||
            bytes[1] !== 0x50 ||
            bytes[2] !== 0x43 ||
            bytes[3] !== 0x54
        ) {
            throw new Error(
                'Invalid Sonic Shard: Header not found or signal corrupted.'
            );
        }

        const version = bytes[4];
        if (version !== this.VERSION)
            throw new Error('Unsupported Protocol Version');

        const len =
            (bytes[5] << 24) | (bytes[6] << 16) | (bytes[7] << 8) | bytes[8];

        if (len <= 0 || len > 1000000)
            throw new Error('Invalid payload length');

        const payloadBytes = new Uint8Array(bytes.slice(9, 9 + len));
        const textDecoder = new TextDecoder();
        const jsonString = textDecoder.decode(payloadBytes);

        try {
            return JSON.parse(jsonString);
        } catch (e) {
            throw new Error('Corrupted Signal: Invalid JSON');
        }
    }

    _bufferToWav(abuffer) {
        const numOfChan = abuffer.numberOfChannels;
        const length = abuffer.length * numOfChan * 2 + 44;
        const buffer = new ArrayBuffer(length);
        const view = new DataView(buffer);
        const channels = [];
        let i,
            sample,
            offset = 0,
            pos = 0;

        // write string
        function writeString(s) {
            for (let i = 0; i < s.length; i++) {
                view.setUint8(pos++, s.charCodeAt(i));
            }
        }

        writeString('RIFF');
        view.setUint32(pos, length - 8, true);
        pos += 4;
        writeString('WAVE');
        writeString('fmt ');
        view.setUint32(pos, 16, true);
        pos += 4;
        view.setUint16(pos, 1, true);
        pos += 2; // PCM
        view.setUint16(pos, numOfChan, true);
        pos += 2;
        view.setUint32(pos, abuffer.sampleRate, true);
        pos += 4;
        view.setUint32(pos, abuffer.sampleRate * 2 * numOfChan, true);
        pos += 4;
        view.setUint16(pos, numOfChan * 2, true);
        pos += 2;
        view.setUint16(pos, 16, true);
        pos += 2; // 16-bit

        writeString('data');
        view.setUint32(pos, length - pos - 4, true);
        pos += 4;

        for (i = 0; i < abuffer.numberOfChannels; i++)
            channels.push(abuffer.getChannelData(i));

        while (pos < length) {
            for (i = 0; i < numOfChan; i++) {
                sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample =
                    (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }
}

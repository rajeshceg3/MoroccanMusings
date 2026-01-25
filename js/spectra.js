export class SpectraEngine {
    constructor() {
        // Protocol Constants
        this.SAMPLE_RATE = 44100;
        this.HEADER = 'SPCT'; // Spectra
        this.VERSION = 1;

        // FSK Parameters
        this.BAUD_RATE = 200; // File-based safe speed
        this.LIVE_BAUD_RATE = 40; // Slower for air-gap reliability
        this.MARK_FREQ = 18000; // 1 (Hz)
        this.SPACE_FREQ = 16000; // 0 (Hz)

        // Audio Context (Lazy init)
        this.ctx = null;
        this.analyser = null;
        this.microphone = null;
    }

    _init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    /**
     * Encodes data into a Sonic Shard (WAV Blob).
     * @param {Object} data - The JSON data to encode.
     * @returns {Promise<Blob>} - The WAV file.
     */
    async forgeSignal(data) {
        const payload = this._preparePayload(data);
        const totalBits = payload.totalSize * 8;

        // Duration logic for file
        const signalDuration = Math.ceil(totalBits / this.BAUD_RATE);
        const duration = Math.max(signalDuration, 10);

        const offlineCtx = new OfflineAudioContext(
            1,
            duration * this.SAMPLE_RATE,
            this.SAMPLE_RATE
        );

        this._generateDrone(offlineCtx, duration);
        this._generateFSK(offlineCtx, payload.buffer, totalBits, this.BAUD_RATE);

        const audioBuffer = await offlineCtx.startRendering();
        return this._bufferToWav(audioBuffer);
    }

    /**
     * Broadcasts data via real-time FSK audio.
     * @param {Object} data - The JSON data to broadcast.
     * @returns {Promise<void>}
     */
    async broadcastSignal(data) {
        this._init();
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }

        const payload = this._preparePayload(data);
        const totalBits = payload.totalSize * 8;

        // Generate FSK on the live context with Leader Tone
        return this._playLiveFSK(this.ctx, payload.buffer, totalBits, this.LIVE_BAUD_RATE);
    }

    /**
     * Listens for incoming signals via Microphone.
     * Returns a function to STOP listening.
     * @param {Function} onData - Callback when valid JSON is received.
     * @param {Function} onStatus - Callback (status, metadata).
     * @returns {Promise<Function>} - Stop function.
     */
    async listenSignal(onData, onStatus) {
        this._init();
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }});

            this.microphone = this.ctx.createMediaStreamSource(stream);
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 2048;
            this.microphone.connect(this.analyser);

            // Buffer for recording
            const recordingBuffer = [];
            const processor = this.ctx.createScriptProcessor(4096, 1, 1);

            this.microphone.connect(processor);
            processor.connect(this.ctx.destination); // Required for Chrome to fire events

            let isProcessing = false;

            processor.onaudioprocess = (e) => {
                const input = e.inputBuffer.getChannelData(0);
                // Copy to recording buffer
                // We keep a rolling window of ~30 seconds max to avoid memory issues
                // 44100 * 30 = 1.3M floats (5MB). Safe.
                for (let i = 0; i < input.length; i++) {
                    recordingBuffer.push(input[i]);
                }

                // Limit buffer size
                if (recordingBuffer.length > 44100 * 60) {
                     recordingBuffer.splice(0, input.length); // Rotate
                }

                // Check for signal presence (simple energy check at high freq)
                // We delegate visualizer to UI via getAnalyser()
            };

            // Polling scanner (Try to decode every 2 seconds)
            const scannerInterval = setInterval(async () => {
                if (isProcessing) return;
                isProcessing = true;

                try {
                    // Quick scan of the last N seconds
                    const result = this._decodeFSK(recordingBuffer, this.ctx.sampleRate, this.LIVE_BAUD_RATE);
                    if (result) {
                        onData(result);
                        stop();
                    }
                } catch {
                    // Ignore decoding errors (noise)
                } finally {
                    isProcessing = false;
                }
            }, 2000);

            onStatus('listening');

            const stop = () => {
                clearInterval(scannerInterval);
                if (this.microphone) {
                    this.microphone.disconnect();
                    stream.getTracks().forEach(t => t.stop());
                }
                if (processor) processor.disconnect();
                onStatus('stopped');
            };

            return stop;

        } catch (e) {
            console.error("Microphone Access Denied", e);
            throw e;
        }
    }

    getAnalyser() {
        return this.analyser;
    }

    // --- Helpers ---

    _preparePayload(data) {
        const jsonString = JSON.stringify(data);
        const textEncoder = new TextEncoder();
        const payloadBytes = textEncoder.encode(jsonString);

        // Header + Version + Length + Payload
        const totalSize = 4 + 1 + 4 + payloadBytes.length;
        const messageBuffer = new Uint8Array(totalSize);

        messageBuffer.set([0x53, 0x50, 0x43, 0x54], 0); // SPCT
        messageBuffer[4] = this.VERSION;
        const len = payloadBytes.length;
        messageBuffer[5] = (len >> 24) & 0xff;
        messageBuffer[6] = (len >> 16) & 0xff;
        messageBuffer[7] = (len >> 8) & 0xff;
        messageBuffer[8] = len & 0xff;
        messageBuffer.set(payloadBytes, 9);

        return { buffer: messageBuffer, totalSize };
    }

    _playLiveFSK(ctx, messageBuffer, totalBits, baudRate) {
        return new Promise((resolve) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            const gain = ctx.createGain();
            gain.gain.value = 0.8;

            let currentTime = ctx.currentTime + 0.1;

            // Leader Tone (2s Space)
            osc.frequency.setValueAtTime(this.SPACE_FREQ, ctx.currentTime);
            osc.frequency.setValueAtTime(this.SPACE_FREQ, currentTime);
            currentTime += 2.0;

            // Sync (1 bit Mark)
            osc.frequency.setValueAtTime(this.MARK_FREQ, currentTime);
            currentTime += (1 / baudRate);

            let bitIndex = 0;
            let byteIndex = 0;

            for (let i = 0; i < totalBits; i++) {
                const byte = messageBuffer[byteIndex];
                const bit = (byte >> (7 - bitIndex)) & 1;

                const freq = bit === 1 ? this.MARK_FREQ : this.SPACE_FREQ;
                osc.frequency.setValueAtTime(freq, currentTime);

                currentTime += 1 / baudRate;
                bitIndex++;
                if (bitIndex === 8) {
                    bitIndex = 0;
                    byteIndex++;
                }
            }

            gain.gain.setValueAtTime(0.8, currentTime);
            gain.gain.linearRampToValueAtTime(0, currentTime + 0.1);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.onended = resolve;
            osc.start(0);
            osc.stop(currentTime + 0.2);
        });
    }

    _generateDrone(ctx, duration) {
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = 110;

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 165;

        const noise = ctx.createBufferSource();
        const noiseBufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, noiseBufferSize, ctx.sampleRate);
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
        masterGain.gain.value = 0.5;

        osc1.connect(masterGain);
        osc2.connect(masterGain);
        noise.connect(filter);
        filter.connect(masterGain);
        masterGain.connect(ctx.destination);

        osc1.start(0);
        osc2.start(0);
        noise.start(0);

        masterGain.gain.setValueAtTime(0.5, duration - 1);
        masterGain.gain.linearRampToValueAtTime(0, duration);
    }

    _generateFSK(ctx, messageBuffer, totalBits, baudRate) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        const gain = ctx.createGain();
        gain.gain.value = 0.05;

        let currentTime = 0;
        let bitIndex = 0;
        let byteIndex = 0;

        osc.frequency.setValueAtTime(this.SPACE_FREQ, 0);

        for (let i = 0; i < totalBits; i++) {
            const byte = messageBuffer[byteIndex];
            const bit = (byte >> (7 - bitIndex)) & 1;
            const freq = bit === 1 ? this.MARK_FREQ : this.SPACE_FREQ;
            osc.frequency.setValueAtTime(freq, currentTime);

            currentTime += 1 / baudRate;
            bitIndex++;
            if (bitIndex === 8) {
                bitIndex = 0;
                byteIndex++;
            }
        }
        gain.gain.setValueAtTime(0.05, currentTime);
        gain.gain.setValueAtTime(0, currentTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
        osc.stop(currentTime + 0.5);
    }

    /**
     * Decodes data from a Sonic Shard (ArrayBuffer).
     * @param {ArrayBuffer} arrayBuffer - The audio file data.
     * @returns {Promise<Object>} - The decoded JSON data.
     */
    async scanSignal(arrayBuffer) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const pcmData = audioBuffer.getChannelData(0);
        return this._decodeFSK(pcmData, ctx.sampleRate, this.BAUD_RATE);
    }

    _decodeFSK(pcmData, sampleRate, baudRate) {
        // Robust Decoding Logic (Correlation-based)
        const samplesPerBitFloat = sampleRate / baudRate;
        const samplesPerBit = Math.floor(samplesPerBitFloat);
        const totalSamples = pcmData.length;
        let bitStream = [];

        // Pre-calculate coefficients
        // w = 2*pi*f/sr
        const wMark = (2 * Math.PI * this.MARK_FREQ) / sampleRate;
        const wSpace = (2 * Math.PI * this.SPACE_FREQ) / sampleRate;

        // Optimized Goertzel-ish correlation
        const correlate = (startSample, freqOmega) => {
            let sumI = 0;
            let sumQ = 0;
            for (let i = 0; i < samplesPerBit; i++) {
                if (startSample + i >= totalSamples) break;
                const s = pcmData[startSample + i];
                sumI += s * Math.cos(freqOmega * i);
                sumQ += s * Math.sin(freqOmega * i);
            }
            return Math.sqrt(sumI * sumI + sumQ * sumQ);
        };

        // Phase Sync: We assume the buffer might contain the signal anywhere.
        // We need to find the "SPCT" header: 01010011 01010000 01000011 01010100
        // Or simplified: Just scan bits and look for the byte sequence.

        // 1. Bit Extraction
        // We use float index to prevent drift over long messages
        const maxBits = Math.floor(totalSamples / samplesPerBitFloat);
        for (let i = 0; i < maxBits; i++) {
            const sampleIdx = Math.floor(i * samplesPerBitFloat);
            const markE = correlate(sampleIdx, wMark);
            const spaceE = correlate(sampleIdx, wSpace);
            bitStream.push(markE > spaceE ? 1 : 0);
        }

        // 2. Stream Search for Header
        // SPCT = 0x53 0x50 0x43 0x54
        // Binary: 01010011 01010000 01000011 01010100

        // Convert bitStream to a string for regex search? Or rolling window.
        // There might be bit-slip, but for now assuming aligned bits (simple)
        // If we wanted to be robust against phase shift, we'd slide sample-by-sample, which is expensive.
        // Compromise: We scanned aligned to samplesPerBit. If the leader tone works, we are mostly aligned?
        // Actually, without precise start detection, the bit grid is arbitrary.
        // *Improvement*: Scan for the Start Bit (Transition from Space to Mark) in the PCM data first?

        // Let's rely on the bit stream for now. If it fails, we might need a sliding correlator.

        const bytes = [];
        let headerIdx = -1;

        // Convert to bytes
        for (let i = 0; i < bitStream.length - 32; i++) {
            // Check for SPCT
            if (this._matchHeader(bitStream, i)) {
                headerIdx = i;
                break;
            }
        }

        if (headerIdx === -1) {
             // Try to shift by half-bit? No, too complex.
             // Assume failure if not found.
             return null;
        }

        // Decode from header index
        for (let i = headerIdx; i < bitStream.length; i += 8) {
             let b = 0;
             for (let j = 0; j < 8; j++) {
                 if (i + j < bitStream.length) {
                     b = (b << 1) | bitStream[i + j];
                 }
             }
             bytes.push(b);
        }

        // Validate structure
        const version = bytes[4];
        if (version !== this.VERSION) return null; // Wrong version

        const len = (bytes[5] << 24) | (bytes[6] << 16) | (bytes[7] << 8) | bytes[8];
        if (len <= 0 || len > 50000 || 9 + len > bytes.length) return null;

        const payloadBytes = new Uint8Array(bytes.slice(9, 9 + len));
        const textDecoder = new TextDecoder();
        try {
            const jsonString = textDecoder.decode(payloadBytes);
            return JSON.parse(jsonString);
        } catch {
            return null;
        }
    }

    _matchHeader(bits, offset) {
        // SPCT: 0x53, 0x50, 0x43, 0x54
        const pattern = [
            0,1,0,1,0,0,1,1, // S
            0,1,0,1,0,0,0,0, // P
            0,1,0,0,0,0,1,1, // C
            0,1,0,1,0,1,0,0  // T
        ];
        for(let k=0; k<32; k++) {
            if(bits[offset+k] !== pattern[k]) return false;
        }
        return true;
    }

    _bufferToWav(abuffer) {
        const numOfChan = abuffer.numberOfChannels;
        const length = abuffer.length * numOfChan * 2 + 44;
        const buffer = new ArrayBuffer(length);
        const view = new DataView(buffer);
        const channels = [];
        let i, sample, offset = 0, pos = 0;

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
        pos += 2;
        view.setUint16(pos, numOfChan, true);
        pos += 2;
        view.setUint32(pos, abuffer.sampleRate, true);
        pos += 4;
        view.setUint32(pos, abuffer.sampleRate * 2 * numOfChan, true);
        pos += 4;
        view.setUint16(pos, numOfChan * 2, true);
        pos += 2;
        view.setUint16(pos, 16, true);
        pos += 2;

        writeString('data');
        view.setUint32(pos, length - pos - 4, true);
        pos += 4;

        for (i = 0; i < abuffer.numberOfChannels; i++)
            channels.push(abuffer.getChannelData(i));

        while (pos < length) {
            for (i = 0; i < numOfChan; i++) {
                sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }
}

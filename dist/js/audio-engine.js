export class ResonanceEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.ambienceNodes = [];
        this.isMuted = false;
        this.currentIntention = null;
        this.currentTime = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            console.warn('AudioContext not supported in this environment.');
            return;
        }
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.ctx.destination);
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolume(value) {
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(
                value,
                this.ctx.currentTime,
                0.1
            );
        }
    }

    // --- Procedural Generation Logic ---

    _createOscillator(type, freq, detune = 0) {
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        osc.detune.value = detune;
        return osc;
    }

    _createNoiseBuffer() {
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
        const buffer = this.ctx.createBuffer(
            1,
            bufferSize,
            this.ctx.sampleRate
        );
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    startAmbience(intention, time) {
        this.stopAmbience(); // Clear previous
        this.currentIntention = intention;
        this.currentTime = time;

        if (!this.ctx) this.init();
        if (!this.ctx) return; // Graceful exit if init failed
        this.resume();

        const now = this.ctx.currentTime;
        const rootFreq = 110; // A2

        // --- 1. Base Drone (Intention) ---
        // Serenity: Sine waves, stable
        // Vibrancy: Triangle/Saw, slight modulation
        // Awe: Low Sine + Sub, deep
        // Legacy: Square (filtered), dusty

        let oscType = 'sine';
        let harmonics = [1, 1.5]; // Perfect 5th default

        if (intention === 'serenity') {
            oscType = 'sine';
            harmonics = [1, 2, 3]; // Octaves & Fifth
        } else if (intention === 'vibrancy') {
            oscType = 'triangle';
            harmonics = [1, 1.25, 1.5]; // Major triad
        } else if (intention === 'awe') {
            oscType = 'sine';
            harmonics = [0.5, 1, 1.5]; // Sub + Root + 5th
        } else if (intention === 'legacy') {
            oscType = 'sawtooth'; // Filtered heavily later
            harmonics = [1, 1.2, 1.5]; // Minor ish
        }

        harmonics.forEach((ratio, i) => {
            const osc = this._createOscillator(
                oscType,
                rootFreq * ratio,
                i * 2
            );
            const gain = this.ctx.createGain();
            gain.gain.value = 0;

            // --- 2. Atmospheric Filter (Time) ---
            const filter = this.ctx.createBiquadFilter();

            if (time === 'dawn') {
                filter.type = 'highpass';
                filter.frequency.value = 200; // Remove mud
            } else if (time === 'midday') {
                filter.type = 'peaking';
                filter.frequency.value = 1000;
            } else if (time === 'dusk') {
                filter.type = 'lowpass';
                filter.frequency.value = 400; // Warm
            } else if (time === 'night') {
                filter.type = 'lowpass';
                filter.frequency.value = 150; // Dark
            }

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            gain.gain.setTargetAtTime(0.1 / harmonics.length, now, 2); // Fade in

            this.ambienceNodes.push({
                stop: () => {
                    gain.gain.setTargetAtTime(0, this.ctx.currentTime, 1);
                    setTimeout(() => osc.stop(), 1000);
                }
            });
        });

        // --- 3. Texture Layer (Noise/Wind) ---
        const noise = this.ctx.createBufferSource();
        noise.buffer = this._createNoiseBuffer();
        noise.loop = true;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 400; // Wind sound
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.value = 0.02;

        // Modulate noise filter for "wind" effect
        if (intention === 'serenity' || intention === 'awe') {
            const lfo = this._createOscillator('sine', 0.1);
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 200;
            lfo.connect(lfoGain);
            lfoGain.connect(noiseFilter.frequency);
            lfo.start(now);
            this.ambienceNodes.push({ stop: () => lfo.stop() });
        }

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(now);
        this.ambienceNodes.push({
            stop: () => {
                noise.stop();
            }
        });
    }

    stopAmbience() {
        this.ambienceNodes.forEach((node) => node.stop());
        this.ambienceNodes = [];
    }

    playInteractionSound(type) {
        if (!this.ctx) this.init();
        if (!this.ctx) return; // Graceful exit if init failed
        this.resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        if (type === 'click') {
            // High pitched short click
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'snap') {
            // Mechanical snap
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'weave') {
            // Magical shimmer
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.linearRampToValueAtTime(880, now + 0.5);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
            gain.gain.linearRampToValueAtTime(0, now + 1.0);

            // Add a second harmonic
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(this.masterGain);
            osc2.frequency.setValueAtTime(660, now); // Fifth
            osc2.frequency.linearRampToValueAtTime(1320, now + 0.6);
            gain2.gain.setValueAtTime(0, now);
            gain2.gain.linearRampToValueAtTime(0.1, now + 0.1);
            gain2.gain.linearRampToValueAtTime(0, now + 1.0);

            osc.start(now);
            osc.stop(now + 1.0);
            osc2.start(now);
            osc2.stop(now + 1.0);
        }
    }
}

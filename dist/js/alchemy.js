import { locations } from './data.js';

// Simple seeded RNG
class Seer {
    constructor(seedString) {
        this.seed = this._hashString(seedString);
    }

    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    // Returns float between 0 and 1
    random() {
        const x = Math.sin(this.seed++) * 10000;
        return x - Math.floor(x);
    }

    // Returns integer between min and max (inclusive)
    range(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

    // Returns random element from array
    pick(array) {
        return array[this.range(0, array.length - 1)];
    }
}

export class SynthesisEngine {
    constructor() {
        // Vocabulary banks for generation
        this.prefixes = [
            'Echo of',
            'Shadow of',
            'Dream of',
            'Memory of',
            'Whisper from',
            'The Phantom',
            'The Lost',
            'Convergent'
        ];
        this.connectors = [
            'amidst',
            'beyond',
            'beneath',
            'within',
            'transcending'
        ];
        this.abstractNouns = [
            'Silence',
            'Light',
            'Time',
            'Dust',
            'Infinity',
            'Reflection',
            'Void',
            'Nexus',
            'Horizon'
        ];
    }

    async fuse(threadA, threadB) {
        // Ensure consistent ordering for deterministic seed regardless of selection order
        const [t1, t2] = [threadA, threadB].sort((a, b) =>
            a.hash.localeCompare(b.hash)
        );

        const seedString = t1.hash + t2.hash;
        const seer = new Seer(seedString);

        // Retrieve parent data
        const locA = this._getLocation(t1);
        const locB = this._getLocation(t2);

        // Fallbacks if parent data is missing (e.g., legacy or corrupted thread pointers)
        const safeLocA = locA || this._getFallbackLocation(t1);
        const safeLocB = locB || this._getFallbackLocation(t2);

        return {
            isPhantom: true,
            id: `phantom-${t1.id}-${t2.id}`,
            title: this._generateTitle(seer, safeLocA, safeLocB),
            subtitle: this._generateSubtitle(seer, safeLocA, safeLocB),
            image: seer.random() > 0.5 ? safeLocA.image : safeLocB.image, // In a real engine, we'd blend images via canvas, but here we pick one
            narrative: this._generateNarrative(
                seer,
                safeLocA,
                safeLocB,
                t1,
                t2
            ),
            sensory: this._blendSensory(seer, safeLocA, safeLocB),
            foundation:
                'This place exists only in the space between memories. It is a fleeting convergence of two paths.',
            parents: [t1, t2]
        };
    }

    _getLocation(thread) {
        const key = `${thread.intention}.${thread.region}.${thread.time}`;
        return locations[key];
    }

    _getFallbackLocation(thread) {
        return {
            title: 'Unknown Realm',
            subtitle: 'The Void',
            image: '', // Empty or default
            narrative: 'A memory fading into the mist...',
            sensory: {
                sight: { desc: 'Grey mist.', color: '#888888' },
                sound: { desc: 'White noise.', audio: '' },
                scent: { desc: 'Nothing.' },
                touch: { desc: 'Cold air.' }
            }
        };
    }

    _generateTitle(seer, locA, locB) {
        const pattern = seer.range(0, 2);
        if (pattern === 0) {
            // "Echo of [ParentA Title]"
            return `${seer.pick(this.prefixes)} ${locA.title}`;
        } else if (pattern === 1) {
            // "The [Noun] of [ParentB Subtitle Word]"
            const words = locB.subtitle.split(' ');
            const word = seer.pick(words);
            return `The ${seer.pick(this.abstractNouns)} of ${word}`;
        } else {
            // Combined words
            const wordA = seer.pick(locA.title.split(' '));
            const wordB = seer.pick(locB.title.split(' '));
            return `${wordA} ${wordB}`;
        }
    }

    _generateSubtitle(seer, locA, locB) {
        return `${locA.subtitle} ${seer.pick(this.connectors)} ${locB.subtitle}`;
    }

    _generateNarrative(seer, locA, locB, t1, t2) {
        const fragmentsA = locA.narrative.split('. ');
        const fragmentsB = locB.narrative.split('. ');

        const frag1 = seer.pick(fragmentsA);
        const frag2 = seer.pick(fragmentsB);

        return `Where ${t1.intention} meets ${t2.intention}, the world shifts. ${frag1}. Yet, simultaneously, ${frag2}. The timelines of ${t1.time} and ${t2.time} collapse into a single, resonant moment.`;
    }

    _blendSensory(seer, locA, locB) {
        // Blend colors
        const colorA = this._hexToRgb(locA.sensory.sight.color);
        const colorB = this._hexToRgb(locB.sensory.sight.color);
        const ratio = seer.random();
        const blendedColor = this._rgbToHex(
            Math.round(colorA.r * ratio + colorB.r * (1 - ratio)),
            Math.round(colorA.g * ratio + colorB.g * (1 - ratio)),
            Math.round(colorA.b * ratio + colorB.b * (1 - ratio))
        );

        return {
            sight: {
                desc: `A shifting vision: ${locA.sensory.sight.desc} merging with ${locB.sensory.sight.desc}`,
                color: blendedColor
            },
            sound: {
                desc: `The impossible harmony of ${locA.sensory.sound.desc} and ${locB.sensory.sound.desc}`,
                audio:
                    seer.random() > 0.5
                        ? locA.sensory.sound.audio
                        : locB.sensory.sound.audio,
                // In the future, we could pass params to the audio engine to actually blend them
                mixRatio: ratio
            },
            scent: {
                desc: `A complex bouquet: ${locA.sensory.scent.desc} intertwined with ${locB.sensory.scent.desc}`
            },
            touch: {
                desc: `It feels like ${locA.sensory.touch.desc} yet ${locB.sensory.touch.desc}`
            }
        };
    }

    _hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16)
              }
            : { r: 0, g: 0, b: 0 };
    }

    _rgbToHex(r, g, b) {
        return (
            '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
        );
    }
}

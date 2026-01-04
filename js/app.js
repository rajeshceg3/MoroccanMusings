import { locations } from './data.js';
import { TapestryLedger, MandalaRenderer } from './tapestry.js';
import { ResonanceEngine } from './audio-engine.js';

document.addEventListener('DOMContentLoaded', async () => {

    const state = {
        intention: null, region: null, time: null,
        activeScreen: 'splash', activeLocation: null,
        isWeaving: false,
    };

    const resonanceEngine = new ResonanceEngine();

    const tapestryLedger = new TapestryLedger();
    await tapestryLedger.initialize();
    let mandalaRenderer = null;

    const elements = {
        screens: {
            splash: document.getElementById('splash-screen'),
            astrolabe: document.getElementById('astrolabe-screen'),
            riad: document.getElementById('riad-screen'),
            tapestry: document.getElementById('tapestry-screen')
        },
        splash: {
            surface: document.querySelector('.tadelakt-surface'),
            calligraphy: document.querySelector('.calligraphy')
        },
        astrolabe: {
            rings: {
                intention: document.getElementById('ring-intention'),
                region: document.getElementById('ring-region'),
                time: document.getElementById('ring-time')
            },
            markers: {
                intention: document.querySelectorAll('#ring-intention .astrolabe-marker'),
                time: document.querySelectorAll('#ring-time .astrolabe-marker'),
            },
            center: document.querySelector('.astrolabe-center'),
            centerText: document.querySelector('.center-text'),
            tapestryIcon: document.getElementById('tapestry-icon')
        },
        riad: {
            imageContainer: document.getElementById('riad-image-container'),
            imageElement: document.getElementById('riad-image-element'),
            title: document.getElementById('riad-title'),
            subtitle: document.getElementById('riad-subtitle'),
            narrative: document.getElementById('riad-narrative'),
            sensory: {
                sight: document.getElementById('sensory-sight'),
                sightDesc: document.getElementById('sensory-sight-desc'),
                sound: document.getElementById('sensory-sound'),
                soundDesc: document.getElementById('sensory-sound-desc'),
                scent: document.getElementById('sensory-scent'),
                scentDesc: document.getElementById('sensory-scent-desc'),
                touch: document.getElementById('sensory-touch'),
                touchDesc: document.getElementById('sensory-touch-desc')
            },
            foundation: {
                toggle: document.querySelector('.foundation-toggle'),
                plusIcon: document.querySelector('.plus-icon'),
                details: document.querySelector('.foundation-details'),
                text: document.getElementById('foundation-text')
            },
            backButton: document.getElementById('back-button'),
            weaveButton: document.getElementById('weave-button')
        },
        tapestry: {
            canvas: document.getElementById('tapestry-canvas'),
            backButton: document.getElementById('tapestry-back'),
            clearBtn: document.getElementById('clear-tapestry'),
            exportBtn: document.getElementById('export-scroll'),
            importBtn: document.getElementById('import-btn'),
            importInput: document.getElementById('import-scroll')
        },
        colorWash: document.querySelector('.color-wash')
    };

    // Helper for Accessibility
    function makeAccessible(element, role, handler) {
        element.setAttribute('tabindex', '0');
        element.setAttribute('role', role);
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handler(e);
            }
        });
    }

    function lockTransition(duration) {
        document.body.classList.add('transition-locked');
        setTimeout(() => {
            document.body.classList.remove('transition-locked');
        }, duration);
    }

    function showScreen(screenName) {
        state.activeScreen = screenName;
        // Reduced transition lock for better UX
        lockTransition(800);
        for (const key in elements.screens) {
            elements.screens[key].classList.remove('active');
        }
        elements.screens[screenName].classList.add('active');

        if (screenName === 'tapestry') {
             elements.screens.tapestry.classList.add('tapestry-active');
             if (!mandalaRenderer) {
                 mandalaRenderer = new MandalaRenderer(elements.tapestry.canvas);
             } else {
                 mandalaRenderer.resize();
             }
             mandalaRenderer.render(tapestryLedger.getThreads());
        } else {
            elements.screens.tapestry.classList.remove('tapestry-active');
        }
    }

    // --- Splash Screen Logic ---
    function initSplash() {
        setTimeout(() => { elements.splash.surface.style.opacity = '1'; }, 500);
        setTimeout(() => {
            elements.splash.calligraphy.style.opacity = '1';
            elements.splash.calligraphy.style.transform = 'scale(1)';
        }, 2000);

        const dismissSplash = () => {
            resonanceEngine.init();
            resonanceEngine.resume();
            elements.splash.calligraphy.style.opacity = '0';
            showScreen('astrolabe');
            window.removeEventListener('keydown', handleSplashKey);
        };

        const handleSplashKey = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                dismissSplash();
            }
        };

        elements.screens.splash.style.cursor = 'pointer';
        elements.screens.splash.addEventListener('click', dismissSplash, { once: true });
        window.addEventListener('keydown', handleSplashKey);
        // Make splash accessible
        elements.screens.splash.setAttribute('role', 'button');
        elements.screens.splash.setAttribute('tabindex', '0');
    }

    // --- Astrolabe Logic ---
    function setupRing(ringElement, snapAngles, onSnap) {
        let startAngle = 0;
        let currentRotation = 0;

        const getAngle = (e) => {
            const rect = ringElement.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
        };

        const drag = (e) => {
            e.preventDefault();
            currentRotation = getAngle(e) - startAngle;
            ringElement.style.transform = `rotate(${currentRotation}deg)`;
        };

        const endDrag = () => {
            ringElement.style.transition = 'transform 0.8s var(--ease-out-quint)';
            document.body.style.cursor = 'default';

            const closestSnap = snapAngles.reduce((prev, curr) => (Math.abs(curr - currentRotation % 360) < Math.abs(prev - currentRotation % 360) ? curr : prev));
            const revolutions = Math.round(currentRotation / 360);
            let finalRotation = revolutions * 360 + closestSnap;
            if (Math.abs(currentRotation - (finalRotation - 360)) < Math.abs(currentRotation - finalRotation)) { finalRotation -= 360; }

            currentRotation = finalRotation;
            ringElement.style.transform = `rotate(${currentRotation}deg)`;
            if (navigator.vibrate) navigator.vibrate(10);
            resonanceEngine.playInteractionSound('click');
            onSnap(closestSnap);

            window.removeEventListener('mousemove', drag);
            window.removeEventListener('mouseup', endDrag);
            window.removeEventListener('touchmove', drag);
            window.removeEventListener('touchend', endDrag);
        };

        const startDrag = (e) => {
            ringElement.style.transition = 'none';
            startAngle = getAngle(e) - currentRotation;
            document.body.style.cursor = 'grabbing';

            window.addEventListener('mousemove', drag);
            window.addEventListener('mouseup', endDrag);
            window.addEventListener('touchmove', drag, { passive: false });
            window.addEventListener('touchend', endDrag);
        };

        ringElement.addEventListener('mousedown', startDrag);
        ringElement.addEventListener('touchstart', startDrag, { passive: false });

        // Keyboard support
        ringElement.setAttribute('tabindex', '0');
        ringElement.setAttribute('role', 'slider');
        ringElement.setAttribute('aria-label', ringElement.id === 'ring-intention' ? 'Intention Ring' : 'Time Ring');

        ringElement.addEventListener('keydown', (e) => {
            let rotationChange = 0;
            // Fixed Logic: Right/Up moves to NEXT item (Index + 1).
            // Previous Logic: -90 deg moved to Index + 3 (Prev).
            // Visual Layout: Clockwise.
            // If we rotate Ring -90 (CCW), item at 90 (Index 1) moves to 0 (Selected).
            // So -90 is visually correct to SELECT next item.
            // BUT, the index calculation logic needs to match.
            // Formula: index = (Math.round(-angle / 90) + 4) % 4
            // Let's verify formula in updateSelection below.

            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') rotationChange = -90; // Selects Next (visually CCW rotation brings next item to top)
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') rotationChange = 90;

            if (rotationChange !== 0) {
                 e.preventDefault();
                 currentRotation += rotationChange;
                 ringElement.style.transition = 'transform 0.5s var(--ease-out-quint)';
                 ringElement.style.transform = `rotate(${currentRotation}deg)`;

                 const closestSnap = snapAngles.reduce((prev, curr) => (Math.abs(curr - currentRotation % 360) < Math.abs(prev - currentRotation % 360) ? curr : prev));
                 onSnap(closestSnap);
            }
        });
    }

    function updateAstrolabeState() {
        const keys = { intention: ['serenity', 'vibrancy', 'awe', 'legacy'], time: ['dawn', 'midday', 'dusk', 'night'] };
        const updateSelection = (ring, angle) => {
            // FIX: Use -angle because visual rotation of ring is opposite to item index progression if items are placed clockwise.
            // If Items are at 0, 90, 180, 270.
            // Rotate Ring -90. Item at 90 is now at 0.
            // So Angle -90 => Index 1.
            // Formula: -(-90)/90 = 1. Correct.
            const index = (Math.round(-angle / 90) + 4) % 4;
            // Ensure positive index
            const safeIndex = (index < 0 ? index + 4 : index) % 4;

            state[ring] = keys[ring][safeIndex];
            const markers = elements.astrolabe.markers[ring];
            markers.forEach((m, i) => m.classList.toggle('selected-marker', i === safeIndex));
            updateCenterText();
        };
        setupRing(elements.astrolabe.rings.intention, [0, -90, -180, -270], (angle) => updateSelection('intention', angle));
        setupRing(elements.astrolabe.rings.time, [0, -90, -180, -270], (angle) => updateSelection('time', angle));
    }

    function updateCenterText() {
        if (state.intention && state.time) {
            const regionMap = { serenity: 'coast', vibrancy: 'medina', awe: 'sahara', legacy: 'kasbah' };
            state.region = regionMap[state.intention];
            elements.astrolabe.centerText.textContent = `Find a path for ${state.intention} at ${state.time}`;
        } else {
            elements.astrolabe.centerText.textContent = 'Align the rings';
        }
        elements.astrolabe.centerText.setAttribute('aria-live', 'polite');
    }

    // --- Riad Screen Logic ---
    function showRiad(locationData) {
        state.activeLocation = locationData;

        elements.riad.imageContainer.style.display = 'block';
        document.querySelector('.riad-content').style.marginTop = '100vh';

        elements.riad.imageElement.onerror = () => {
            elements.riad.imageContainer.style.display = 'none';
            document.querySelector('.riad-content').style.marginTop = '0';
        };
        elements.riad.imageElement.loading = "lazy";
        elements.riad.imageElement.src = locationData.image;
        elements.riad.imageElement.alt = `View of ${locationData.title}: ${locationData.subtitle}`; // Better Alt Text

        elements.riad.title.textContent = locationData.title;
        elements.riad.subtitle.textContent = locationData.subtitle;
        elements.riad.narrative.textContent = locationData.narrative;
        elements.riad.sensory.sight.dataset.color = locationData.sensory.sight.color;
        elements.riad.sensory.sightDesc.textContent = locationData.sensory.sight.desc;
        elements.riad.sensory.sound.dataset.audio = locationData.sensory.sound.audio;
        elements.riad.sensory.soundDesc.textContent = locationData.sensory.sound.desc;
        elements.riad.sensory.scentDesc.textContent = locationData.sensory.scent.desc;
        elements.riad.sensory.touchDesc.textContent = locationData.sensory.touch.desc;
        elements.riad.foundation.text.textContent = locationData.foundation;
        elements.riad.weaveButton.dataset.color = locationData.sensory.sight.color;

        elements.screens.riad.scrollTop = 0;
        elements.riad.imageContainer.style.opacity = 1;
        elements.riad.weaveButton.classList.remove('visible');
        setTimeout(() => elements.riad.weaveButton.classList.add('visible'), 1500);

        showScreen('riad');
    }

    function setupRiadInteractions() {
        const goBack = () => {
            showScreen('astrolabe');
            elements.riad.weaveButton.classList.remove('visible');
            resonanceEngine.stopAmbience();
        };

        elements.riad.backButton.addEventListener('click', goBack);
        makeAccessible(elements.riad.backButton, 'button', goBack);

        elements.screens.riad.addEventListener('scroll', () => {
            const scrollY = elements.screens.riad.scrollTop;
            const opacity = Math.max(0, 1 - (scrollY / (window.innerHeight * 0.7)));
            elements.riad.imageContainer.style.opacity = opacity;
        });

        const handleSight = (e) => {
            const color = elements.riad.sensory.sight.dataset.color;
            elements.colorWash.style.backgroundColor = color;
            elements.colorWash.style.opacity = 1;
            setTimeout(() => { elements.colorWash.style.opacity = 0; }, 600);
        };
        elements.riad.sensory.sight.addEventListener('click', handleSight);
        makeAccessible(elements.riad.sensory.sight, 'button', handleSight);

        const handleSound = () => {
             resonanceEngine.resume();
             resonanceEngine.playInteractionSound('snap');
        };
        elements.riad.sensory.sound.addEventListener('click', handleSound);
        makeAccessible(elements.riad.sensory.sound, 'button', handleSound);

        // Make other sensory items accessible too
        makeAccessible(elements.riad.sensory.scent, 'button', () => {});
        makeAccessible(elements.riad.sensory.touch, 'button', () => {});

        const toggleFoundation = () => {
            elements.riad.foundation.details.classList.toggle('open');
            elements.riad.foundation.plusIcon.classList.toggle('open');
        };
        elements.riad.foundation.toggle.addEventListener('click', toggleFoundation);
        makeAccessible(elements.riad.foundation.toggle, 'button', toggleFoundation);

        // "Weave a Thread" gesture
        let pressTimer;
        const startWeave = (e) => {
            elements.riad.weaveButton.classList.add('pressing');
            pressTimer = setTimeout(() => {
                weaveThread();
                elements.riad.weaveButton.classList.remove('pressing');
            }, 1000);
        };
        const cancelWeave = () => {
            clearTimeout(pressTimer);
            elements.riad.weaveButton.classList.remove('pressing');
        };

        const clickWeave = (e) => {
            weaveThread();
        };

        elements.riad.weaveButton.addEventListener('mousedown', startWeave);
        elements.riad.weaveButton.addEventListener('touchstart', startWeave, { passive: true });
        elements.riad.weaveButton.addEventListener('mouseup', cancelWeave);
        elements.riad.weaveButton.addEventListener('mouseleave', cancelWeave);
        elements.riad.weaveButton.addEventListener('touchend', cancelWeave);
        elements.riad.weaveButton.addEventListener('click', clickWeave);

        elements.riad.weaveButton.setAttribute('tabindex', '0');
        elements.riad.weaveButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                weaveThread();
            }
        });
    }

    async function weaveThread() {
        if (state.isWeaving) return;
        state.isWeaving = true;

        resonanceEngine.playInteractionSound('weave');

        await tapestryLedger.addThread({
            intention: state.intention,
            time: state.time,
            region: state.region,
            title: state.activeLocation.title
        });

        const thread = document.createElement('div');
        thread.className = 'thread-animation';
        const startRect = elements.riad.weaveButton.getBoundingClientRect();
        const endRect = elements.astrolabe.tapestryIcon.getBoundingClientRect();
        const startX = startRect.left + startRect.width / 2;
        const startY = startRect.top + startRect.height / 2;
        const endX = endRect.left + endRect.width / 2;
        const endY = endRect.top + endRect.height / 2;
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

        thread.style.left = `${startX}px`;
        thread.style.top = `${startY}px`;
        thread.style.width = `${distance}px`;
        thread.style.transform = `rotate(${angle}deg)`;
        thread.style.backgroundColor = elements.riad.weaveButton.dataset.color || 'var(--ochre-gold)';
        document.body.appendChild(thread);

        thread.animate([{ transform: `rotate(${angle}deg) scaleX(0)` }, { transform: `rotate(${angle}deg) scaleX(1)` }], { duration: 600, easing: 'cubic-bezier(0.7, 0, 0.3, 1)' })
        .onfinish = () => {
            thread.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200 })
            .onfinish = () => {
                thread.remove();
                elements.astrolabe.tapestryIcon.classList.add('tapestry-icon-pulse');
                setTimeout(() => {
                    elements.astrolabe.tapestryIcon.classList.remove('tapestry-icon-pulse');
                    state.isWeaving = false;
                }, 500);
            }
        };
    }

    function setupTapestryInteractions() {
        const goToTapestry = () => {
            showScreen('tapestry');
        };
        elements.astrolabe.tapestryIcon.addEventListener('click', goToTapestry);
        makeAccessible(elements.astrolabe.tapestryIcon, 'button', goToTapestry);

        const backToAstro = () => {
            showScreen('astrolabe');
        };
        elements.tapestry.backButton.addEventListener('click', backToAstro);
        makeAccessible(elements.tapestry.backButton, 'button', backToAstro);

        elements.tapestry.clearBtn.addEventListener('click', () => {
            if(confirm('Are you sure you want to unravel your tapestry? This cannot be undone.')) {
                tapestryLedger.clear();
                mandalaRenderer.render([]);
            }
        });

        elements.tapestry.exportBtn.addEventListener('click', () => {
            const data = tapestryLedger.exportScroll();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `marq_scroll_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });

        elements.tapestry.importBtn.addEventListener('click', () => {
            elements.tapestry.importInput.click();
        });

        elements.tapestry.importInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const text = await file.text();
            const success = await tapestryLedger.importScroll(text);
            if (success) {
                alert('Scroll imported successfully.');
                mandalaRenderer.render(tapestryLedger.getThreads());
            } else {
                alert('The Scroll is torn or corrupted. (Import Failed)');
            }
            e.target.value = '';
        });

        window.addEventListener('resize', () => {
            if (state.activeScreen === 'tapestry' && mandalaRenderer) {
                mandalaRenderer.resize();
                mandalaRenderer.render(tapestryLedger.getThreads());
            }
        });
    }

    // --- Initialization ---
    window.onerror = function(msg, url, lineNo, columnNo, error) {
        console.error('Global error:', msg, error);
        return false;
    };

    initSplash();
    updateAstrolabeState();
    setupRiadInteractions();
    setupTapestryInteractions();

    const goToRiad = () => {
        const path = `${state.intention}.${state.region}.${state.time}`;
        let targetLocation = locations[path];

        // Fallback Logic for Content Gap
        if (!targetLocation) {
            // Find a valid location for this intention, regardless of time
            const validTime = Object.keys(locations).find(k => k.startsWith(`${state.intention}.${state.region}`));
            if (validTime) {
                targetLocation = locations[validTime];
            } else {
                // Absolute fallback to Serenity
                 targetLocation = locations['serenity.coast.dawn'];
            }
        }

        if (targetLocation) {
            resonanceEngine.startAmbience(state.intention, state.time);
            showScreen('riad');
            showRiad(targetLocation);
        } else {
            elements.astrolabe.center.animate([{ transform: 'translateX(0px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0px)' }], { duration: 300, iterations: 1 });
            elements.astrolabe.centerText.textContent = 'No path found';
            setTimeout(updateCenterText, 2000);
        }
    };

    elements.astrolabe.center.addEventListener('click', goToRiad);
    makeAccessible(elements.astrolabe.center, 'button', goToRiad);
});

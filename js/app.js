import { locations } from './data.js';
import { TapestryLedger, MandalaRenderer } from './tapestry.js';
import { ResonanceEngine } from './audio-engine.js';
import { SynthesisEngine } from './alchemy.js';
import { HorizonEngine } from './horizon.js';

document.addEventListener('DOMContentLoaded', async () => {

    const state = {
        intention: null, region: null, time: null,
        activeScreen: 'splash', activeLocation: null,
        isWeaving: false,
        selectedThreads: [], // Array of indices
        isHorizonActive: false
    };

    const resonanceEngine = new ResonanceEngine();
    const horizonEngine = new HorizonEngine();

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
            importInput: document.getElementById('import-scroll'),
            alchemyUI: document.getElementById('alchemy-ui'),
            slot1: document.getElementById('alchemy-slot-1'),
            slot2: document.getElementById('alchemy-slot-2'),
            fuseBtn: document.getElementById('alchemy-fuse-btn'),
            horizonToggle: document.getElementById('horizon-toggle'),
            horizonDashboard: document.getElementById('horizon-dashboard'),
            horizonDominance: document.getElementById('horizon-dominance'),
            horizonBalanceBar: document.getElementById('horizon-balance-bar'),
            horizonInsight: document.getElementById('horizon-insight')
        },
        colorWash: document.querySelector('.color-wash')
    };

    const alchemy = new SynthesisEngine();

    function lockTransition(duration) {
        document.body.classList.add('transition-locked');
        setTimeout(() => {
            document.body.classList.remove('transition-locked');
        }, duration);
    }

    function showScreen(screenName) {
        state.activeScreen = screenName;
        lockTransition(1200); // Lock interaction during screen transitions
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
             mandalaRenderer.setSelection(state.selectedThreads);

             // Initial render
             renderTapestry();
             updateAlchemyUI();

             // Start animation loop if horizon is active
             if (state.isHorizonActive) {
                 startHorizonLoop();
             }
        } else {
            elements.screens.tapestry.classList.remove('tapestry-active');
            stopHorizonLoop();
        }
    }

    function updateAlchemyUI() {
        const slots = [elements.tapestry.slot1, elements.tapestry.slot2];
        const threads = tapestryLedger.getThreads();

        state.selectedThreads.forEach((threadIndex, i) => {
             slots[i].classList.add('filled');
             // Just show first letter of intention as a glyph/symbol placeholder
             const t = threads[threadIndex];
             slots[i].textContent = t ? t.intention[0].toUpperCase() : '?';
        });

        // Clear empty slots
        for(let i = state.selectedThreads.length; i < 2; i++) {
             slots[i].classList.remove('filled');
             slots[i].textContent = (i + 1);
        }

        if (state.selectedThreads.length === 2) {
             elements.tapestry.fuseBtn.disabled = false;
        } else {
             elements.tapestry.fuseBtn.disabled = true;
        }

        elements.tapestry.alchemyUI.classList.toggle('visible', threads.length >= 2);
    }

    // --- Splash Screen Logic ---
    function initSplash() {
        setTimeout(() => { elements.splash.surface.style.opacity = '1'; }, 500);
        setTimeout(() => {
            elements.splash.calligraphy.style.opacity = '1';
            elements.splash.calligraphy.style.transform = 'scale(1)';
        }, 2000); // Reduced from 3000

        const dismissSplash = () => {
            resonanceEngine.init(); // Initialize audio context on first gesture
            resonanceEngine.resume();
            elements.splash.calligraphy.style.opacity = '0';
            showScreen('astrolabe');
            // Remove listener to prevent multiple calls
            window.removeEventListener('keydown', handleSplashKey);
        };

        const handleSplashKey = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                dismissSplash();
            }
        };

        // Allow interaction immediately
        elements.screens.splash.style.cursor = 'pointer';
        elements.screens.splash.addEventListener('click', dismissSplash, { once: true });
        window.addEventListener('keydown', handleSplashKey);
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
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') rotationChange = -90;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') rotationChange = 90;

            if (rotationChange !== 0) {
                 e.preventDefault();
                 currentRotation += rotationChange;
                 ringElement.style.transition = 'transform 0.5s var(--ease-out-quint)';
                 ringElement.style.transform = `rotate(${currentRotation}deg)`;

                 // Find closest snap point (simplified for keyboard: just snap to next quadrant)
                 const closestSnap = snapAngles.reduce((prev, curr) => (Math.abs(curr - currentRotation % 360) < Math.abs(prev - currentRotation % 360) ? curr : prev));
                 onSnap(closestSnap);
            }
        });
    }

    function updateAstrolabeState() {
        const keys = { intention: ['serenity', 'vibrancy', 'awe', 'legacy'], time: ['dawn', 'midday', 'dusk', 'night'] };

        const updateSelection = (ring, angle) => {
            const index = (Math.round(angle / 90) + 4) % 4;
            state[ring] = keys[ring][index];
            const markers = elements.astrolabe.markers[ring];
            markers.forEach((m, i) => m.classList.toggle('selected-marker', i === index));
            updateCenterText();
        };

        setupRing(elements.astrolabe.rings.intention, [0, -90, -180, -270], (angle) => updateSelection('intention', angle));
        setupRing(elements.astrolabe.rings.time, [0, -90, -180, -270], (angle) => updateSelection('time', angle));

        // Initialize state
        updateSelection('intention', 0);
        updateSelection('time', 0);
    }
    function updateCenterText() {
        if (state.intention && state.time) {
            const regionMap = { serenity: 'coast', vibrancy: 'medina', awe: 'sahara', legacy: 'kasbah' };
            state.region = regionMap[state.intention];
            elements.astrolabe.centerText.textContent = `Find a path for ${state.intention} at ${state.time}`;
        } else {
            elements.astrolabe.centerText.textContent = 'Use arrows or drag to align rings';
        }
        // Accessibility: Announce change
        elements.astrolabe.centerText.setAttribute('aria-live', 'polite');
    }

    // --- Riad Screen Logic ---
    function showRiad(locationData) {
        state.activeLocation = locationData;

        // Reset
        elements.riad.imageContainer.style.display = 'block';
        document.querySelector('.riad-content').style.marginTop = '100vh';

        elements.riad.imageElement.onerror = () => {
            elements.riad.imageContainer.style.display = 'none'; // Hide the container on failure
            document.querySelector('.riad-content').style.marginTop = '0'; // Adjust layout
        };
        elements.riad.imageElement.loading = "lazy"; // Native lazy loading
        elements.riad.imageElement.src = locationData.image;

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
        elements.riad.backButton.addEventListener('click', () => {
            showScreen('astrolabe');
            elements.riad.weaveButton.classList.remove('visible');
        });

        elements.screens.riad.addEventListener('scroll', () => {
            const scrollY = elements.screens.riad.scrollTop;
            const opacity = Math.max(0, 1 - (scrollY / (window.innerHeight * 0.7)));
            elements.riad.imageContainer.style.opacity = opacity;
        });

        // Setup accessibility helper for sensory items
        // Ensures keyboard users can focus and activate sensory details
        const setupSensoryItem = (element, action) => {
            element.setAttribute('tabindex', '0');
            element.setAttribute('role', 'button');
            const handler = (e) => {
                if (e.type === 'click' || e.key === 'Enter' || e.key === ' ') {
                    if (e.key === ' ') e.preventDefault();
                    action(e);
                }
            };
            element.addEventListener('click', handler);
            element.addEventListener('keydown', handler);
        };

        setupSensoryItem(elements.riad.sensory.sight, (e) => {
            const color = e.currentTarget.dataset.color;
            elements.colorWash.style.backgroundColor = color;
            elements.colorWash.style.opacity = 1;
            setTimeout(() => { elements.colorWash.style.opacity = 0; }, 600);
            resonanceEngine.playInteractionSound('click');
        });

        setupSensoryItem(elements.riad.sensory.sound, (e) => {
             resonanceEngine.resume();
             resonanceEngine.playInteractionSound('snap');
        });

        // Placeholder actions for scent/touch to ensure they are at least focusable
        setupSensoryItem(elements.riad.sensory.scent, () => resonanceEngine.playInteractionSound('click'));
        setupSensoryItem(elements.riad.sensory.touch, () => resonanceEngine.playInteractionSound('click'));

        // Foundation toggle accessibility
        elements.riad.foundation.toggle.setAttribute('tabindex', '0');
        elements.riad.foundation.toggle.setAttribute('role', 'button');
        elements.riad.foundation.toggle.setAttribute('aria-expanded', 'false');

        const toggleFoundation = () => {
            const isOpen = elements.riad.foundation.details.classList.toggle('open');
            elements.riad.foundation.plusIcon.classList.toggle('open');
            elements.riad.foundation.toggle.setAttribute('aria-expanded', isOpen);
            resonanceEngine.playInteractionSound('click');
        };

        elements.riad.foundation.toggle.addEventListener('click', toggleFoundation);
        elements.riad.foundation.toggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleFoundation();
            }
        });

        // "Weave a Thread" gesture
        let pressTimer;
        const startWeave = (e) => {
            // Prevent default to stop mouseup from firing click if needed, but we want click fallback
            // e.preventDefault(); // Removed to allow click event if it's a short press

            // Add visual feedback class
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

        // Click fallback for non-hold interaction
        const clickWeave = (e) => {
            // Prevent double firing if long press was successful (state.isWeaving handles logic lock,
            // but visual feedback might duplicate if not careful).
            // Since weaveThread checks state.isWeaving, we are mostly safe from logic duplication,
            // but the animation might trigger twice if we are not careful.
            // Wait, weaveThread has `if (state.isWeaving) return;`.
            // So if long press triggered it, isWeaving is true for 600ms+200ms = 800ms.
            // A click event fires after mouseup.
            // So weaveThread will be called again. But it will return early.
            // HOWEVER, we should rely on a cleaner flag or prevent default?
            // Actually, simply relying on `weaveThread`'s guard clause is sufficient
            // provided the animation duration covers the click event timing.
            weaveThread();
        };

        elements.riad.weaveButton.addEventListener('mousedown', startWeave);
        elements.riad.weaveButton.addEventListener('touchstart', startWeave, { passive: true });
        elements.riad.weaveButton.addEventListener('mouseup', cancelWeave);
        elements.riad.weaveButton.addEventListener('mouseleave', cancelWeave);
        elements.riad.weaveButton.addEventListener('touchend', cancelWeave);
        elements.riad.weaveButton.addEventListener('click', clickWeave);

        // Accessibility fallback: Shift+Click or double click to weave instantly?
        // Or just make a long press accessible via keyboard?
        // Let's allow Enter key on the button to trigger it.
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

        // Persist the thread
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
                    state.isWeaving = false; // Reset the lock
                }, 500);
            }
        };
    }

    function setupTapestryInteractions() {
        elements.astrolabe.tapestryIcon.addEventListener('click', () => {
            showScreen('tapestry');
        });

        elements.tapestry.backButton.addEventListener('click', () => {
            showScreen('astrolabe');
        });

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
            e.target.value = ''; // Reset
        });

        window.addEventListener('resize', () => {
            if (state.activeScreen === 'tapestry' && mandalaRenderer) {
                mandalaRenderer.resize();
                mandalaRenderer.render(tapestryLedger.getThreads());
            }
        });

        // Mandala Click Interaction
        elements.tapestry.canvas.addEventListener('click', (e) => {
             if (!mandalaRenderer) return;
             const index = mandalaRenderer.getThreadIndexAt(e.clientX, e.clientY);
             const threads = tapestryLedger.getThreads();

             if (index >= 0 && index < threads.length) {
                 // Toggle selection
                 const selectedIndex = state.selectedThreads.indexOf(index);
                 if (selectedIndex >= 0) {
                     state.selectedThreads.splice(selectedIndex, 1);
                 } else {
                     if (state.selectedThreads.length < 2) {
                         state.selectedThreads.push(index);
                     } else {
                         // FIFO replacement if full
                         state.selectedThreads.shift();
                         state.selectedThreads.push(index);
                     }
                 }
                 mandalaRenderer.setSelection(state.selectedThreads);
                 mandalaRenderer.render(threads);
                 resonanceEngine.playInteractionSound('click');
                 updateAlchemyUI();
             }
        });

        elements.tapestry.fuseBtn.addEventListener('click', async () => {
             const threads = tapestryLedger.getThreads();
             if (state.selectedThreads.length !== 2) return;

             const t1 = threads[state.selectedThreads[0]];
             const t2 = threads[state.selectedThreads[1]];

             const phantom = await alchemy.fuse(t1, t2);

             // Transition to Riad with phantom data
             // We need to slightly hack showRiad to accept this non-standard object or ensure it conforms
             // Phantom object matches structure: { title, subtitle, image, narrative, sensory, foundation }
             // But we should visually distinguish it.

             resonanceEngine.playInteractionSound('weave'); // Magical sound
             showScreen('riad');
             showRiad(phantom);

             // Inject a special visual cue for Phantom mode
             elements.riad.title.style.color = '#c67605'; // Gold title
             elements.riad.subtitle.textContent = "✧ A PHANTOM REALM ✧";

             // Clear selection
             state.selectedThreads = [];
        });

        // Horizon Interaction
        elements.tapestry.horizonToggle.addEventListener('click', () => {
            state.isHorizonActive = !state.isHorizonActive;
            elements.tapestry.horizonToggle.classList.toggle('active', state.isHorizonActive);
            elements.tapestry.horizonDashboard.classList.toggle('visible', state.isHorizonActive);

            if (state.isHorizonActive) {
                updateHorizonDashboard();
                startHorizonLoop();
            } else {
                stopHorizonLoop();
                renderTapestry(); // One last render to clear ghosts
            }
            resonanceEngine.playInteractionSound('click');
        });
    }

    // --- Horizon Logic ---
    let horizonAnimationFrame = null;

    function startHorizonLoop() {
        if (horizonAnimationFrame) return;

        const loop = () => {
            renderTapestry();
            if (state.activeScreen === 'tapestry' && state.isHorizonActive) {
                horizonAnimationFrame = requestAnimationFrame(loop);
            } else {
                horizonAnimationFrame = null;
            }
        };
        loop();
    }

    function stopHorizonLoop() {
        if (horizonAnimationFrame) {
            cancelAnimationFrame(horizonAnimationFrame);
            horizonAnimationFrame = null;
        }
    }

    function updateHorizonDashboard() {
        const threads = tapestryLedger.getThreads();
        const analysis = horizonEngine.analyze(threads);

        elements.tapestry.horizonDominance.textContent = analysis.dominance.intention !== 'None' ? `${analysis.dominance.intention} (${analysis.dominance.percent}%)` : 'None';
        elements.tapestry.horizonBalanceBar.style.width = `${analysis.balanceScore}%`;

        // Dynamic Insight
        if (threads.length < 3) {
            elements.tapestry.horizonInsight.textContent = "More data needed for strategic projection.";
        } else if (analysis.balanceScore < 40) {
            elements.tapestry.horizonInsight.textContent = `Pattern is heavily skewed. Consider seeking ${findLeastCommon(analysis.counts)} to restore equilibrium.`;
        } else if (analysis.streak > 2) {
             elements.tapestry.horizonInsight.textContent = `Strong momentum in ${analysis.lastIntention}. Continuing this path will deepen the groove.`;
        } else {
            elements.tapestry.horizonInsight.textContent = "The pattern is balanced. You are weaving a diverse tapestry.";
        }
    }

    function findLeastCommon(counts) {
        return Object.entries(counts).sort((a,b) => a[1] - b[1])[0][0];
    }

    function renderTapestry() {
        if (!mandalaRenderer) return;
        const threads = tapestryLedger.getThreads();
        let projections = [];

        if (state.isHorizonActive) {
            projections = horizonEngine.project(threads);
        }

        mandalaRenderer.render(threads, projections);
    }

    // --- Initialization ---
    // Global Error Boundary
    window.onerror = function(msg, url, lineNo, columnNo, error) {
        console.error('Global error:', msg, error);
        // Could show a user-friendly error toast here
        return false;
    };

    initSplash();
    updateAstrolabeState();
    setupRiadInteractions();
    setupTapestryInteractions();

    elements.astrolabe.center.addEventListener('click', () => {
        const path = `${state.intention}.${state.region}.${state.time}`;
        const targetLocation = locations[path];
        if (targetLocation) {
            resonanceEngine.startAmbience(state.intention, state.time);
            showScreen('riad');
            showRiad(targetLocation);
        } else {
            elements.astrolabe.center.animate([{ transform: 'translateX(0px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0px)' }], { duration: 300, iterations: 1 });
            elements.astrolabe.centerText.textContent = 'No path found';
            setTimeout(updateCenterText, 2000);
        }
    });

    // Stop ambience when going back to astrolabe
    elements.riad.backButton.addEventListener('click', () => {
        resonanceEngine.stopAmbience();
    });
});

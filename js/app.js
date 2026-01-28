import { locations } from './data.js';
import { TapestryLedger, MandalaRenderer } from './tapestry.js';
import { ResonanceEngine } from './audio-engine.js';
import { SynthesisEngine } from './alchemy.js';
import { HorizonEngine } from './horizon.js';
import { CodexEngine } from './codex.js';
import { TerminalSystem } from './terminal.js';
import { MapRenderer } from './cartographer.js';
import { UISystem } from './ui-system.js';
import { OracleEngine } from './oracle.js';
import { SpectraEngine } from './spectra.js';
import { AegisEngine } from './aegis.js';
import { SentinelEngine } from './sentinel.js';
import { ChronosEngine } from './chronos.js';
import { PanopticonEngine } from './panopticon.js';
import { CortexEngine } from './cortex.js';
import { ValkyrieEngine } from './valkyrie.js';
import { ValkyrieUI } from './valkyrie-ui.js';
import { VanguardEngine } from './vanguard.js';
import { SynapseRenderer } from './synapse.js';
import { GeminiEngine } from './gemini.js';
import { StratcomSystem } from './stratcom.js';
import { registerCommands } from './terminal-commands.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('./sw.js');
        } catch {
            // Service Worker registration failed
        }
    }

    // Initialize UI System first
    const ui = new UISystem();
    ui.setupGlobalErrorHandling();

    /**
     * @typedef {Object} AppState
     * @property {string|null} intention - Selected intention
     * @property {string|null} region - Derived region
     * @property {string|null} time - Selected time
     * @property {'splash'|'astrolabe'|'riad'|'tapestry'} activeScreen - Current screen
     * @property {Object|null} activeLocation - Current location data
     * @property {boolean} isWeaving - Lock for weaving animation
     * @property {number[]} selectedThreads - Indices of selected threads
     * @property {boolean} isHorizonActive - Horizon visualization toggle
     * @property {boolean} isMapActive - Map/Overwatch toggle
     */

    /** @type {AppState} */
    const state = {
        intention: null,
        region: null,
        time: null,
        activeScreen: 'splash',
        activeLocation: null,
        isWeaving: false,
        selectedThreads: [], // Array of indices
        isHorizonActive: false,
        isMapActive: false,
        isSynapseActive: false
    };

    const resonanceEngine = new ResonanceEngine();
    const horizonEngine = new HorizonEngine();
    const codex = new CodexEngine();
    const spectra = new SpectraEngine();
    const terminal = new TerminalSystem();
    const aegis = new AegisEngine(ui, horizonEngine);
    const sentinel = new SentinelEngine(horizonEngine);
    const chronos = new ChronosEngine(horizonEngine, SentinelEngine);
    const cortex = new CortexEngine();
    // Valkyrie/Vanguard init deferred until ledger is ready

    // Panopticon initialization is deferred until renderers are ready,
    // but we can instantiate the class structure now or lazily.
    // We'll instantiate it inside the main flow once renderers are accessible or via a getter.
    let panopticon = null;

    // Auto-Lock Mechanism
    let idleTimer;
    const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 Minutes

    function resetIdleTimer() {
        clearTimeout(idleTimer);
        // Only enforce auto-lock if we are actually unlocked/logged in?
        // Actually, CryptoGuard keys are the target.
        idleTimer = setTimeout(() => {
             // System Lock procedure
             if (tapestryLedger.status !== 'LOCKED') {
                 tapestryLedger.lock();
                 ui.showNotification('SESSION EXPIRED. SYSTEM LOCKED.', 'warning');
                 // Return to splash if possible or show lock screen
                 if (state.activeScreen !== 'splash') {
                    // showScreen('splash'); // Optional: force splash
                    // Or just let the user discover it's locked on next action
                 }
                 terminal.log('AUTO-LOCK INITIATED DUE TO INACTIVITY.', 'warning');
             }
        }, IDLE_TIMEOUT);
    }

    // Attach activity listeners
    ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach(evt =>
        window.addEventListener(evt, resetIdleTimer, { passive: true })
    );
    resetIdleTimer();

    const tapestryLedger = new TapestryLedger();
    const initStatus = await tapestryLedger.initialize();

    // Initialize Vanguard (Tactical Units)
    const vanguard = new VanguardEngine(sentinel, aegis, tapestryLedger);

    const valkyrie = new ValkyrieEngine(terminal, ui, tapestryLedger, horizonEngine, vanguard);
    const valkyrieUI = new ValkyrieUI(valkyrie);

    const stratcom = new StratcomSystem(tapestryLedger, horizonEngine, sentinel, vanguard, terminal, ui);

    // Parse Mode for Tactical Uplink
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if (mode) {
        document.body.classList.add(`mode-${mode}`);
    }

    // Initialize Gemini Uplink
    const gemini = new GeminiEngine(state, tapestryLedger, terminal, ui);
    gemini.connect();

    if (!mode) {
        ui.renderUplinkControls();
    }

    // Ledger Sync Listener (Cross-Window)
    window.addEventListener('storage', async (e) => {
        if (e.key === tapestryLedger.storageKey) {
            await tapestryLedger.reload();
            renderTapestry();
            updateAlchemyUI();
            // Optional: Notify
            // ui.showNotification('Data synchronized via Uplink.', 'info');
        }
    });

    let mandalaRenderer = null;
    let mapRenderer = null;
    let synapseRenderer = null;
    let oracleEngine = null;

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
                intention: document.querySelectorAll(
                    '#ring-intention .astrolabe-marker'
                ),
                time: document.querySelectorAll('#ring-time .astrolabe-marker')
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
            weaveButton: document.getElementById('weave-button'),
            simulateButton: document.getElementById('simulate-button')
        },
        tapestry: {
            canvas: document.getElementById('tapestry-canvas'),
            mapCanvas: document.getElementById('map-canvas'),
            backButton: document.getElementById('tapestry-back'),
            clearBtn: document.getElementById('clear-tapestry'),
            exportBtn: document.getElementById('export-scroll'),
            importBtn: document.getElementById('import-btn'),
            importInput: document.getElementById('import-scroll'),
            forgeShardBtn: document.getElementById('forge-shard'),
            scanShardBtn: document.getElementById('scan-shard'),
            shardInput: document.getElementById('shard-input'),
            sonicShardInput: document.getElementById('sonic-shard-input'),
            alchemyUI: document.getElementById('alchemy-ui'),
            slot1: document.getElementById('alchemy-slot-1'),
            slot2: document.getElementById('alchemy-slot-2'),
            fuseBtn: document.getElementById('alchemy-fuse-btn'),
            horizonToggle: document.getElementById('horizon-toggle'),
            mapToggle: document.getElementById('map-toggle'),
            synapseToggle: document.getElementById('synapse-toggle'),
            aegisToggle: document.getElementById('aegis-toggle'),
            horizonDashboard: document.getElementById('horizon-dashboard'),
            horizonDominance: document.getElementById('horizon-dominance'),
            horizonBalanceBar: document.getElementById('horizon-balance-bar'),
            horizonInsight: document.getElementById('horizon-insight'),
            aegisHud: document.getElementById('aegis-hud')
        },
        colorWash: document.querySelector('.color-wash')
    };

    const alchemy = new SynthesisEngine();

    function showScreen(screenName, addToHistory = true) {
        if (addToHistory && state.activeScreen !== screenName) {
            history.pushState({ screen: screenName }, '', `#${screenName}`);
        }

        state.activeScreen = screenName;
        ui.lockTransition(50); // Micro-lock to prevent event ghosting, essentially instant
        for (const key in elements.screens) {
            elements.screens[key].classList.remove('active');
        }
        elements.screens[screenName].classList.add('active');

        // Accessibility Focus Management
        // Focus on a logical starting element for the new screen
        if (screenName === 'astrolabe') {
            elements.astrolabe.rings.intention.focus();
        } else if (screenName === 'riad') {
            elements.riad.backButton.focus();
        } else if (screenName === 'tapestry') {
            elements.tapestry.backButton.focus();
        }

        if (screenName === 'tapestry') {
            elements.screens.tapestry.classList.add('tapestry-active');
            if (!mandalaRenderer) {
                mandalaRenderer = new MandalaRenderer(elements.tapestry.canvas);
            } else {
                mandalaRenderer.resize();
            }

            if (!mapRenderer && elements.tapestry.mapCanvas) {
                mapRenderer = new MapRenderer(elements.tapestry.mapCanvas);

                // Wire up Map Events
                elements.tapestry.mapCanvas.addEventListener('vanguard-command', (e) => {
                    const { unitId, target } = e.detail;
                    const unit = vanguard.getUnits().find(u => u.id === unitId);
                    if (unit) {
                        unit.command(target);
                        resonanceEngine.playInteractionSound('click');
                    }
                });

                elements.tapestry.mapCanvas.addEventListener('map-thread-click', (e) => {
                    handleThreadInteraction(e.detail.index);
                });

                // Initialize Oracle once map renderer is available
                if (!oracleEngine) {
                    oracleEngine = new OracleEngine(
                        horizonEngine,
                        mapRenderer,
                        locations
                    );
                }
            }

            if (!synapseRenderer && elements.tapestry.canvas) {
                // Reuse the main canvas for Synapse, logic switches in renderTapestry
                synapseRenderer = new SynapseRenderer(elements.tapestry.canvas);
            }

            mandalaRenderer.setSelection(state.selectedThreads);

            // Initial render
            renderTapestry();
            updateAlchemyUI();

            // Sentinel Scan on screen entry
            sentinel.assess(tapestryLedger.getThreads());

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
        for (let i = state.selectedThreads.length; i < 2; i++) {
            slots[i].classList.remove('filled');
            slots[i].textContent = i + 1;
        }

        if (state.selectedThreads.length === 2) {
            elements.tapestry.fuseBtn.disabled = false;
        } else {
            elements.tapestry.fuseBtn.disabled = true;
        }

        elements.tapestry.alchemyUI.classList.toggle(
            'visible',
            threads.length >= 2
        );
    }

    // --- Splash Screen Logic ---
    function initSplash() {
        // Immediate visual entry
        requestAnimationFrame(() => {
            elements.splash.surface.style.opacity = '1';
        });

        if (initStatus === 'LOCKED') {
            elements.splash.calligraphy.textContent = 'SECURE ENCLAVE';
            elements.splash.calligraphy.style.color = '#ff0055'; // Tactical Red
            ui.showNotification(
                'SYSTEM LOCKED. ACCESS VIA TERMINAL (` or Ctrl+Space).',
                'error'
            );
        }

        setTimeout(() => {
            elements.splash.calligraphy.style.opacity = '1';
            elements.splash.calligraphy.style.transform = 'scale(1)';
        }, 800);

        const dismissSplash = () => {
            if (tapestryLedger.status === 'LOCKED') {
                ui.showNotification(
                    'AUTHENTICATION REQUIRED. ACCESS DENIED.',
                    'error'
                );
                terminal.toggle(); // Force open terminal
                return;
            }

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
        elements.screens.splash.addEventListener('click', dismissSplash, {
            once: true
        });
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
            return (
                Math.atan2(clientY - centerY, clientX - centerX) *
                (180 / Math.PI)
            );
        };

        const drag = (e) => {
            e.preventDefault();
            currentRotation = getAngle(e) - startAngle;
            ringElement.style.transform = `rotate(${currentRotation}deg)`;
        };

        const endDrag = () => {
            ringElement.classList.remove('dragging');
            ringElement.style.transition =
                'transform 0.8s var(--ease-out-quint)';
            document.body.style.cursor = 'default';

            const closestSnap = snapAngles.reduce((prev, curr) =>
                Math.abs(curr - (currentRotation % 360)) <
                Math.abs(prev - (currentRotation % 360))
                    ? curr
                    : prev
            );
            const revolutions = Math.round(currentRotation / 360);
            let finalRotation = revolutions * 360 + closestSnap;
            if (
                Math.abs(currentRotation - (finalRotation - 360)) <
                Math.abs(currentRotation - finalRotation)
            ) {
                finalRotation -= 360;
            }

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
            ringElement.classList.add('dragging');
            ringElement.style.transition = 'none';
            startAngle = getAngle(e) - currentRotation;
            document.body.style.cursor = 'grabbing';

            window.addEventListener('mousemove', drag);
            window.addEventListener('mouseup', endDrag);
            window.addEventListener('touchmove', drag, { passive: false });
            window.addEventListener('touchend', endDrag);
        };

        ringElement.addEventListener('mousedown', startDrag);
        ringElement.addEventListener('touchstart', startDrag, {
            passive: false
        });

        // Keyboard support
        ringElement.setAttribute('tabindex', '0');
        ringElement.setAttribute('role', 'slider');
        ringElement.setAttribute(
            'aria-label',
            ringElement.id === 'ring-intention' ? 'Intention Ring' : 'Time Ring'
        );

        ringElement.addEventListener('keydown', (e) => {
            let rotationChange = 0;
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp')
                rotationChange = -90;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown')
                rotationChange = 90;

            if (rotationChange !== 0) {
                e.preventDefault();
                currentRotation += rotationChange;
                ringElement.style.transition =
                    'transform 0.5s var(--ease-out-quint)';
                ringElement.style.transform = `rotate(${currentRotation}deg)`;

                // Find closest snap point (simplified for keyboard: just snap to next quadrant)
                const closestSnap = snapAngles.reduce((prev, curr) =>
                    Math.abs(curr - (currentRotation % 360)) <
                    Math.abs(prev - (currentRotation % 360))
                        ? curr
                        : prev
                );
                onSnap(closestSnap);
            }
        });
    }

    function updateAstrolabeState() {
        const keys = {
            intention: ['serenity', 'vibrancy', 'awe', 'legacy'],
            time: ['dawn', 'midday', 'dusk', 'night']
        };

        const updateSelection = (ring, angle) => {
            const index = (Math.round(angle / 90) + 4) % 4;
            state[ring] = keys[ring][index];
            const markers = elements.astrolabe.markers[ring];
            markers.forEach((m, i) =>
                m.classList.toggle('selected-marker', i === index)
            );
            updateCenterText();
        };

        setupRing(
            elements.astrolabe.rings.intention,
            [0, -90, -180, -270],
            (angle) => updateSelection('intention', angle)
        );
        setupRing(
            elements.astrolabe.rings.time,
            [0, -90, -180, -270],
            (angle) => updateSelection('time', angle)
        );

        // Initialize state
        updateSelection('intention', 0);
        updateSelection('time', 0);
    }
    function updateCenterText() {
        if (state.intention && state.time) {
            const regionMap = {
                serenity: 'coast',
                vibrancy: 'medina',
                awe: 'sahara',
                legacy: 'kasbah'
            };
            state.region = regionMap[state.intention];
            elements.astrolabe.centerText.textContent = `Find a path for ${state.intention} at ${state.time}`;
        } else {
            elements.astrolabe.centerText.textContent =
                'Use arrows or drag to align rings';
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
        elements.riad.imageElement.loading = 'lazy'; // Native lazy loading
        elements.riad.imageElement.src = locationData.image;

        elements.riad.title.textContent = locationData.title;
        elements.riad.subtitle.textContent = locationData.subtitle;
        elements.riad.narrative.textContent = locationData.narrative;
        elements.riad.sensory.sight.dataset.color =
            locationData.sensory.sight.color;
        elements.riad.sensory.sightDesc.textContent =
            locationData.sensory.sight.desc;
        elements.riad.sensory.sound.dataset.audio =
            locationData.sensory.sound.audio;
        elements.riad.sensory.soundDesc.textContent =
            locationData.sensory.sound.desc;
        elements.riad.sensory.scentDesc.textContent =
            locationData.sensory.scent.desc;
        elements.riad.sensory.touchDesc.textContent =
            locationData.sensory.touch.desc;
        elements.riad.foundation.text.textContent = locationData.foundation;
        elements.riad.weaveButton.dataset.color =
            locationData.sensory.sight.color;

        elements.screens.riad.scrollTop = 0;
        elements.riad.imageContainer.style.opacity = 1;
        elements.riad.weaveButton.classList.remove('visible');
        elements.riad.simulateButton.classList.remove('visible');
        setTimeout(
            () => {
                elements.riad.weaveButton.classList.add('visible');
                elements.riad.simulateButton.classList.add('visible');
            },
            1500
        );

        showScreen('riad');
    }

    function setupRiadInteractions() {
        elements.riad.backButton.addEventListener('click', () => {
            showScreen('astrolabe');
            elements.riad.weaveButton.classList.remove('visible');
            elements.riad.simulateButton.classList.remove('visible');
        });

        elements.screens.riad.addEventListener('scroll', () => {
            const scrollY = elements.screens.riad.scrollTop;
            const opacity = Math.max(
                0,
                1 - scrollY / (window.innerHeight * 0.7)
            );
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
            setTimeout(() => {
                elements.colorWash.style.opacity = 0;
            }, 600);
            resonanceEngine.playInteractionSound('click');
        });

        setupSensoryItem(elements.riad.sensory.sound, (e) => {
            resonanceEngine.resume();
            resonanceEngine.playInteractionSound('snap');
        });

        // Placeholder actions for scent/touch to ensure they are at least focusable
        setupSensoryItem(elements.riad.sensory.scent, () =>
            resonanceEngine.playInteractionSound('click')
        );
        setupSensoryItem(elements.riad.sensory.touch, () =>
            resonanceEngine.playInteractionSound('click')
        );

        // Foundation toggle accessibility
        elements.riad.foundation.toggle.setAttribute('tabindex', '0');
        elements.riad.foundation.toggle.setAttribute('role', 'button');
        elements.riad.foundation.toggle.setAttribute('aria-expanded', 'false');

        const toggleFoundation = () => {
            const isOpen =
                elements.riad.foundation.details.classList.toggle('open');
            elements.riad.foundation.plusIcon.classList.toggle('open');
            elements.riad.foundation.toggle.setAttribute(
                'aria-expanded',
                isOpen
            );
            resonanceEngine.playInteractionSound('click');
        };

        elements.riad.foundation.toggle.addEventListener(
            'click',
            toggleFoundation
        );
        elements.riad.foundation.toggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleFoundation();
            }
        });

        // "Weave a Thread" Interaction (Robust Long Press with Click Fallback)
        let pressTimer = null;
        let isLongPress = false;
        const LONG_PRESS_DURATION = 400; // Reduced for better responsiveness

        const startPress = (e) => {
            if (state.isWeaving) return;
            // Only left click or touch
            if (e.type === 'mousedown' && e.button !== 0) return;

            isLongPress = false;
            elements.riad.weaveButton.classList.add('pressing');

            pressTimer = setTimeout(() => {
                isLongPress = true;
                weaveThread();
                // Visual cleanup happens in weaveThread or endPress
                // But if long press triggers, we want to ensure endPress doesn't re-trigger
            }, LONG_PRESS_DURATION);
        };

        const endPress = (e) => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
            elements.riad.weaveButton.classList.remove('pressing');

            // If it wasn't a long press (timer cleared before execution), treat as click
            // However, we must ensure we don't double fire if the user just clicked normally.
            // The 'click' event will fire after mouseup/touchend.
            // So we can actually rely on the 'click' event for the short press,
            // and use this handler ONLY to cancel the visual state and the timer.
        };

        const handleClick = (e) => {
            // If long press occurred, we suppress the click action
            if (isLongPress) {
                isLongPress = false; // Reset
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            weaveThread();
        };

        // Pointer Events for unified touch/mouse handling
        // Note: 'click' fires after pointerup
        elements.riad.weaveButton.addEventListener('pointerdown', startPress);
        elements.riad.weaveButton.addEventListener('pointerup', endPress);
        elements.riad.weaveButton.addEventListener('pointerleave', endPress);
        elements.riad.weaveButton.addEventListener('click', handleClick);

        // Accessibility fallback: Enter key
        elements.riad.weaveButton.setAttribute('tabindex', '0');
        elements.riad.weaveButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                weaveThread();
            }
        });

        // Simulate Button Interaction
        elements.riad.simulateButton.addEventListener('click', () => {
            const proposed = {
                intention: state.intention,
                time: state.time,
                region: state.region,
                title: state.activeLocation.title
            };

            const report = chronos.simulate(tapestryLedger.getThreads(), proposed);

            ui.showSimulationResults(report, () => {
                weaveThread();
            });
            resonanceEngine.playInteractionSound('click');
        });

        elements.riad.simulateButton.setAttribute('tabindex', '0');
        elements.riad.simulateButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                elements.riad.simulateButton.click();
            }
        });
    }

    async function weaveThread() {
        if (state.isWeaving) return;

        // Prevent weaving if in Replay Mode
        if (panopticon && panopticon.isReplaying) {
            ui.showNotification('SYSTEM HALTED: REPLAY MODE ACTIVE', 'error');
            return;
        }

        state.isWeaving = true;

        resonanceEngine.playInteractionSound('weave');

        // Persist the thread
        await tapestryLedger.addThread({
            intention: state.intention,
            time: state.time,
            region: state.region,
            title: state.activeLocation.title
        });

        // Capture state for Panopticon (Time Travel)
        if (panopticon) panopticon.capture();

        // Trigger Aegis Tactical Analysis
        aegis.analyze(tapestryLedger.getThreads());

        // Trigger Sentinel Threat Assessment
        const threatReport = sentinel.assess(tapestryLedger.getThreads());

        // Trigger Valkyrie Response Matrix
        valkyrie.evaluate(threatReport, tapestryLedger.getThreads());

        if (threatReport.status !== 'STANDBY') {
            ui.showNotification(
                `SENTINEL ALERT: DEFCON ${threatReport.defcon}`,
                'warning'
            );
        }

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
        thread.style.backgroundColor =
            elements.riad.weaveButton.dataset.color || 'var(--ochre-gold)';
        document.body.appendChild(thread);

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const animationDuration = prefersReducedMotion ? 0 : 600;
        const fadeDuration = prefersReducedMotion ? 0 : 200;

        thread.animate(
            [
                { transform: `rotate(${angle}deg) scaleX(0)` },
                { transform: `rotate(${angle}deg) scaleX(1)` }
            ],
            { duration: animationDuration, easing: 'cubic-bezier(0.7, 0, 0.3, 1)' }
        ).onfinish = () => {
            thread.animate([{ opacity: 1 }, { opacity: 0 }], {
                duration: fadeDuration
            }).onfinish = () => {
                thread.remove();
                elements.astrolabe.tapestryIcon.classList.add(
                    'tapestry-icon-pulse'
                );
                setTimeout(() => {
                    elements.astrolabe.tapestryIcon.classList.remove(
                        'tapestry-icon-pulse'
                    );
                    state.isWeaving = false; // Reset the lock
                }, 500);
            };
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
            ui.showConfirm(
                'Are you sure you want to unravel your tapestry? This cannot be undone.',
                () => {
                    tapestryLedger.clear();
                    mandalaRenderer.render([]);
                    if (mapRenderer) mapRenderer.render([], locations);
                    ui.showNotification('Tapestry unraveled.', 'info');
                }
            );
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
            try {
                ui.showLoading('DECODING SCROLL...');
                const text = await file.text();
                await tapestryLedger.importScroll(text);
                ui.showNotification('Scroll imported successfully.', 'success');
                renderTapestry();
            } catch (err) {
                ui.showNotification(`Import error: ${err.message}`, 'error');
            } finally {
                ui.hideLoading();
                e.target.value = ''; // Reset
            }
        });

        // --- CODEX INTEGRATION ---
        elements.tapestry.forgeShardBtn.addEventListener('click', async () => {
            try {
                const threads = tapestryLedger.getThreads();
                if (threads.length === 0)
                    throw new Error('Tapestry is empty. Nothing to forge.');

                ui.showLoading('ENCRYPTING SHARD...');
                const blob = await codex.forgeShard(threads);
                ui.hideLoading();

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `codex_shard_${Date.now()}.png`;
                a.click();
                URL.revokeObjectURL(url);

                ui.showNotification('Shard forged successfully.', 'success');
                resonanceEngine.playInteractionSound('weave');
            } catch (e) {
                document.body.style.cursor = 'default';
                ui.showNotification(`Forge failed: ${e.message}`, 'error');
            }
        });

        elements.tapestry.scanShardBtn.addEventListener('click', () => {
            elements.tapestry.shardInput.click();
        });

        elements.tapestry.shardInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                ui.showLoading('DECRYPTING SHARD...');
                const data = await codex.scanShard(file);
                ui.hideLoading();

                // Use existing import logic
                const tempLedger = new TapestryLedger('temp');
                tempLedger.threads = data;
                const jsonString = JSON.stringify(data);
                await tapestryLedger.importScroll(jsonString);

                ui.showNotification(
                    'Shard decrypted and integrated.',
                    'success'
                );
                resonanceEngine.playInteractionSound('snap');
                renderTapestry();
            } catch (e) {
                document.body.style.cursor = 'default';
                console.error(e);
                ui.showNotification(`Scan failed: ${e.message}`, 'error');
            }
            e.target.value = '';
        });

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (state.activeScreen === 'tapestry') {
                    if (mandalaRenderer) {
                        mandalaRenderer.resize();
                        mandalaRenderer.render(tapestryLedger.getThreads());
                    }
                    if (mapRenderer) {
                        mapRenderer.resize();
                        mapRenderer.render(
                            tapestryLedger.getThreads(),
                            locations
                        );
                    }
                }
            }, 100);
        });

        // Mandala Interaction (Click & Accessibility)
        const handleThreadInteraction = (index) => {
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
                renderTapestry();
                resonanceEngine.playInteractionSound('click');
                updateAlchemyUI();
            }
        };

        elements.tapestry.canvas.addEventListener('click', (e) => {
            if (!mandalaRenderer) return;
            // Only handle click if map is NOT active (or canvas is hidden via CSS, which we need to ensure)
            if (state.isMapActive) return;

            const index = mandalaRenderer.getThreadIndexAt(
                e.clientX,
                e.clientY
            );
            handleThreadInteraction(index);
        });

        // Listen for accessibility events from Shadow DOM
        elements.tapestry.canvas.addEventListener(
            'tapestry-thread-click',
            (e) => {
                handleThreadInteraction(e.detail.index);
            }
        );

        // Synapse Interaction (Mouse)
        ['mousedown', 'mousemove', 'mouseup'].forEach(evt => {
            elements.tapestry.canvas.addEventListener(evt, (e) => {
                if (state.isSynapseActive && synapseRenderer) {
                    // Just pass raw coordinates, renderer handles scale
                    // But wait, renderer needs client relative to canvas.
                    // The renderer expects "client" relative to top-left?
                    // SynapseRenderer handleInput uses getBoundingClientRect internally.
                    // So we pass clientX/Y.
                    const type = evt === 'mousedown' ? 'down' : evt === 'mousemove' ? 'move' : 'up';
                    synapseRenderer.handleInput(type, e.clientX, e.clientY);

                    if (synapseRenderer.isSimulating) {
                         startHorizonLoop(); // Ensure loop is running for physics
                    }
                }
            });
        });

        elements.tapestry.fuseBtn.addEventListener('click', async () => {
            const threads = tapestryLedger.getThreads();
            if (state.selectedThreads.length !== 2) return;

            const t1 = threads[state.selectedThreads[0]];
            const t2 = threads[state.selectedThreads[1]];

            const phantom = await alchemy.fuse(t1, t2);

            resonanceEngine.playInteractionSound('weave'); // Magical sound
            showScreen('riad');
            showRiad(phantom);

            // Inject a special visual cue for Phantom mode
            elements.riad.title.style.color = '#c67605'; // Gold title
            elements.riad.subtitle.textContent = '✧ A PHANTOM REALM ✧';

            // Clear selection
            state.selectedThreads = [];
        });

        // Horizon Interaction
        elements.tapestry.horizonToggle.addEventListener('click', () => {
            state.isHorizonActive = !state.isHorizonActive;
            elements.tapestry.horizonToggle.classList.toggle(
                'active',
                state.isHorizonActive
            );
            elements.tapestry.horizonDashboard.classList.toggle(
                'visible',
                state.isHorizonActive
            );

            if (state.isHorizonActive) {
                updateHorizonDashboard();
                startHorizonLoop();
            } else {
                stopHorizonLoop();
                renderTapestry(); // One last render to clear ghosts
            }
            resonanceEngine.playInteractionSound('click');
        });

        // Map Interaction (Overwatch)
        elements.tapestry.mapToggle.addEventListener('click', () => {
            state.isMapActive = !state.isMapActive;
            elements.tapestry.mapToggle.classList.toggle('active', state.isMapActive);

            // Exclusive Mode Logic
            if (state.isMapActive) {
                state.isSynapseActive = false;
                elements.tapestry.synapseToggle.classList.remove('active');

                elements.tapestry.canvas.style.display = 'none';
                elements.tapestry.mapCanvas.style.display = 'block';
                if (!mapRenderer) mapRenderer = new MapRenderer(elements.tapestry.mapCanvas);
                mapRenderer.resize();
                mapRenderer.render(tapestryLedger.getThreads(), locations);
            } else {
                // Return to previous state or default?
                // If map is off, we show mandala (or synapse if it was active? No, we turned it off).
                // Default to Mandala.
                elements.tapestry.canvas.style.display = 'block';
                elements.tapestry.mapCanvas.style.display = 'none';
                renderTapestry();
            }
            resonanceEngine.playInteractionSound('click');
        });

        // Synapse Interaction
        elements.tapestry.synapseToggle.addEventListener('click', () => {
            state.isSynapseActive = !state.isSynapseActive;
            elements.tapestry.synapseToggle.classList.toggle('active', state.isSynapseActive);

            if (state.isSynapseActive) {
                // Disable Map
                state.isMapActive = false;
                elements.tapestry.mapToggle.classList.remove('active');
                elements.tapestry.mapCanvas.style.display = 'none';

                // Enable Canvas
                elements.tapestry.canvas.style.display = 'block';

                // Initialize Graph
                const threads = tapestryLedger.getThreads();
                const graph = cortex.analyze(threads);
                if (!synapseRenderer) synapseRenderer = new SynapseRenderer(elements.tapestry.canvas);
                synapseRenderer.render(graph);

                startHorizonLoop(); // Start physics loop
            } else {
                renderTapestry(); // Back to Mandala
                stopHorizonLoop(); // Unless Horizon is active?
                if (state.isHorizonActive) startHorizonLoop();
            }
            resonanceEngine.playInteractionSound('click');
        });

        // Aegis Interaction
        elements.tapestry.aegisToggle.addEventListener('click', () => {
            const isVisible =
                elements.tapestry.aegisHud.classList.toggle('visible');
            elements.tapestry.aegisToggle.classList.toggle('active', isVisible);

            if (isVisible) {
                aegis.renderDashboard('aegis-hud');
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

        elements.tapestry.horizonDominance.textContent =
            analysis.dominance.intention !== 'None'
                ? `${analysis.dominance.intention} (${analysis.dominance.percent}%)`
                : 'None';
        elements.tapestry.horizonBalanceBar.style.width = `${analysis.balanceScore}%`;

        // Dynamic Insight
        if (threads.length < 3) {
            elements.tapestry.horizonInsight.textContent =
                'More data needed for strategic projection.';
        } else if (analysis.balanceScore < 40) {
            elements.tapestry.horizonInsight.textContent = `Pattern is heavily skewed. Consider seeking ${findLeastCommon(analysis.counts)} to restore equilibrium.`;
        } else if (analysis.streak > 2) {
            elements.tapestry.horizonInsight.textContent = `Strong momentum in ${analysis.lastIntention}. Continuing this path will deepen the groove.`;
        } else {
            elements.tapestry.horizonInsight.textContent =
                'The pattern is balanced. You are weaving a diverse tapestry.';
        }
    }

    function findLeastCommon(counts) {
        return Object.entries(counts).sort((a, b) => a[1] - b[1])[0][0];
    }

    function renderTapestry() {
        const threads = tapestryLedger.getThreads();

        // Update Tactical Units
        vanguard.tick();

        // 1. Map Mode
        if (state.isMapActive) {
            if (oracleEngine && oracleEngine.activeMode) {
                oracleEngine.render(threads);
            } else if (mapRenderer) {
                const threatReport = sentinel.getReport();
                mapRenderer.render(
                    threads,
                    locations,
                    [],
                    threatReport.zones,
                    vanguard.getUnits()
                );
            }
            // Force animation loop if map is active and units are present,
            // even if horizon loop isn't running.
            if (vanguard.getUnits().length > 0) {
                 requestAnimationFrame(renderTapestry);
            }
            return;
        }

        // 2. Synapse Mode
        if (state.isSynapseActive && synapseRenderer) {
             // If simulating, render is called in loop
             // We just ensure we call render which handles simulation step
             // Note: analyze is expensive, so we only re-analyze if needed or rely on stored graph.
             // But synapseRenderer keeps state. We just call render.
             // If threads changed, we might need to update graph.
             // For now, simple loop:
             synapseRenderer.render();
             return;
        }

        // 3. Mandala Mode (Default)
        if (!mandalaRenderer) return;

        let projections = [];
        if (state.isHorizonActive) {
            projections = horizonEngine.project(threads);
        }

        mandalaRenderer.render(threads, projections);
    }

    // --- Helper Functions ---
    const handleThreadInteraction = (index) => {
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
            if (mandalaRenderer) mandalaRenderer.setSelection(state.selectedThreads);
            renderTapestry();
            resonanceEngine.playInteractionSound('click');
            updateAlchemyUI();
        }
    };

    // --- Initialization ---
    // Handle Browser Back Button
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.screen) {
            // Restore screen without pushing to history again
            showScreen(event.state.screen, false);
            // If we are back at Riad, we might need to restore location?
            // Currently simple screen restore. For Riad, it persists in DOM so it's fine.
        } else {
            // Default to splash or astrolabe if history is empty/unknown
            showScreen('astrolabe', false);
        }
    });

    // --- Neural Link Integration ---
    terminal.mount('terminal-container');

    // Global toggle
    window.addEventListener('keydown', (e) => {
        if (e.key === '`' || (e.ctrlKey && e.code === 'Space')) {
            e.preventDefault();
            terminal.toggle();
        }
    });

    // --- Register Terminal Commands ---
    registerCommands(terminal, {
        state,
        tapestryLedger,
        engines: {
            resonance: resonanceEngine,
            horizon: horizonEngine,
            get oracle() {
                return oracleEngine;
            },
            spectra,
            sentinel,
            aegis,
            codex,
            alchemy,
            chronos,
            cortex,
            valkyrie,
            valkyrieUI,
            vanguard,
            gemini,
            stratcom,
            get panopticon() {
                return panopticon;
            }
        },
        ui,
        elements,
        actions: {
            showScreen,
            showRiad,
            weaveThread,
            renderTapestry
        }
    });

    // Initialize Panopticon (Tactical Replay)
    // It needs access to renderTapestry which handles both map and mandala
    // But renderTapestry relies on closure variables (mapRenderer, etc).
    // We can pass a proxy object to Panopticon.
    try {
        panopticon = new PanopticonEngine(
            tapestryLedger,
            sentinel,
            {
                get mandala() { return mandalaRenderer; },
                get map() { return mapRenderer; },
                updateAlchemy: updateAlchemyUI
            },
            ui
        );
        // DEBUG: console.log("Panopticon initialized:", panopticon);
    } catch (e) {
        console.error("Panopticon Init Error:", e);
    }

    initSplash();
    updateAstrolabeState();
    setupRiadInteractions();
    setupTapestryInteractions();

    // --- Operation Ghost Guide ---
    function initGhostGuide() {
        const overlay = document.getElementById('ghost-guide-overlay');
        const steps = overlay.querySelectorAll('.guide-step');
        const dots = overlay.querySelectorAll('.dot');
        const nextBtn = document.getElementById('guide-next-btn');
        const prevBtn = document.getElementById('guide-prev-btn');
        const skipBtn = document.getElementById('guide-skip-btn');
        const helpBtn = document.getElementById('help-trigger');

        // Create Backdrop dynamically
        let backdrop = document.querySelector('.guide-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'guide-backdrop';
            document.body.appendChild(backdrop);
        }

        let currentStep = 0;
        let currentSpotlight = null;

        const cleanupSpotlight = () => {
            if (currentSpotlight) {
                currentSpotlight.classList.remove('guide-spotlight');
                currentSpotlight = null;
            }
            backdrop.classList.remove('visible');
        };

        const updateGuide = () => {
            steps.forEach((s, i) => s.classList.toggle('active', i === currentStep));
            dots.forEach((d, i) => d.classList.toggle('active', i === currentStep));
            prevBtn.disabled = currentStep === 0;
            nextBtn.textContent = currentStep === steps.length - 1 ? 'FINISH' : 'NEXT';

            // Spotlight Logic
            if (currentSpotlight) {
                currentSpotlight.classList.remove('guide-spotlight');
                currentSpotlight = null;
            }

            const activeStepEl = steps[currentStep];
            // Ensure we handle cases where the element might be missing data-target
            const targetSelector = activeStepEl.dataset.target;

            if (targetSelector) {
                const target = document.querySelector(targetSelector);
                if (target) {
                    target.classList.add('guide-spotlight');
                    currentSpotlight = target;
                    backdrop.classList.add('visible');

                    // Only scroll if strictly necessary to avoid jarring jumps
                    // target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    // If target not found (e.g. wrong screen), hide backdrop
                    backdrop.classList.remove('visible');
                }
            } else {
                backdrop.classList.remove('visible');
            }
        };

        const showGuide = () => {
            currentStep = 0;
            overlay.classList.remove('hidden');
            // Ensure we are on the right screen for the start?
            // The guide assumes we are on Astrolabe usually.
            if (state.activeScreen !== 'astrolabe') {
                showScreen('astrolabe');
            }
            requestAnimationFrame(updateGuide);
        };

        const closeGuide = () => {
            overlay.classList.add('hidden');
            cleanupSpotlight();
            localStorage.setItem('marq_onboarded', 'true');
        };

        nextBtn.addEventListener('click', () => {
            if (currentStep < steps.length - 1) {
                currentStep++;
                updateGuide();
            } else {
                closeGuide();
            }
        });

        prevBtn.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep--;
                updateGuide();
            }
        });

        skipBtn.addEventListener('click', closeGuide);

        helpBtn.addEventListener('click', showGuide);

        // Auto-show on first run
        if (!localStorage.getItem('marq_onboarded')) {
            // Slight delay to allow splash screen to clear
            setTimeout(showGuide, 2000);
        }
    }

    initGhostGuide();

    elements.astrolabe.center.addEventListener('click', () => {
        if (tapestryLedger.status === 'LOCKED') {
            ui.showNotification('ACCESS DENIED', 'error');
            return;
        }
        const path = `${state.intention}.${state.region}.${state.time}`;
        const targetLocation = locations[path];
        if (targetLocation) {
            resonanceEngine.startAmbience(state.intention, state.time);
            showScreen('riad');
            showRiad(targetLocation);
        } else {
            elements.astrolabe.center.animate(
                [
                    { transform: 'translateX(0px)' },
                    { transform: 'translateX(-5px)' },
                    { transform: 'translateX(5px)' },
                    { transform: 'translateX(0px)' }
                ],
                { duration: 300, iterations: 1 }
            );
            elements.astrolabe.centerText.textContent = 'No path found';
            setTimeout(updateCenterText, 2000);
        }
    });

    // Stop ambience when going back to astrolabe
    elements.riad.backButton.addEventListener('click', () => {
        resonanceEngine.stopAmbience();
    });

    // --- DEBUG / TESTING EXPOSURE (REQUIRED FOR VERIFICATION SCRIPTS) ---
    // These exposures are strictly for automated testing (tests/verify_app.py)
    // and runtime debugging. In a compiled production environment, these
    // should be stripped or gated behind a flag.
    window.tapestryLedger = tapestryLedger;
    window.state = state;
    window.codex = codex;
    Object.defineProperty(window, 'mandalaRenderer', {
        get: () => mandalaRenderer
    });
    Object.defineProperty(window, 'mapRenderer', {
        get: () => mapRenderer
    });
    window.ui = ui;
    window.showNotification = (msg, type) => ui.showNotification(msg, type);
    window.showScreen = showScreen;
    Object.defineProperty(window, 'oracle', {
        get: () => oracleEngine
    });
    window.aegis = aegis;
    window.sentinel = sentinel;
    window.terminal = terminal;
    window.spectra = spectra;
    window.panopticon = panopticon;
    window.valkyrie = valkyrie;
    window.vanguard = vanguard;
});

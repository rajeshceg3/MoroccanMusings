import './error-guard.js'; // Global error handler
import { locations } from './data.js';
import { TapestryLedger } from './tapestry.js';
import { ResonanceEngine } from './audio-engine.js';
import { SynthesisEngine } from './alchemy.js';
import { HorizonEngine } from './horizon.js';
import { CodexEngine } from './codex.js';
import { TerminalSystem } from './terminal.js';
import { UISystem } from './ui-system.js';
import { SpectraEngine } from './spectra.js';
import { AegisEngine } from './aegis.js';
import { SentinelEngine } from './sentinel.js';
import { ChronosEngine } from './chronos.js';
import { PanopticonEngine } from './panopticon.js';
import { CortexEngine } from './cortex.js';
import { ValkyrieEngine } from './valkyrie.js';
import { ValkyrieUI } from './valkyrie-ui.js';
import { VanguardEngine } from './vanguard.js';
import { GeminiEngine } from './gemini.js';
import { StratcomSystem } from './stratcom.js';
import { registerCommands } from './terminal-commands.js';
import { MnemosyneEngine } from './mnemosyne.js';
import { CitadelEngine } from './citadel.js';
import { PrometheusEngine } from './prometheus.js';
import { GhostGuide } from './ghost-guide.js';
import { RiadUI } from './riad-ui.js';
import { AstrolabeUI } from './astrolabe-ui.js';
import { StratagemEngine } from './stratagem.js';
import { StratagemUI } from './stratagem-ui.js';
import { SettingsUI } from './settings-ui.js';
import { LegionEngine } from './legion.js';
import { LegionUI } from './legion-ui.js';
import { SplashController } from './controllers/SplashController.js';
import { WeavingController } from './controllers/WeavingController.js';
import { TapestryController } from './controllers/TapestryController.js';
import { state } from './state.js';

export async function bootstrap() {
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

    const resonanceEngine = new ResonanceEngine();
    const settings = new SettingsUI(ui, resonanceEngine);
    const settingsBtn = document.getElementById('settings-trigger');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => settings.show());
    }

    const horizonEngine = new HorizonEngine();
    const codex = new CodexEngine();
    const spectra = new SpectraEngine();

    const signalBtn = document.getElementById('signal-trigger');
    if (signalBtn) {
        signalBtn.addEventListener('click', () => {
            ui.showEchoInterface('listen', spectra, () => {
                // enhancing UX with terminal log on close is nice but optional
            });
            resonanceEngine.playInteractionSound('click');
        });
    }

    const terminal = new TerminalSystem();
    const aegis = new AegisEngine(ui, horizonEngine);
    const sentinel = new SentinelEngine(horizonEngine);
    const chronos = new ChronosEngine(horizonEngine, SentinelEngine);
    const cortex = new CortexEngine();
    const citadel = new CitadelEngine(locations);

    // Panopticon initialization is deferred
    let panopticon = null;

    // Auto-Lock Mechanism
    let idleTimer;
    const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 Minutes

    function resetIdleTimer() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
             if (tapestryLedger.status !== 'LOCKED') {
                 tapestryLedger.lock();
                 ui.showNotification('SESSION EXPIRED. SYSTEM LOCKED.', 'warning');
                 if (state.activeScreen !== 'splash') {
                    // Optional: force splash
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

    // Initialize Mnemosyne (Semantic Intelligence)
    const mnemosyne = new MnemosyneEngine();
    mnemosyne.ingest(tapestryLedger.getThreads());

    // Initialize Vanguard (Tactical Units)
    const vanguard = new VanguardEngine(sentinel, aegis, tapestryLedger);

    // Initialize Prometheus (Strategic Synthesis)
    const prometheus = new PrometheusEngine(tapestryLedger, vanguard, mnemosyne, ui);

    window.addEventListener('vanguard-synthesis-complete', (e) => {
        prometheus.synthesize(e.detail.unit);
    });

    window.addEventListener('prometheus-draft', (e) => {
        const draft = e.detail;
        ui.showNotification(`PROMETHEUS: New Intelligence Synthesized - ${draft.title}`, 'success');
        resonanceEngine.playInteractionSound('spark');
    });

    const valkyrie = new ValkyrieEngine(terminal, ui, tapestryLedger, horizonEngine, vanguard, citadel);
    const valkyrieUI = new ValkyrieUI(valkyrie);

    const stratagem = new StratagemEngine({
        TapestryLedger,
        VanguardEngine,
        CitadelEngine,
        SentinelEngine,
        HorizonEngine
    }, locations);

    const stratagemUI = new StratagemUI(stratagem, null, ui);

    const stratcom = new StratcomSystem(tapestryLedger, horizonEngine, sentinel, vanguard, terminal, ui);

    // Initialize Legion (Swarm Intelligence)
    const legion = new LegionEngine(vanguard, chronos, sentinel, citadel, cortex, locations);
    const legionUI = new LegionUI(legion);

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
            citadelToggle: document.getElementById('citadel-toggle'),
            horizonDashboard: document.getElementById('horizon-dashboard'),
            horizonDominance: document.getElementById('horizon-dominance'),
            horizonBalanceBar: document.getElementById('horizon-balance-bar'),
            horizonInsight: document.getElementById('horizon-insight'),
            aegisHud: document.getElementById('aegis-hud')
        },
        colorWash: document.querySelector('.color-wash')
    };

    // Inject Mnemosyne Container
    const mnemosyneContainer = document.createElement('div');
    mnemosyneContainer.id = 'mnemosyne-ui';
    mnemosyneContainer.style.cssText = `
        position: absolute;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        width: 320px;
        background: rgba(10, 10, 10, 0.95);
        border: 1px solid var(--sage-green);
        border-radius: 4px;
        padding: 0;
        display: none;
        z-index: 100;
        backdrop-filter: blur(5px);
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;
    elements.tapestry.alchemyUI.parentNode.insertBefore(mnemosyneContainer, elements.tapestry.alchemyUI);

    const alchemy = new SynthesisEngine();

    function showScreen(screenName, addToHistory = true) {
        if (addToHistory && state.activeScreen !== screenName) {
            history.pushState({ screen: screenName }, '', `#${screenName}`);
        }

        state.activeScreen = screenName;
        ui.lockTransition(50); // Micro-lock to prevent event ghosting
        for (const key in elements.screens) {
            elements.screens[key].classList.remove('active');
        }
        elements.screens[screenName].classList.add('active');

        // Accessibility Focus Management
        if (screenName === 'astrolabe') {
            elements.astrolabe.rings.intention.focus();
        } else if (screenName === 'riad') {
            elements.riad.backButton.focus();
        } else if (screenName === 'tapestry') {
            elements.tapestry.backButton.focus();
        }

        if (screenName === 'tapestry') {
            elements.screens.tapestry.classList.add('tapestry-active');
            tapestryController.onShow();
        } else {
            elements.screens.tapestry.classList.remove('tapestry-active');
            tapestryController.onHide();
        }
    }

    // --- Astrolabe Logic ---
    const astrolabeUI = new AstrolabeUI(elements, state, resonanceEngine);
    astrolabeUI.init();
    const updateCenterText = astrolabeUI.updateCenterText;

    const weavingController = new WeavingController({
        state,
        stratagem,
        ui,
        get panopticon() { return panopticon; },
        resonanceEngine,
        tapestryLedger,
        mnemosyne,
        aegis,
        sentinel,
        valkyrie,
        citadel,
        elements
    });

    const weaveThread = () => weavingController.weave();

    // --- Riad Screen Logic ---
    const riadUI = new RiadUI(elements, state, resonanceEngine, ui, chronos, tapestryLedger, { showScreen, weaveThread });
    const showRiad = riadUI.show;
    riadUI.setupInteractions();


    const tapestryController = new TapestryController({
        state,
        elements,
        mnemosyneContainer,
        mnemosyne,
        tapestryLedger,
        vanguard,
        resonanceEngine,
        sentinel,
        ui,
        citadel,
        horizonEngine,
        locations,
        get panopticon() { return panopticon; },
        stratagem,
        legion,
        prometheus,
        codex,
        alchemy,
        cortex,
        aegis,
        valkyrieUI,
        showScreen,
        showRiad: (...args) => showRiad(...args),
        showDraft
    });
    tapestryController.init();

    // --- Prometheus Draft Logic ---
    function showDraft(draft) {
        const realLoc = locations[draft.locationKey];
        if (!realLoc) return;

        // Populate Riad with Draft Data
        showRiad({
            ...realLoc,
            title: draft.title,
            narrative: draft.content,
            foundation: "PROMETHEUS INTERCEPT: APPROVE TO INTEGRATE.",
            subtitle: "SYNTHESIZED INTELLIGENCE"
        });

        // Override Buttons
        const weaveBtn = elements.riad.weaveButton;
        const simBtn = elements.riad.simulateButton;

        // Clone to clear listeners
        const newWeaveBtn = weaveBtn.cloneNode(true);
        const newSimBtn = simBtn.cloneNode(true);
        weaveBtn.parentNode.replaceChild(newWeaveBtn, weaveBtn);
        simBtn.parentNode.replaceChild(newSimBtn, simBtn);

        // Update References
        elements.riad.weaveButton = newWeaveBtn;
        elements.riad.simulateButton = newSimBtn;

        // Style
        newWeaveBtn.textContent = 'INTEGRATE SIGNAL';
        newWeaveBtn.style.background = 'var(--vibrancy-amber)';
        newWeaveBtn.style.color = '#000';

        newSimBtn.textContent = 'DISCARD';
        newSimBtn.style.background = 'var(--awe-red)';

        // Listeners
        newWeaveBtn.addEventListener('click', async () => {
             // Integrate
             ui.showLoading('INTEGRATING SIGNAL...');
             await tapestryLedger.addThread({
                 intention: draft.intention,
                 time: draft.time,
                 region: draft.region,
                 title: draft.title,
                 content: draft.content
             });
             prometheus.removeDraft(draft.id);
             ui.hideLoading();
             ui.showNotification('SIGNAL INTEGRATED.', 'success');
             restoreRiadButtons();
             showScreen('tapestry');
        });

        newSimBtn.addEventListener('click', () => {
             prometheus.removeDraft(draft.id);
             ui.showNotification('SIGNAL PURGED.', 'info');
             restoreRiadButtons();
             showScreen('tapestry');
        });
    }

    function restoreRiadButtons() {
        // Restore original Riad buttons
        const weaveBtn = elements.riad.weaveButton;
        const simBtn = elements.riad.simulateButton;

        const newWeaveBtn = weaveBtn.cloneNode(true);
        const newSimBtn = simBtn.cloneNode(true);

        weaveBtn.parentNode.replaceChild(newWeaveBtn, weaveBtn);
        simBtn.parentNode.replaceChild(newSimBtn, simBtn);

        elements.riad.weaveButton = newWeaveBtn;
        elements.riad.simulateButton = newSimBtn;

        // Reset Styles
        newWeaveBtn.textContent = 'Weave a Thread';
        const weaveProgress = document.createElement('div');
        weaveProgress.className = 'weave-progress';
        newWeaveBtn.appendChild(weaveProgress);

        newWeaveBtn.style.background = '';
        newWeaveBtn.style.color = '';
        newSimBtn.textContent = 'Simulate';
        newSimBtn.style.background = '';

        riadUI.setupInteractions();
    }

    // --- Events dependent on controllers ---

    window.addEventListener('stratagem-reset', async () => {
        const liveState = {
            ledger: tapestryLedger,
            vanguard: vanguard,
            citadel: citadel
        };
        await stratagem.init(liveState);
        stratagemUI.update();
        ui.showNotification('SIMULATION RESET. STATE RESYNCED.', 'info');
    });

    window.addEventListener('stratagem-commit', async () => {
        ui.showLoading('EXECUTING STRATEGY...');
        await stratagem.commit(tapestryLedger, vanguard, citadel);
        stratagemUI.hide();
        ui.hideLoading();
        ui.showNotification('STRATEGY EXECUTED. REALITY UPDATED.', 'success');
        resonanceEngine.playInteractionSound('weave');
        tapestryController.render();
    });

    window.addEventListener('storage', async (e) => {
        if (e.key === tapestryLedger.storageKey) {
            await tapestryLedger.reload();
            tapestryController.render();
            tapestryController.updateAlchemyUI();
        }
    });

    // --- Initialization ---
    // Handle Browser Back Button
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.screen) {
            showScreen(event.state.screen, false);
        } else {
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
                return tapestryController.oracleEngine;
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
            citadel,
            prometheus,
            stratagem,
            stratagemUI,
            legion,
            legionUI,
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
            renderTapestry: tapestryController.render
        }
    });

    // Initialize Panopticon (Tactical Replay)
    try {
        panopticon = new PanopticonEngine(
            tapestryLedger,
            sentinel,
            {
                get mandala() { return tapestryController.mandalaRenderer; },
                get map() { return tapestryController.mapRenderer; },
                updateAlchemy: () => tapestryController.updateAlchemyUI()
            },
            ui,
            vanguard,
            citadel,
            prometheus
        );
    } catch (e) {
        console.error("Panopticon Init Error:", e);
        ui.showNotification('PANOPTICON SYSTEM FAILURE. REPLAY OFFLINE.', 'error');
    }

    const splashController = new SplashController(
        elements,
        ui,
        terminal,
        tapestryLedger,
        resonanceEngine,
        showScreen
    );
    splashController.init(initStatus);

    const ghostGuide = new GhostGuide(state, resonanceEngine, showScreen, ui);
    ghostGuide.init();

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

    elements.riad.backButton.addEventListener('click', () => {
        resonanceEngine.stopAmbience();
    });

    // --- DEBUG / TESTING EXPOSURE ---
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') {
        window.tapestryLedger = tapestryLedger;
        window.state = state;
        window.codex = codex;
        Object.defineProperty(window, 'mandalaRenderer', {
            get: () => tapestryController.mandalaRenderer
        });
        Object.defineProperty(window, 'mapRenderer', {
            get: () => tapestryController.mapRenderer
        });
        window.ui = ui;
        window.showNotification = (msg, type) => ui.showNotification(msg, type);
        window.showScreen = showScreen;
        Object.defineProperty(window, 'oracle', {
            get: () => tapestryController.oracleEngine
        });
        window.aegis = aegis;
        window.sentinel = sentinel;
        window.terminal = terminal;
        window.spectra = spectra;
        window.panopticon = panopticon;
        window.valkyrie = valkyrie;
        window.vanguard = vanguard;
        window.citadel = citadel;
        window.prometheus = prometheus;
        window.stratagem = stratagem;
        window.legion = legion;
        console.warn("%c DEBUG MODE ACTIVE // GLOBAL EXPOSURE ENABLED ", "background: #c67605; color: #000; padding: 4px; font-weight: bold;");
    }

    // Boot Sequence Visual
    console.log(
        "%c PROJECT MARQ // INITIALIZED ",
        "background: #c67605; color: #000; font-size: 14px; font-weight: bold; padding: 5px; border: 2px solid #fff;"
    );
    console.log(
        "%c TACTICAL SYSTEMS: ONLINE ",
        "color: #55ffaa; font-family: monospace;"
    );

    // Signal Readiness
    window.dispatchEvent(new CustomEvent('marq-ready'));
}

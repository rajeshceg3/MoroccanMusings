export class SplashController {
    /**
     * @param {Object} elements - DOM elements reference
     * @param {Object} ui - UI System instance
     * @param {Object} terminal - Terminal System instance
     * @param {Object} tapestryLedger - Tapestry Ledger instance
     * @param {Object} resonanceEngine - Audio Engine instance
     * @param {Function} showScreen - Function to switch screens
     */
    constructor(elements, ui, terminal, tapestryLedger, resonanceEngine, showScreen) {
        this.elements = elements;
        this.ui = ui;
        this.terminal = terminal;
        this.tapestryLedger = tapestryLedger;
        this.resonanceEngine = resonanceEngine;
        this.showScreen = showScreen;
    }

    /**
     * Initialize the Splash Screen sequence
     * @param {string} initStatus - Initialization status of the Ledger
     */
    init(initStatus) {
        // Immediate visual entry
        requestAnimationFrame(() => {
            this.elements.splash.surface.style.opacity = '1';
        });

        if (initStatus === 'LOCKED') {
            this.elements.splash.calligraphy.textContent = 'SECURE ENCLAVE';
            this.elements.splash.calligraphy.style.color = '#ff0055'; // Tactical Red
            this.ui.showNotification(
                'SYSTEM LOCKED. ACCESS VIA TERMINAL (` or Ctrl+Space).',
                'error'
            );
        }

        setTimeout(() => {
            this.elements.splash.calligraphy.style.opacity = '1';
            this.elements.splash.calligraphy.style.transform = 'scale(1)';
        }, 800);

        const dismissSplash = () => {
            if (this.tapestryLedger.status === 'LOCKED') {
                this.ui.showNotification(
                    'AUTHENTICATION REQUIRED. ACCESS DENIED.',
                    'error'
                );
                this.terminal.toggle(); // Force open terminal
                return;
            }

            this.resonanceEngine.init(); // Initialize audio context on first gesture
            this.resonanceEngine.resume();
            this.elements.splash.calligraphy.style.opacity = '0';
            this.showScreen('astrolabe');
            // Remove listener to prevent multiple calls
            window.removeEventListener('keydown', handleSplashKey);
        };

        const handleSplashKey = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                dismissSplash();
            }
        };

        // Allow interaction immediately
        this.elements.screens.splash.style.cursor = 'pointer';
        this.elements.screens.splash.addEventListener('click', dismissSplash, {
            once: true
        });
        window.addEventListener('keydown', handleSplashKey);
    }
}

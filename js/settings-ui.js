export class SettingsUI {
    constructor(uiSystem, resonanceEngine) {
        this.ui = uiSystem;
        this.audio = resonanceEngine;
        this.prefs = {
            muted: localStorage.getItem('marq_muted') === 'true',
            reducedMotion: localStorage.getItem('marq_reduced_motion') === 'true',
            highContrast: localStorage.getItem('marq_high_contrast') === 'true'
        };

        this.overlay = null;
        this.container = null;
        this.previousFocus = null;
        this._handleKeydown = this._handleKeydown.bind(this);

        this.init();
    }

    init() {
        this.applyState();
        this._createModal();
    }

    applyState() {
        // Audio
        this.audio.mute(this.prefs.muted);

        // Motion
        if (this.prefs.reducedMotion) {
            document.body.classList.add('reduce-motion');
        } else {
            document.body.classList.remove('reduce-motion');
        }

        // Contrast
        if (this.prefs.highContrast) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }
    }

    toggle(key) {
        if (key in this.prefs) {
            this.prefs[key] = !this.prefs[key];
            localStorage.setItem(`marq_${key}`, this.prefs[key]);
            this.applyState();
            return this.prefs[key];
        }
    }

    _createModal() {
        // Create the modal structure in memory
        this.overlay = document.createElement('div');
        this.overlay.className = 'overlay hidden settings-overlay';
        this.overlay.id = 'settings-overlay';

        // A11y attributes
        this.overlay.setAttribute('role', 'dialog');
        this.overlay.setAttribute('aria-modal', 'true');
        this.overlay.setAttribute('aria-label', 'System Preferences');

        this.overlay.innerHTML = `
            <div class="settings-container">
                <div class="settings-header">
                    <div class="settings-title">SYSTEM PREFERENCES</div>
                    <button class="settings-close-btn" aria-label="Close Settings">X</button>
                </div>
                <div class="settings-content">
                    <div class="setting-row">
                        <label for="setting-audio">STEALTH MODE (MUTE)</label>
                        <input type="checkbox" id="setting-audio" ${this.prefs.muted ? 'checked' : ''}>
                    </div>
                    <div class="setting-row">
                        <label for="setting-motion">MOTION SICKNESS PROTOCOL</label>
                        <input type="checkbox" id="setting-motion" ${this.prefs.reducedMotion ? 'checked' : ''}>
                    </div>
                    <div class="setting-row">
                        <label for="setting-contrast">HIGH CONTRAST HUD</label>
                        <input type="checkbox" id="setting-contrast" ${this.prefs.highContrast ? 'checked' : ''}>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);
        this.container = this.overlay.querySelector('.settings-container');

        // Bind Events
        this.overlay.querySelector('.settings-close-btn').addEventListener('click', () => this.hide());

        this.overlay.querySelector('#setting-audio').addEventListener('change', () => this.toggle('muted'));
        this.overlay.querySelector('#setting-motion').addEventListener('change', () => this.toggle('reducedMotion'));
        this.overlay.querySelector('#setting-contrast').addEventListener('change', () => this.toggle('highContrast'));
    }

    show() {
        this.previousFocus = document.activeElement;
        this.overlay.classList.remove('hidden');
        // Focus close button initially
        const closeBtn = this.overlay.querySelector('.settings-close-btn');
        if (closeBtn) closeBtn.focus();

        this.audio.playInteractionSound('click');
        window.addEventListener('keydown', this._handleKeydown);
    }

    hide() {
        this.overlay.classList.add('hidden');
        this.audio.playInteractionSound('click');
        window.removeEventListener('keydown', this._handleKeydown);

        if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
            this.previousFocus.focus();
        }
    }

    _handleKeydown(e) {
        if (e.key === 'Tab') {
            const focusableElements = this.overlay.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    e.preventDefault();
                }
            }
        }
        if (e.key === 'Escape') {
            this.hide();
        }
    }
}

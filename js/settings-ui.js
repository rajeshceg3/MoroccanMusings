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
        this.overlay = document.createElement('div');
        this.overlay.className = 'overlay hidden settings-overlay';
        this.overlay.id = 'settings-overlay';
        this.overlay.setAttribute('role', 'dialog');
        this.overlay.setAttribute('aria-modal', 'true');
        this.overlay.setAttribute('aria-label', 'System Preferences');

        const container = document.createElement('div');
        container.className = 'settings-container';

        // Header
        const header = document.createElement('div');
        header.className = 'settings-header';

        const title = document.createElement('div');
        title.className = 'settings-title';
        title.textContent = 'SYSTEM PREFERENCES';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'settings-close-btn';
        closeBtn.setAttribute('aria-label', 'Close Settings');
        closeBtn.textContent = 'X';
        closeBtn.onclick = () => this.hide();

        header.append(title, closeBtn);

        // Content
        const content = document.createElement('div');
        content.className = 'settings-content';

        const createRow = (label, id, checked, key) => {
            const row = document.createElement('div');
            row.className = 'setting-row';

            const lbl = document.createElement('label');
            lbl.setAttribute('for', id);
            lbl.textContent = label;

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = id;
            input.checked = checked;
            input.addEventListener('change', () => this.toggle(key));

            row.append(lbl, input);
            return row;
        };

        content.append(
            createRow('STEALTH MODE (MUTE)', 'setting-audio', this.prefs.muted, 'muted'),
            createRow('MOTION SICKNESS PROTOCOL', 'setting-motion', this.prefs.reducedMotion, 'reducedMotion'),
            createRow('HIGH CONTRAST HUD', 'setting-contrast', this.prefs.highContrast, 'highContrast')
        );

        // Reset Guide Button (Tactical Refresh)
        const resetContainer = document.createElement('div');
        resetContainer.style.marginTop = '2rem';
        resetContainer.style.borderTop = '1px dashed #334455';
        resetContainer.style.paddingTop = '1rem';
        resetContainer.style.textAlign = 'center';

        const resetBtn = document.createElement('button');
        resetBtn.className = 'tapestry-btn'; // Re-use existing style
        resetBtn.textContent = 'RESET OPERATIONAL GUIDE';
        resetBtn.setAttribute('aria-label', 'Reset Onboarding Guide');
        resetBtn.style.width = '100%';
        resetBtn.style.borderColor = '#ffaa00';
        resetBtn.style.color = '#ffaa00';

        resetBtn.onclick = () => {
            if (confirm('CONFIRM: RESET MISSION PARAMETERS? (Reloads Interface)')) {
                localStorage.removeItem('marq_onboarded');
                window.location.reload();
            }
        };

        resetContainer.appendChild(resetBtn);
        content.appendChild(resetContainer);

        container.append(header, content);
        this.overlay.appendChild(container);
        document.body.appendChild(this.overlay);

        this.container = container;
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
        this.ui.trapFocus(this.overlay, e);
        if (e.key === 'Escape') {
            this.hide();
        }
    }
}

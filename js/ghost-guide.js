export class GhostGuide {
    constructor(state, resonanceEngine, showScreenCallback, uiSystem) {
        this.state = state;
        this.resonanceEngine = resonanceEngine;
        this.showScreen = showScreenCallback;
        this.ui = uiSystem;

        this.overlay = document.getElementById('ghost-guide-overlay');
        this.guideContainer = this.overlay.querySelector('.guide-container');
        this.steps = this.overlay.querySelectorAll('.guide-step');
        this.dots = this.overlay.querySelectorAll('.dot');
        this.nextBtn = document.getElementById('guide-next-btn');
        this.prevBtn = document.getElementById('guide-prev-btn');
        this.skipBtn = document.getElementById('guide-skip-btn');
        this.helpBtn = document.getElementById('help-trigger');

        this.highlightBox = null;
        this.currentStep = 0;
        this.previousFocus = null;

        this.updateGuide = this.updateGuide.bind(this);
        this._handleKeydown = this._handleKeydown.bind(this);
    }

    init() {
        this._createHighlightBox();
        this._bindEvents();

        // A11y Setup
        if (this.guideContainer) {
            this.guideContainer.setAttribute('role', 'dialog');
            this.guideContainer.setAttribute('aria-modal', 'true');
            this.guideContainer.setAttribute('aria-label', 'Operational Guide');
        }

        // Auto-show on first run
        if (!localStorage.getItem('marq_onboarded')) {
            // Event-driven initialization
            window.addEventListener('marq-ready', () => {
                this.show();
            }, { once: true });
        }
    }

    _createHighlightBox() {
        this.highlightBox = document.querySelector('.guide-highlight-box');
        if (!this.highlightBox) {
            this.highlightBox = document.createElement('div');
            this.highlightBox.className = 'guide-highlight-box';
            // Insert as first child to be behind guide-container
            if (this.overlay.firstChild) {
                this.overlay.insertBefore(this.highlightBox, this.overlay.firstChild);
            } else {
                this.overlay.appendChild(this.highlightBox);
            }
        }
    }

    _bindEvents() {
        this.nextBtn.addEventListener('click', () => {
            this.resonanceEngine.playInteractionSound('click');
            if (this.currentStep < this.steps.length - 1) {
                this.currentStep++;
                this.updateGuide();
            } else {
                this.close();
            }
        });

        this.prevBtn.addEventListener('click', () => {
            this.resonanceEngine.playInteractionSound('click');
            if (this.currentStep > 0) {
                this.currentStep--;
                this.updateGuide();
            }
        });

        this.skipBtn.addEventListener('click', () => {
            this.close();
            this.resonanceEngine.playInteractionSound('click');
        });

        if (this.helpBtn) {
            this.helpBtn.addEventListener('click', () => {
                this.show();
                this.resonanceEngine.playInteractionSound('click');
            });
        }
    }

    updateGuide() {
        this.steps.forEach((s, i) => s.classList.toggle('active', i === this.currentStep));
        this.dots.forEach((d, i) => d.classList.toggle('active', i === this.currentStep));
        this.prevBtn.disabled = this.currentStep === 0;
        this.nextBtn.textContent = this.currentStep === this.steps.length - 1 ? 'FINISH' : 'NEXT';

        const activeStepEl = this.steps[this.currentStep];
        const targetSelector = activeStepEl.dataset.target;

        if (targetSelector) {
            const target = document.querySelector(targetSelector);
            // Check if target exists and is somewhat visible
            if (target && target.offsetParent !== null) {
                const rect = target.getBoundingClientRect();
                this.highlightBox.style.top = `${rect.top}px`;
                this.highlightBox.style.left = `${rect.left}px`;
                this.highlightBox.style.width = `${rect.width}px`;
                this.highlightBox.style.height = `${rect.height}px`;
                this.highlightBox.style.opacity = '1';
            } else {
                this.highlightBox.style.opacity = '0';
            }
        } else {
            this.highlightBox.style.opacity = '0';
        }
    }

    show() {
        // Save focus
        this.previousFocus = document.activeElement;

        this.currentStep = 0;
        this.overlay.classList.remove('hidden');
        // Ensure we are on the right screen for the start?
        if (this.state.activeScreen !== 'astrolabe') {
            this.showScreen('astrolabe');
        }
        // Double RAF to ensure layout is settled
        requestAnimationFrame(() => {
            requestAnimationFrame(this.updateGuide);
            // Move focus into the guide
            this.nextBtn.focus();
        });
        window.addEventListener('resize', this.updateGuide);
        window.addEventListener('keydown', this._handleKeydown);
    }

    close() {
        this.overlay.classList.add('hidden');
        localStorage.setItem('marq_onboarded', 'true');
        window.removeEventListener('resize', this.updateGuide);
        window.removeEventListener('keydown', this._handleKeydown);

        // Restore Focus
        if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
            this.previousFocus.focus();
        }
    }

    _handleKeydown(e) {
        if (this.ui) {
            this.ui.trapFocus(this.guideContainer, e);
        }
        if (e.key === 'Escape') {
            this.close();
        }
    }
}

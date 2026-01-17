export class UISystem {
    constructor() {
        this.container = this.ensureContainer();
        this.loadingOverlay = this.ensureLoadingOverlay();
    }

    ensureContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            document.body.appendChild(container);
        }
        return container;
    }

    ensureConfirmModal() {
        let modal = document.getElementById('confirm-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'confirm-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'confirm-text');
            modal.className = 'confirm-modal-overlay';

            const content = document.createElement('div');
            content.className = 'confirm-modal-content';

            const text = document.createElement('p');
            text.id = 'confirm-text';

            const btnGroup = document.createElement('div');
            btnGroup.className = 'confirm-btn-group';

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.className = 'confirm-btn cancel';

            const okBtn = document.createElement('button');
            okBtn.textContent = 'Confirm';
            okBtn.className = 'confirm-btn ok';

            btnGroup.appendChild(cancelBtn);
            btnGroup.appendChild(okBtn);
            content.appendChild(text);
            content.appendChild(btnGroup);
            modal.appendChild(content);
            document.body.appendChild(modal);
        }
        return modal;
    }

    ensureSimulationModal() {
        let modal = document.getElementById('simulation-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'simulation-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-label', 'Tactical Forecast');
            modal.className = 'confirm-modal-overlay'; // Reuse overlay style

            // Custom content structure
            modal.innerHTML = `
                <div class="confirm-modal-content simulation-content">
                    <h3 class="simulation-title">TACTICAL FORECAST</h3>
                    <div class="simulation-grid">
                        <div class="sim-row">
                            <span>DEFCON:</span>
                            <span id="sim-defcon"></span>
                        </div>
                        <div class="sim-row">
                            <span>BALANCE:</span>
                            <span id="sim-balance"></span>
                        </div>
                        <div class="sim-row">
                            <span>DOMINANCE:</span>
                            <span id="sim-dominance"></span>
                        </div>
                    </div>
                    <div id="sim-advisory" class="simulation-advisory"></div>
                    <div class="confirm-btn-group">
                        <button class="confirm-btn cancel">ABORT</button>
                        <button class="confirm-btn ok">EXECUTE</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    ensureLoadingOverlay() {
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'System Processing');

            const loader = document.createElement('div');
            loader.className = 'loader';

            const text = document.createElement('div');
            text.className = 'loading-text';
            text.id = 'loading-text-content';
            text.textContent = 'PROCESSING...';

            overlay.appendChild(loader);
            overlay.appendChild(text);
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    showLoading(message = 'PROCESSING...') {
        const textEl = document.getElementById('loading-text-content');
        if (textEl) textEl.textContent = message;

        this.loadingOverlay.classList.add('visible');

        // Trap focus (simple version)
        this.activeElementBeforeLoading = document.activeElement;
        this.loadingOverlay.focus();
    }

    showConfirm(message, onConfirm, onCancel) {
        const modal = this.ensureConfirmModal();
        const text = modal.querySelector('#confirm-text');
        const okBtn = modal.querySelector('.confirm-btn.ok');
        const cancelBtn = modal.querySelector('.confirm-btn.cancel');

        text.textContent = message;
        modal.classList.add('visible');

        // Save focus to restore later
        const activeBefore = document.activeElement;

        const close = () => {
            modal.classList.remove('visible');
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            if (activeBefore) activeBefore.focus();
        };

        okBtn.onclick = () => {
            close();
            if (onConfirm) onConfirm();
        };

        cancelBtn.onclick = () => {
            close();
            if (onCancel) onCancel();
        };

        // Trap focus on Cancel button initially
        cancelBtn.focus();
    }

    showSimulationResults(report, onConfirm, onCancel) {
        const modal = this.ensureSimulationModal();
        const defconEl = modal.querySelector('#sim-defcon');
        const balanceEl = modal.querySelector('#sim-balance');
        const dominanceEl = modal.querySelector('#sim-dominance');
        const advisoryEl = modal.querySelector('#sim-advisory');
        const okBtn = modal.querySelector('.confirm-btn.ok');
        const cancelBtn = modal.querySelector('.confirm-btn.cancel');

        // Populate Data
        // Higher DEFCON is safer. Delta > 0 is Improvement.
        const defconArrow = report.deltas.defcon > 0 ? '⬆' : (report.deltas.defcon < 0 ? '⬇' : '➡');

        let defconClass = 'neutral';
        if (report.deltas.defcon > 0) defconClass = 'positive';
        if (report.deltas.defcon < 0) defconClass = 'negative';

        defconEl.innerHTML = `<span class="${defconClass}">${report.baseline.defcon} ${defconArrow} ${report.projected.defcon}</span>`;

        const balanceSign = report.deltas.balance >= 0 ? '+' : '';
        balanceEl.textContent = `${report.baseline.balance}% -> ${report.projected.balance}% (${balanceSign}${report.deltas.balance})`;

        dominanceEl.textContent = report.deltas.dominance;
        advisoryEl.textContent = report.advisory;

        // Style advisory
        advisoryEl.className = 'simulation-advisory';
        if (report.advisory.includes('CRITICAL') || report.advisory.includes('WARNING') || report.advisory.includes('CAUTION')) {
            advisoryEl.classList.add('advisory-warning');
        } else if (report.advisory.includes('RECOMMENDED') || report.advisory.includes('ADVANTAGE')) {
            advisoryEl.classList.add('advisory-success');
        }

        modal.classList.add('visible');
        const activeBefore = document.activeElement;

        const close = () => {
            modal.classList.remove('visible');
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            if (activeBefore) activeBefore.focus();
        };

        okBtn.onclick = () => {
            close();
            if (onConfirm) onConfirm();
        };

        cancelBtn.onclick = () => {
            close();
            if (onCancel) onCancel();
        };

        okBtn.focus();
    }

    hideLoading() {
        this.loadingOverlay.classList.remove('visible');
        // Restore focus
        if (this.activeElementBeforeLoading) {
            this.activeElementBeforeLoading.focus();
        }
    }

    showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        // Allow for HTML messages or text? Text is safer for now.
        toast.textContent = message;

        // Accessibility
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        toast.setAttribute('aria-live', 'polite');

        this.container.appendChild(toast);

        // Animate in (Force reflow to enable transition)
        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });

        // Auto dismiss
        const duration = type === 'error' ? 6000 : 4000;
        const timer = setTimeout(() => {
            this.dismiss(toast);
        }, duration);

        // Allow manual dismiss on click
        toast.addEventListener('click', () => {
            clearTimeout(timer);
            this.dismiss(toast);
        });
    }

    dismiss(toast) {
        toast.classList.remove('visible');
        // Wait for CSS transition to finish
        toast.addEventListener(
            'transitionend',
            () => {
                if (toast.parentElement) {
                    toast.remove();
                }
            },
            { once: true }
        );

        // Fallback in case transitionend fails
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 500);
    }

    lockTransition(duration = 50) {
        document.body.classList.add('transition-locked');
        setTimeout(() => {
            document.body.classList.remove('transition-locked');
        }, duration);
    }

    setupGlobalErrorHandling() {
        window.onerror = (msg, url, lineNo, columnNo, error) => {
            console.error('Global error:', msg, error);
            // Don't show "Script error." which is generic
            if (msg !== 'Script error.') {
                this.showNotification(`System Error: ${msg}`, 'error');
            }
            return false;
        };

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled Rejection:', event.reason);
            this.showNotification(
                `Async Error: ${event.reason.message || event.reason}`,
                'error'
            );
        });
    }
}

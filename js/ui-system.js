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

export class UISystem {
    constructor() {
        this.container = this.ensureContainer();
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
        toast.addEventListener('transitionend', () => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, { once: true });

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
            this.showNotification(`Async Error: ${event.reason.message || event.reason}`, 'error');
        });
    }
}

export class UISystem {
    constructor() {
        this.container = this.ensureContainer();
        this.loadingOverlay = this.ensureLoadingOverlay();
        this.setupNetworkMonitoring();
    }

    setupNetworkMonitoring() {
        window.addEventListener('offline', () => {
            this.showNotification('CONNECTION SEVERED. OFFLINE MODE.', 'offline');
        });
        window.addEventListener('online', () => {
            this.showNotification('LINK RESTORED. SYSTEMS ONLINE.', 'success');
        });
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
            modal.className = 'confirm-modal-overlay';

            const content = document.createElement('div');
            content.className = 'confirm-modal-content simulation-content';

            const title = document.createElement('h3');
            title.className = 'simulation-title';
            title.textContent = 'TACTICAL FORECAST';

            const grid = document.createElement('div');
            grid.className = 'simulation-grid';

            const createRow = (label, id) => {
                const row = document.createElement('div');
                row.className = 'sim-row';
                const labelSpan = document.createElement('span');
                labelSpan.textContent = label;
                const valueSpan = document.createElement('span');
                valueSpan.id = id;
                row.appendChild(labelSpan);
                row.appendChild(valueSpan);
                return row;
            };

            grid.appendChild(createRow('DEFCON:', 'sim-defcon'));
            grid.appendChild(createRow('BALANCE:', 'sim-balance'));
            grid.appendChild(createRow('DOMINANCE:', 'sim-dominance'));

            const advisory = document.createElement('div');
            advisory.id = 'sim-advisory';
            advisory.className = 'simulation-advisory';

            const btnGroup = document.createElement('div');
            btnGroup.className = 'confirm-btn-group';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'confirm-btn cancel';
            cancelBtn.textContent = 'ABORT';

            const okBtn = document.createElement('button');
            okBtn.className = 'confirm-btn ok';
            okBtn.textContent = 'EXECUTE';

            btnGroup.appendChild(cancelBtn);
            btnGroup.appendChild(okBtn);

            content.appendChild(title);
            content.appendChild(grid);
            content.appendChild(advisory);
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

        // Secure Text Content Update
        defconEl.innerHTML = ''; // Clear previous
        const defconSpan = document.createElement('span');
        defconSpan.className = defconClass;
        defconSpan.textContent = `${report.baseline.defcon} ${defconArrow} ${report.projected.defcon}`;
        defconEl.appendChild(defconSpan);

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

    showEchoInterface(mode, spectraEngine, onClose) {
        const overlay = document.getElementById('echo-overlay');
        const statusEl = document.getElementById('echo-status');
        const msgEl = document.getElementById('echo-message');
        const canvas = document.getElementById('echo-visualizer');
        const closeBtn = document.getElementById('echo-close-btn');

        if (!overlay || !canvas) return;

        overlay.classList.remove('hidden');
        statusEl.textContent = mode === 'broadcast' ? 'BROADCASTING' : 'LISTENING';
        msgEl.textContent = mode === 'broadcast'
            ? 'Transmitting encrypted signal... keep device steady.'
            : 'Listening for Echo signal...';

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        let animationFrame;
        let isRunning = true;

        const draw = () => {
            if (!isRunning) return;
            animationFrame = requestAnimationFrame(draw);

            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, rect.width, rect.height);

            // If listening, use real analyser. If broadcast, simulate.
            const analyser = spectraEngine.getAnalyser();

            if (mode === 'broadcast' || !analyser) {
                 this._drawFakeWaveform(ctx, rect.width, rect.height);
                 return;
            }

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteTimeDomainData(dataArray);

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#c67605';
            ctx.beginPath();

            const sliceWidth = rect.width * 1.0 / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * rect.height / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
                x += sliceWidth;
            }

            ctx.lineTo(rect.width, rect.height / 2);
            ctx.stroke();
        };

        draw();

        // Handler Wrapper
        const handleClose = () => {
            if (!isRunning) return;
            isRunning = false;
            cancelAnimationFrame(animationFrame);
            overlay.classList.add('hidden');
            if (onClose) onClose();
            // Cleanup listeners to prevent leak
            closeBtn.removeEventListener('click', handleClose);
        };

        closeBtn.addEventListener('click', handleClose);

        // Return a method to programmatically close it (e.g. on success)
        return { close: handleClose };
    }

    _drawFakeWaveform(ctx, width, height) {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#c67605';

        const time = Date.now() * 0.005;
        for (let x = 0; x < width; x++) {
            // Complex sine sum to look cool
            const y = height / 2 +
                      Math.sin(x * 0.02 + time) * 30 +
                      Math.sin(x * 0.05 - time * 2) * 15;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    renderUplinkControls() {
        const controls = document.createElement('div');
        controls.className = 'uplink-controls';

        const mapBtn = document.createElement('button');
        mapBtn.className = 'uplink-btn';
        mapBtn.textContent = 'DETACH MAP';
        mapBtn.onclick = () =>
            window.open(
                '?mode=map&uplink=true',
                'MarqMap',
                'width=1000,height=800'
            );

        const termBtn = document.createElement('button');
        termBtn.className = 'uplink-btn';
        termBtn.textContent = 'DETACH TERMINAL';
        termBtn.onclick = () =>
            window.open(
                '?mode=terminal&uplink=true',
                'MarqTerm',
                'width=600,height=400'
            );

        controls.appendChild(mapBtn);
        controls.appendChild(termBtn);
        document.body.appendChild(controls);

        // Link Status
        const status = document.createElement('div');
        status.className = 'uplink-status';
        // Multi-bar signal strength indicator
        status.innerHTML = `
            <div class="uplink-signal">
                <div class="uplink-bar b1"></div>
                <div class="uplink-bar b2"></div>
                <div class="uplink-bar b3"></div>
            </div>
            <span id="uplink-text">LINK INACTIVE</span>`;
        document.body.appendChild(status);

        this.uplinkBars = status.querySelectorAll('.uplink-bar');
        this.uplinkText = status.querySelector('#uplink-text');
        this.uplinkStatusEl = status;
    }

    updateGeminiStatus(peerCount) {
        if (!this.uplinkStatusEl) return;

        if (peerCount > 0) {
            this.uplinkStatusEl.classList.add('visible');
            // Animate bars based on count (simulated strength)
            this.uplinkBars.forEach((bar, i) => {
                bar.classList.add('active');
                // Staggered animation delay handled in CSS
            });
            this.uplinkText.textContent = `LINK ACTIVE: ${peerCount} NODE${peerCount > 1 ? 'S' : ''}`;
            this.uplinkText.style.color = '#55ffaa';
        } else {
            this.uplinkStatusEl.classList.remove('visible');
            this.uplinkBars.forEach(bar => bar.classList.remove('active'));
            this.uplinkText.textContent = 'LINK INACTIVE';
            this.uplinkText.style.color = 'var(--sand)';
        }
    }
}

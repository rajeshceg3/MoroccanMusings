export class PanopticonEngine {
    /**
     * @param {Object} ledger - TapestryLedger instance
     * @param {Object} sentinel - SentinelEngine instance
     * @param {Object} renderers - { mandala, map, updateAlchemy }
     * @param {Object} ui - UISystem instance
     */
    constructor(ledger, sentinel, renderers, ui) {
        this.ledger = ledger;
        this.sentinel = sentinel;
        this.renderers = renderers;
        this.ui = ui;

        this.snapshots = [];
        this.currentIndex = -1; // -1 indicates LIVE mode
        this.isReplaying = false;

        // Configuration
        this.MAX_SNAPSHOTS = 100; // Circular buffer size if needed, though session length usually small

        this._initUI();
    }

    /**
     * Captures the current state of the tactical environment.
     * Should be called after every successful weave or significant event.
     */
    capture() {
        const threads = this.ledger.getThreads();
        const report = this.sentinel.getReport();

        const snapshot = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString([], { hour12: false }),
            threadCount: threads.length,
            defcon: report.defcon,
            threatCount: report.threats.length
        };

        this.snapshots.push(snapshot);
        this._updateTimelineUI();
    }

    /**
     * Enters Replay Mode at the specified snapshot index.
     * @param {number} index - Index in the snapshots array
     */
    scrubTo(index) {
        if (index < 0 || index >= this.snapshots.length) return;

        this.isReplaying = true;
        this.currentIndex = index;

        const snapshot = this.snapshots[index];
        const allThreads = this.ledger.getThreads();

        // Reconstruct state
        // We assume threads are append-only.
        // If snapshot.threadCount > allThreads.length, the ledger was cleared.
        // In that case, we can only show what we have (or handle clears differently).
        const visibleThreads = allThreads.slice(0, snapshot.threadCount);

        // We must re-run sentinel logic on the historical data to get accurate derived state (zones, etc)
        // or we could have stored it. Re-running is cleaner for "Simulation".
        const historicalReport = this.sentinel.assess(visibleThreads);

        // Force Render
        this._applyState(visibleThreads, historicalReport);

        // Update UI status
        this._updateStatusDisplay(`REPLAY: ${snapshot.timestamp} // T-MINUS ${this.snapshots.length - 1 - index}`);
        this._updateControls();

        document.body.classList.add('panopticon-active');
    }

    /**
     * Returns to Live Mode.
     */
    returnToLive() {
        this.isReplaying = false;
        this.currentIndex = -1;

        const threads = this.ledger.getThreads();
        const report = this.sentinel.assess(threads); // Re-assess live

        this._applyState(threads, report);

        this._updateStatusDisplay('LIVE FEED // ACTIVE');
        this._updateControls();

        document.body.classList.remove('panopticon-active');
    }

    _applyState(threads, report) {
        if (this.renderers.mandala) {
            this.renderers.mandala.render(threads);
        }
        if (this.renderers.map) {
            // We pass empty ghosts for now to keep it clean, or we could simulate them too
            this.renderers.map.render(threads, window.locations || {}, [], report.zones);
        }
        if (this.renderers.updateAlchemy) {
            this.renderers.updateAlchemy(threads); // Updates UI slots if needed
        }
    }

    // --- UI Construction ---

    _initUI() {
        // Create the Overlay
        const container = document.createElement('div');
        container.id = 'panopticon-interface';
        container.className = 'panopticon-overlay hidden';

        // --- Header ---
        const header = document.createElement('div');
        header.className = 'panopticon-header';

        const title = document.createElement('span');
        title.className = 'panopticon-title';
        title.textContent = 'PANOPTICON // TACTICAL REVIEW';

        const status = document.createElement('span');
        status.id = 'panopticon-status';
        status.className = 'panopticon-status';
        status.textContent = 'LIVE FEED // ACTIVE';

        const closeBtn = document.createElement('button');
        closeBtn.id = 'panopticon-close';
        closeBtn.className = 'panopticon-close-btn';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.textContent = '×';

        header.append(title, status, closeBtn);

        // --- Track ---
        const track = document.createElement('div');
        track.className = 'panopticon-track';

        const timelineBg = document.createElement('div');
        timelineBg.className = 'panopticon-timeline-bg';

        const scrubber = document.createElement('input');
        scrubber.type = 'range';
        scrubber.id = 'panopticon-scrubber';
        scrubber.min = '0';
        scrubber.max = '0';
        scrubber.value = '0';
        scrubber.step = '1';
        scrubber.disabled = true;

        const markers = document.createElement('div');
        markers.className = 'panopticon-markers';
        markers.id = 'panopticon-markers';

        track.append(timelineBg, scrubber, markers);

        // --- Controls ---
        const controls = document.createElement('div');
        controls.className = 'panopticon-controls';

        // Helper to create buttons with icons safely
        const createBtn = (id, text, iconChar, iconPos = 'left', active = false) => {
            const btn = document.createElement('button');
            btn.id = id;
            btn.className = 'panopticon-btn';
            if (active) btn.classList.add('active');

            if (iconChar) {
                const icon = document.createElement('span');
                icon.className = 'icon';
                icon.textContent = iconChar;
                if (iconPos === 'left') {
                    btn.append(icon, document.createTextNode(' ' + text));
                } else {
                    btn.append(document.createTextNode(text + ' '), icon);
                }
            } else {
                btn.textContent = text;
            }
            return btn;
        };

        const btnPrev = createBtn('panopticon-prev', 'STEP', '❮', 'left');
        btnPrev.disabled = true;

        const btnLive = createBtn('panopticon-live', 'LIVE', null, null, true);

        const btnNext = createBtn('panopticon-next', 'STEP', '❯', 'right');
        btnNext.disabled = true;

        controls.append(btnPrev, btnLive, btnNext);

        // --- Metadata ---
        const metadata = document.createElement('div');
        metadata.className = 'panopticon-metadata';
        metadata.id = 'panopticon-metadata';
        metadata.textContent = 'NO DATA';

        // --- Assembly ---
        container.append(header, track, controls, metadata);
        document.body.appendChild(container);

        // Bind Elements
        this.elements = {
            container,
            scrubber,
            status,
            metadata,
            btnLive,
            btnPrev,
            btnNext,
            btnClose: closeBtn,
            markers
        };

        // Bind Events
        this.elements.scrubber.addEventListener('input', (e) => {
            this.scrubTo(parseInt(e.target.value));
        });

        this.elements.btnLive.addEventListener('click', () => {
            this.returnToLive();
        });

        this.elements.btnPrev.addEventListener('click', () => {
            if (this.currentIndex > 0) {
                this.scrubTo(this.currentIndex - 1);
            } else if (!this.isReplaying && this.snapshots.length > 0) {
                this.scrubTo(this.snapshots.length - 1);
            }
        });

        this.elements.btnNext.addEventListener('click', () => {
            if (this.currentIndex < this.snapshots.length - 1) {
                this.scrubTo(this.currentIndex + 1);
            } else {
                this.returnToLive();
            }
        });

        this.elements.btnClose.addEventListener('click', () => {
            this.toggleInterface(false);
        });
    }

    _updateTimelineUI() {
        const count = this.snapshots.length;
        if (count === 0) return;

        this.elements.scrubber.max = count - 1;
        this.elements.scrubber.disabled = false;

        // If we are LIVE, we update the slider value to max but don't scrub
        if (!this.isReplaying) {
            this.elements.scrubber.value = count - 1;
        }

        // Add visual markers for DEFCON drops (Critical Events)
        // Use replaceChildren to clear safely
        this.elements.markers.replaceChildren();

        this.snapshots.forEach((snap, i) => {
            if (snap.defcon < 3) {
                const marker = document.createElement('div');
                marker.className = `p-marker defcon-${snap.defcon}`;
                marker.style.left = `${(i / (count - 1)) * 100}%`;
                marker.title = `DEFCON ${snap.defcon}`;
                this.elements.markers.appendChild(marker);
            }
        });
    }

    _updateControls() {
        const index = this.isReplaying ? this.currentIndex : this.snapshots.length - 1;
        this.elements.scrubber.value = index;

        this.elements.btnLive.classList.toggle('active', !this.isReplaying);
        this.elements.btnPrev.disabled = this.isReplaying && index === 0;
        this.elements.btnNext.disabled = !this.isReplaying;

        // Metadata - Secure DOM Construction
        this.elements.metadata.replaceChildren();

        if (this.isReplaying) {
            const snap = this.snapshots[index];

            const createMetaItem = (label, value, defconClass) => {
                const span = document.createElement('span');
                span.className = 'meta-item';
                if (defconClass) span.classList.add(defconClass);
                span.textContent = `${label}: ${value}`;
                return span;
            };

            this.elements.metadata.append(
                createMetaItem('THREADS', snap.threadCount),
                createMetaItem('DEFCON', snap.defcon, `defcon-${snap.defcon}`),
                createMetaItem('THREATS', snap.threatCount)
            );
        } else {
            this.elements.metadata.textContent = "SYSTEM LIVE. MONITORING STREAM.";
        }
    }

    _updateStatusDisplay(text) {
        this.elements.status.textContent = text;
        if (this.isReplaying) {
            this.elements.status.classList.add('warning');
        } else {
            this.elements.status.classList.remove('warning');
        }
    }

    toggleInterface(show) {
        const visible = show !== undefined ? show : this.elements.container.classList.contains('hidden');
        if (visible) {
            this.elements.container.classList.remove('hidden');
            this.capture(); // Ensure we have latest state on open
            this._updateControls();
        } else {
            this.elements.container.classList.add('hidden');
            this.returnToLive(); // Always return to live when closing UI
        }
    }
}

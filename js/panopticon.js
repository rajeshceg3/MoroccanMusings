export class PanopticonEngine {
    constructor(ledger, sentinel, renderers, ui, vanguard, citadel, prometheus) {
        this.ledger = ledger;
        this.sentinel = sentinel;
        this.renderers = renderers;
        this.ui = ui;
        this.vanguard = vanguard;
        this.citadel = citadel;
        this.prometheus = prometheus;

        this.snapshots = [];
        this.currentIndex = -1; // -1 indicates LIVE mode
        this.isReplaying = false;

        this.MAX_SNAPSHOTS = 100;

        this._initUI();
    }

    capture() {
        if (this.isReplaying) return; // Do not capture while scrubbing

        const threads = this.ledger.getThreads();
        const report = this.sentinel.getReport();

        // Deep State Capture
        const snapshot = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString([], { hour12: false }),
            defcon: report.defcon,
            threatCount: report.threats.length,
            threadCount: threads.length,
            // Engine States
            ledger: this.ledger.getSnapshot(),
            vanguard: this.vanguard ? this.vanguard.getSnapshot() : [],
            citadel: this.citadel ? this.citadel.getSnapshot() : [],
            prometheus: this.prometheus ? this.prometheus.getSnapshot() : []
        };

        this.snapshots.push(snapshot);
        if (this.snapshots.length > this.MAX_SNAPSHOTS) {
            this.snapshots.shift();
        }
        this._updateTimelineUI();
    }

    async restoreState(snapshot) {
        // Restore all engines to this snapshot state
        if (snapshot.ledger) await this.ledger.loadSnapshot(snapshot.ledger);
        if (this.vanguard && snapshot.vanguard) this.vanguard.loadSnapshot(snapshot.vanguard);
        if (this.citadel && snapshot.citadel) this.citadel.loadSnapshot(snapshot.citadel);
        if (this.prometheus && snapshot.prometheus) this.prometheus.loadSnapshot(snapshot.prometheus);

        // Re-assess with Sentinel for immediate tactical report
        this.sentinel.assess(this.ledger.getThreads());

        // Update View
        this._previewSnapshot(snapshot);
    }

    async scrubTo(index) {
        if (index < 0 || index >= this.snapshots.length) return;

        this.isReplaying = true;
        this.currentIndex = index;

        const snapshot = this.snapshots[index];

        // Visual Preview Only - Do not modify engines yet
        this._previewSnapshot(snapshot);

        this._updateStatusDisplay(`REPLAY: ${snapshot.timestamp} // T-MINUS ${this.snapshots.length - 1 - index}`);
        this._updateControls();
        document.body.classList.add('panopticon-active');
    }

    _previewSnapshot(snapshot) {
        const threads = snapshot.ledger;
        const report = this.sentinel.assess(threads);

        const units = snapshot.vanguard || [];
        const citadelZones = snapshot.citadel || [];
        const drafts = snapshot.prometheus || [];

        if (this.renderers.mandala) {
            this.renderers.mandala.render(threads);
        }
        if (this.renderers.map) {
            this.renderers.map.render(threads, window.locations || {}, drafts, report.zones, units, citadelZones);
        }
        if (this.renderers.updateAlchemy) {
            this.renderers.updateAlchemy(threads);
        }
    }

    returnToLive() {
        this.isReplaying = false;
        this.currentIndex = -1;

        // Render current engine state
        const threads = this.ledger.getThreads();
        const report = this.sentinel.assess(threads);

        const units = this.vanguard ? this.vanguard.getUnits() : [];
        const zones = this.citadel ? this.citadel.getZones() : [];
        const drafts = this.prometheus ? this.prometheus.getDrafts() : [];

        if (this.renderers.mandala) this.renderers.mandala.render(threads);
        if (this.renderers.map) this.renderers.map.render(threads, window.locations || {}, drafts, report.zones, units, zones);
        if (this.renderers.updateAlchemy) this.renderers.updateAlchemy(threads);

        this._updateStatusDisplay('LIVE FEED // ACTIVE');
        this._updateControls();

        document.body.classList.remove('panopticon-active');
    }

    async forkTimeline() {
        if (!this.isReplaying || this.currentIndex === -1) return;

        const snapshot = this.snapshots[this.currentIndex];

        this.ui.showLoading('REWRITING TIMELINE...');

        try {
            // 1. Restore Engines
            await this.restoreState(snapshot);

            // 2. Truncate History
            // Keep up to current index (inclusive)
            this.snapshots = this.snapshots.slice(0, this.currentIndex + 1);

            this.ui.showNotification('TIMELINE BRANCH ESTABLISHED', 'success');

            // 3. Return to "Live" (which is now the forked point)
            this.returnToLive();
        } catch (e) {
            console.error(e);
            this.ui.showNotification('TIMELINE FORK FAILED', 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    // UI Construction
    _initUI() {
        const container = document.createElement('div');
        container.id = 'panopticon-interface';
        container.className = 'panopticon-overlay hidden';

        // Header
        const header = document.createElement('div');
        header.className = 'panopticon-header';

        const title = document.createElement('span');
        title.className = 'panopticon-title';
        title.innerHTML = 'PROJECT <strong>AETHER</strong> // TEMPORAL OPS';

        const status = document.createElement('span');
        status.id = 'panopticon-status';
        status.className = 'panopticon-status';
        status.textContent = 'LIVE FEED // ACTIVE';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'panopticon-close-btn';
        closeBtn.textContent = '×';
        closeBtn.onclick = () => this.toggleInterface(false);

        header.append(title, status, closeBtn);

        // Track
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
        this.markers = markers;

        track.append(timelineBg, scrubber, markers);

        // Controls
        const controls = document.createElement('div');
        controls.className = 'panopticon-controls';

        const createBtn = (id, text, active = false) => {
            const btn = document.createElement('button');
            btn.id = id;
            btn.className = 'panopticon-btn';
            if (active) btn.classList.add('active');
            btn.textContent = text;
            return btn;
        };

        const btnPrev = createBtn('panopticon-prev', '❮ STEP');
        const btnLive = createBtn('panopticon-live', 'LIVE', true);
        const btnNext = createBtn('panopticon-next', 'STEP ❯');

        const btnFork = createBtn('panopticon-fork', '⑂ FORK');
        btnFork.style.borderColor = 'var(--vibrancy-amber)';
        btnFork.style.color = 'var(--vibrancy-amber)';
        btnFork.setAttribute('data-tooltip', 'Create Branch Point');
        btnFork.disabled = true;

        controls.append(btnPrev, btnLive, btnNext, btnFork);

        // Metadata
        const metadata = document.createElement('div');
        metadata.className = 'panopticon-metadata';
        metadata.id = 'panopticon-metadata';

        container.append(header, track, controls, metadata);
        document.body.appendChild(container);

        this.elements = {
            container, scrubber, status, metadata,
            btnLive, btnPrev, btnNext, btnFork,
            markers
        };

        // Events
        scrubber.addEventListener('input', (e) => this.scrubTo(parseInt(e.target.value)));
        btnLive.addEventListener('click', () => this.returnToLive());
        btnPrev.addEventListener('click', () => {
            if (this.currentIndex > 0) this.scrubTo(this.currentIndex - 1);
            else if (!this.isReplaying && this.snapshots.length > 0) this.scrubTo(this.snapshots.length - 1);
        });
        btnNext.addEventListener('click', () => {
            if (this.currentIndex < this.snapshots.length - 1) this.scrubTo(this.currentIndex + 1);
            else this.returnToLive();
        });
        btnFork.addEventListener('click', () => this.forkTimeline());
    }

    _updateTimelineUI() {
        const count = this.snapshots.length;
        if (count === 0) return;

        this.elements.scrubber.max = count - 1;
        this.elements.scrubber.disabled = false;

        if (!this.isReplaying) {
            this.elements.scrubber.value = count - 1;
        }

        this.elements.markers.replaceChildren();
        this.snapshots.forEach((snap, i) => {
             if (snap.defcon < 3) {
                 const m = document.createElement('div');
                 m.className = `p-marker defcon-${snap.defcon}`;
                 m.style.left = `${(i / (count-1)) * 100}%`;
                 this.elements.markers.appendChild(m);
             }
        });
    }

    _updateControls() {
        const index = this.isReplaying ? this.currentIndex : this.snapshots.length - 1;
        this.elements.scrubber.value = index;

        this.elements.btnLive.classList.toggle('active', !this.isReplaying);
        this.elements.btnPrev.disabled = this.isReplaying && index === 0;
        this.elements.btnNext.disabled = !this.isReplaying;

        this.elements.btnFork.disabled = !this.isReplaying || (index === this.snapshots.length - 1);

        this.elements.metadata.replaceChildren();
        if (this.isReplaying) {
            const snap = this.snapshots[index];
            const meta = (l, v, c) => {
                const s = document.createElement('span');
                s.className = 'meta-item';
                if (c) s.classList.add(c);
                s.textContent = `${l}: ${v}`;
                return s;
            };

            this.elements.metadata.append(
                meta('THREADS', snap.threadCount),
                meta('DEFCON', snap.defcon, `defcon-${snap.defcon}`),
                meta('UNITS', snap.vanguard ? snap.vanguard.length : 0)
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
            this.capture();
            this._updateControls();
        } else {
            this.elements.container.classList.add('hidden');
            this.returnToLive();
        }
    }
}

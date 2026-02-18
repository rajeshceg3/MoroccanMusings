export class StratcomSystem {
    constructor(tapestryLedger, horizon, sentinel, vanguard, terminal, ui) {
        this.ledger = tapestryLedger;
        this.horizon = horizon;
        this.sentinel = sentinel;
        this.vanguard = vanguard;
        this.terminal = terminal;
        this.ui = ui;
        this.active = false;
        this.interval = null;

        // Cache DOM elements
        this.elements = {};
    }

    init() {
        this.elements = {
            overlay: document.getElementById('stratcom-overlay'),
            defcon: document.getElementById('widget-defcon-val'),
            balance: document.getElementById('widget-horizon-val'),
            units: document.getElementById('widget-vanguard-list'),
            log: document.getElementById('widget-log-content'),
            ticker: document.getElementById('widget-ticker-content'),
            closeBtn: document.getElementById('stratcom-close-btn')
        };

        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => this.toggle(false));
        }
    }

    toggle(active) {
        this.active = active !== undefined ? active : !this.active;
        if (!this.elements.overlay || !this.elements.defcon) this.init();

        if (this.active) {
            this.elements.overlay.classList.remove('hidden');
            this.startLoop();
            // Optional: Play sound
            // this.ui.resonance.playInteractionSound('click'); // If we had access to resonance directly via UI
        } else {
            this.elements.overlay.classList.add('hidden');
            this.stopLoop();
        }
    }

    startLoop() {
        if (this.interval) clearInterval(this.interval);
        this.update(); // Immediate update
        this.interval = setInterval(() => this.update(), 1000);
    }

    stopLoop() {
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
    }

    update() {
        if (!this.active) return;

        // 1. DEFCON Widget
        if (this.sentinel) {
            const report = this.sentinel.getReport();
            if (this.elements.defcon) {
                this.elements.defcon.textContent = report.defcon;
                // Remove old classes
                this.elements.defcon.classList.remove('defcon-1', 'defcon-2', 'defcon-3', 'defcon-4', 'defcon-5');
                this.elements.defcon.classList.add(`defcon-${report.defcon}`);
            }
        }

        // 2. Horizon Widget
        if (this.horizon && this.ledger) {
            const threads = this.ledger.getThreads();
            const analysis = this.horizon.analyze(threads);
            if (this.elements.balance) {
                 this.elements.balance.textContent = ''; // Clear

                 const highlight = document.createElement('span');
                 highlight.className = 'highlight';
                 highlight.textContent = `${analysis.balanceScore}%`;

                 this.elements.balance.appendChild(highlight);
                 this.elements.balance.appendChild(document.createTextNode(` // ${analysis.dominance.intention.toUpperCase()}`));
            }
        }

        // 3. Vanguard Widget
        if (this.vanguard) {
            const units = this.vanguard.getUnits();
            if (this.elements.units) {
                this.elements.units.textContent = ''; // Clear

                if (units.length === 0) {
                    const emptyState = document.createElement('div');
                    emptyState.className = 'unit-item empty';
                    emptyState.textContent = 'NO ASSETS DEPLOYED';
                    this.elements.units.appendChild(emptyState);
                } else {
                    units.forEach(u => {
                        const el = document.createElement('div');
                        el.className = 'unit-item';

                        // Row 1
                        const row1 = document.createElement('div');
                        row1.className = 'unit-row';

                        const idSpan = document.createElement('span');
                        idSpan.className = 'unit-id';
                        idSpan.textContent = `[${u.id}]`;

                        const typeSpan = document.createElement('span');
                        typeSpan.className = 'unit-type';
                        typeSpan.textContent = u.type;

                        row1.appendChild(idSpan);
                        row1.appendChild(typeSpan);

                        // Row 2
                        const row2 = document.createElement('div');
                        row2.className = 'unit-row';

                        const statusSpan = document.createElement('span');
                        statusSpan.className = 'unit-status';
                        statusSpan.textContent = u.status;

                        const batSpan = document.createElement('span');
                        batSpan.className = 'unit-bat';
                        batSpan.textContent = `${Math.floor(u.battery)}%`;

                        // Simple battery bar color logic
                        const battColor = u.battery < 20 ? '#ff0055' : u.battery < 50 ? '#ffaa00' : '#55ffaa';
                        batSpan.style.color = battColor;

                        row2.appendChild(statusSpan);
                        row2.appendChild(batSpan);

                        el.appendChild(row1);
                        el.appendChild(row2);
                        this.elements.units.appendChild(el);
                    });
                }
            }
        }

        // 4. Log Widget (Mirror Terminal)
        if (this.elements.log && this.terminal && this.terminal.output) {
             const lines = Array.from(this.terminal.output.children).slice(-6); // Last 6 lines
             this.elements.log.textContent = ''; // Clear
             lines.forEach(line => {
                 const clone = line.cloneNode(true);
                 this.elements.log.appendChild(clone);
             });
        }

        // 5. Ticker Widget
        if (this.elements.ticker && this.ledger) {
            const threads = this.ledger.getThreads();
            if (threads.length > 0) {
                const latest = threads[threads.length - 1];
                const timeStr = new Date(latest.timestamp).toLocaleTimeString();
                this.elements.ticker.textContent = `>> LATEST INTEL: [${latest.region.toUpperCase()}] ${latest.title} // ${timeStr}`;
            } else {
                this.elements.ticker.textContent = ">> WAITING FOR INTEL...";
            }
        }
    }
}

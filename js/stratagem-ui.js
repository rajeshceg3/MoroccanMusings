export class StratagemUI {
    constructor(engine, mapRenderer, uiSystem) {
        this.engine = engine;
        this.mapRenderer = mapRenderer;
        this.ui = uiSystem;
        this.container = null;
        this.elements = {};
        this.rafId = null;
        this.isPlaying = false;

        window.addEventListener('stratagem-scenario-end', (e) => {
            this.showMissionEnd(e.detail.result);
        });

        this._initDOM();
    }

    _initDOM() {
        const container = document.createElement('div');
        container.id = 'stratagem-overlay';
        container.className = 'stratagem-overlay hidden';

        // Header
        const header = document.createElement('div');
        header.className = 'stratagem-header';

        // Secure Header Creation
        const titleDiv = document.createElement('div');
        titleDiv.className = 'stratagem-title';
        titleDiv.appendChild(document.createTextNode('PROJECT '));
        const strong = document.createElement('strong');
        strong.textContent = 'STRATAGEM';
        titleDiv.appendChild(strong);
        titleDiv.appendChild(document.createTextNode(' // WAR GAMES'));

        const statusDiv = document.createElement('div');
        statusDiv.className = 'stratagem-status';
        statusDiv.id = 'stratagem-status';
        statusDiv.textContent = 'SIMULATION STANDBY';

        header.appendChild(titleDiv);
        header.appendChild(statusDiv);

        // Dashboard (Stats)
        const dashboard = document.createElement('div');
        dashboard.className = 'stratagem-dashboard';

        // Helper to create stat boxes securely
        const createStatBox = (label, id) => {
            const box = document.createElement('div');
            box.className = 'stat-box';
            const lbl = document.createElement('span');
            lbl.className = 'label';
            lbl.textContent = label;
            const val = document.createElement('span');
            val.className = 'value';
            val.id = id;
            val.textContent = '-';
            box.appendChild(lbl);
            box.appendChild(val);
            return box;
        };

        dashboard.appendChild(createStatBox('TICK', 'sim-tick'));
        dashboard.appendChild(createStatBox('DEFCON', 'sim-defcon'));
        dashboard.appendChild(createStatBox('BALANCE', 'sim-balance'));
        dashboard.appendChild(createStatBox('THREATS', 'sim-threats'));

        // Objectives Panel
        const objectives = document.createElement('div');
        objectives.id = 'stratagem-objectives';
        objectives.className = 'stratagem-objectives hidden';

        // Controls (Timeline)
        const controls = document.createElement('div');
        controls.className = 'stratagem-controls';

        const btnStep = this._createBtn('Step >', () => this.step());
        const btnPlay = this._createBtn('Play >>', () => this.togglePlay());
        const btnReset = this._createBtn('Reset', () => this.reset());

        controls.append(btnStep, btnPlay, btnReset);

        // Actions (Intervention)
        const actions = document.createElement('div');
        actions.className = 'stratagem-actions';

        const btnAddThread = this._createBtn('+ THREAD', () => this.promptThread());
        btnAddThread.classList.add('action-btn');

        const btnDeployUnit = this._createBtn('+ UNIT', () => this.promptUnit());
        btnDeployUnit.classList.add('action-btn');

        actions.append(btnAddThread, btnDeployUnit);

        // Footer (Commit/Abort)
        const footer = document.createElement('div');
        footer.className = 'stratagem-footer';

        const btnCommit = this._createBtn('EXECUTE STRATEGY', () => this.commit());
        btnCommit.classList.add('commit-btn');

        const btnAbort = this._createBtn('ABORT SIMULATION', () => this.abort());
        btnAbort.classList.add('abort-btn');

        footer.append(btnAbort, btnCommit);

        container.append(header, dashboard, objectives, controls, actions, footer);
        document.body.appendChild(container);

        this.container = container;
        this.elements = {
            status: container.querySelector('#stratagem-status'),
            tick: container.querySelector('#sim-tick'),
            defcon: container.querySelector('#sim-defcon'),
            balance: container.querySelector('#sim-balance'),
            threats: container.querySelector('#sim-threats'),
            objectives,
            btnPlay
        };
    }

    _createBtn(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.className = 'stratagem-btn';
        btn.addEventListener('click', onClick);
        return btn;
    }

    show() {
        this.container.classList.remove('hidden');
        document.body.classList.add('stratagem-active');
        this.update();
    }

    hide() {
        this.container.classList.add('hidden');
        document.body.classList.remove('stratagem-active');
        this.isPlaying = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.elements.btnPlay.textContent = 'Play >>';
    }

    step() {
        this.engine.step();
        this.update();
    }

    togglePlay() {
        this.isPlaying = !this.isPlaying;
        this.elements.btnPlay.textContent = this.isPlaying ? 'Pause ||' : 'Play >>';

        if (this.isPlaying) {
            const loop = () => {
                if (!this.isPlaying) return;
                this.step();
                // Artificial delay to make it watchable
                setTimeout(() => {
                    this.rafId = requestAnimationFrame(loop);
                }, 100);
            };
            loop();
        }
    }

    async reset() {
        this.isPlaying = false;
        // Re-init with current live state
        // We need access to live state.
        // Ideally the App controller calls engine.init(), then ui.update()
        // Here we just trigger an event or callback?
        // Let's dispatch an event the App can listen to.
        window.dispatchEvent(new CustomEvent('stratagem-reset'));
    }

    async commit() {
        this.isPlaying = false;
        window.dispatchEvent(new CustomEvent('stratagem-commit'));
    }

    abort() {
        this.engine.abort();
        this.hide();
        // App will handle switching back to normal render
    }

    promptThread() {
        // Simple prompt for now, or a mini-modal
        // We'll add a random helpful thread for simulation purposes
        const intentions = ['serenity', 'vibrancy', 'awe', 'legacy'];
        const times = ['dawn', 'midday', 'dusk', 'night'];
        const regions = ['coast', 'medina', 'sahara', 'atlas']; // 'atlas' mapped to legacy in Oracle?

        const i = intentions[Math.floor(Math.random() * intentions.length)];
        const t = times[Math.floor(Math.random() * times.length)];
        const r = regions[Math.floor(Math.random() * regions.length)];

        this.engine.addSimulatedThread({
            intention: i,
            time: t,
            region: r,
            title: `Simulated ${i} Event`,
            content: 'Projected narrative thread.'
        });
        this.update();
    }

    promptUnit() {
        const type = Math.random() > 0.5 ? 'SCOUT' : 'INTERCEPTOR';
        const regions = ['coast', 'medina', 'sahara', 'atlas'];
        const r = regions[Math.floor(Math.random() * regions.length)];

        this.engine.deploySimulatedUnit(type, r);
        this.update();
    }

    update() {
        if (!this.engine.isActive) return;

        const history = this.engine.history;
        if (history.length === 0) return;

        const latest = history[history.length - 1];

        this.elements.tick.textContent = latest.tick;
        this.elements.defcon.textContent = latest.defcon;
        this.elements.balance.textContent = latest.balance + '%';
        this.elements.threats.textContent = latest.threatCount;

        // Visual Feedback
        this.elements.defcon.className = `value defcon-${latest.defcon}`;

        // Scenario Rendering
        if (this.engine.activeScenario) {
            this.elements.objectives.classList.remove('hidden');
            this.elements.status.textContent = `MISSION: ${this.engine.activeScenario.title} // TIME: ${this.engine.activeScenario.timeLeft}s`;

            // Render Objectives Securely
            this.elements.objectives.textContent = ''; // Clear

            const h3 = document.createElement('h3');
            h3.textContent = 'PRIMARY OBJECTIVES';
            this.elements.objectives.appendChild(h3);

            this.engine.activeScenario.objectives.forEach(o => {
                const item = document.createElement('div');
                item.className = 'objective-item';

                const typeSpan = document.createElement('span');
                typeSpan.className = 'obj-type';
                typeSpan.textContent = o.type;

                const targetSpan = document.createElement('span');
                targetSpan.className = 'obj-target';
                targetSpan.textContent = `${o.comparator} ${o.target}`;

                item.appendChild(typeSpan);
                item.appendChild(targetSpan);
                this.elements.objectives.appendChild(item);
            });

        } else {
            this.elements.objectives.classList.add('hidden');
            this.elements.status.textContent = 'SIMULATION ACTIVE // SANDBOX MODE';
        }
    }

    showMissionEnd(result) {
        this.isPlaying = false;

        const overlay = document.createElement('div');
        overlay.className = `mission-end-overlay ${result.toLowerCase()}`;

        const title = document.createElement('h1');
        title.textContent = result === 'WIN' ? 'MISSION ACCOMPLISHED' : 'MISSION FAILED';

        const subtitle = document.createElement('p');
        subtitle.textContent = result === 'WIN'
            ? 'Objectives secured. Narrative stabilized.'
            : 'Critical failure. System integrity compromised.';

        const btn = document.createElement('button');
        btn.textContent = 'RETURN TO BASE';
        btn.onclick = () => {
            overlay.remove();
            this.abort();
        };

        overlay.append(title, subtitle, btn);
        document.body.appendChild(overlay);
    }
}

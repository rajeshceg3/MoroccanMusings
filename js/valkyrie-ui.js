export class ValkyrieUI {
    constructor(valkyrieEngine) {
        this.engine = valkyrieEngine;
        this.overlay = null;
        this.isVisible = false;

        // Regions derived from data keys (simplified)
        this.regions = ['coast', 'medina', 'sahara', 'kasbah'];
        this.unitTypes = ['SCOUT', 'INTERCEPTOR'];

        this._bindEvents();
        this.ensureOverlay();
    }

    _bindEvents() {
        // Listen for engine triggers
        window.addEventListener('valkyrie-trigger', (e) => {
            this.handleTrigger(e.detail);
        });
    }

    handleTrigger(detail) {
        if (!this.isVisible) return;

        // Find the card and animate it
        const cards = this.listContainer.querySelectorAll('.valkyrie-item');
        cards.forEach(card => {
            if (card.dataset.id === detail.protocolId) {
                card.classList.add('pulse-active');
                setTimeout(() => card.classList.remove('pulse-active'), 1000);
            }
        });
    }

    ensureOverlay() {
        if (this.overlay) return;

        this.overlay = document.createElement('div');
        this.overlay.className = 'valkyrie-overlay hidden';
        this.overlay.id = 'valkyrie-overlay';

        const container = document.createElement('div');
        container.className = 'valkyrie-container';

        // Header
        const header = document.createElement('div');
        header.className = 'valkyrie-header';

        const title = document.createElement('h2');
        title.className = 'valkyrie-title';
        // Secure text creation
        title.appendChild(document.createTextNode('PROJECT '));
        const strong = document.createElement('strong');
        strong.textContent = 'OVERWATCH';
        title.appendChild(strong);
        title.appendChild(document.createTextNode(' // DEFENSE GRID'));

        const closeBtn = document.createElement('button');
        closeBtn.className = 'valkyrie-close-btn';
        closeBtn.textContent = '×';
        closeBtn.setAttribute('data-tooltip', 'Close Interface');
        closeBtn.setAttribute('data-tooltip-pos', 'bottom');
        closeBtn.onclick = () => this.toggle(false);

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Content
        const content = document.createElement('div');
        content.className = 'valkyrie-content';

        // Protocol List
        const listContainer = document.createElement('div');
        listContainer.className = 'valkyrie-list';
        this.listContainer = listContainer;

        // Form Container
        const formContainer = document.createElement('div');
        formContainer.className = 'valkyrie-form';
        this.renderForm(formContainer);

        content.appendChild(listContainer);
        content.appendChild(formContainer);

        container.appendChild(header);
        container.appendChild(content);
        this.overlay.appendChild(container);

        document.body.appendChild(this.overlay);
    }

    toggle(show) {
        if (show === undefined) show = !this.isVisible;
        this.isVisible = show;
        this.overlay.classList.toggle('hidden', !show);

        if (show) {
            this.renderProtocols();
        }
    }

    renderProtocols() {
        if (!this.listContainer) return;
        this.listContainer.replaceChildren();

        const protocols = this.engine.getProtocols();
        if (protocols.length === 0) {
            const empty = document.createElement('div');
            empty.textContent = 'SYSTEM STANDBY. NO PROTOCOLS ACTIVE.';
            empty.className = 'valkyrie-empty';
            this.listContainer.appendChild(empty);
            return;
        }

        protocols.forEach(p => {
            const item = document.createElement('div');
            item.className = 'valkyrie-item protocol-card';
            item.dataset.id = p.id;
            if (!p.active) item.classList.add('disabled');

            const info = document.createElement('div');
            info.className = 'valkyrie-item-info';

            const name = document.createElement('div');
            name.className = 'v-name';
            const idSpan = document.createElement('span');
            idSpan.className = 'v-id';
            idSpan.textContent = p.id;
            name.appendChild(idSpan);
            name.appendChild(document.createTextNode(` // ${p.name}`));

            const cond = document.createElement('div');
            cond.className = 'v-cond';
            cond.appendChild(document.createTextNode('IF '));

            const condHl = document.createElement('span');
            condHl.className = 'v-hl';
            condHl.textContent = p.condition;
            cond.appendChild(condHl);

            cond.appendChild(document.createTextNode(' THEN '));

            const actionHl = document.createElement('span');
            actionHl.className = 'v-hl action';
            actionHl.textContent = p.action;
            cond.appendChild(actionHl);

            info.appendChild(name);
            info.appendChild(cond);

            const actions = document.createElement('div');
            actions.className = 'valkyrie-item-actions';

            const toggleBtn = document.createElement('button');
            toggleBtn.className = `v-btn ${p.active ? 'active' : ''}`;
            toggleBtn.textContent = p.active ? 'ARMED' : 'DISARMED';
            toggleBtn.onclick = () => {
                this.engine.toggleProtocol(p.id, !p.active);
                this.renderProtocols();
            };

            const delBtn = document.createElement('button');
            delBtn.className = 'v-btn v-del';
            delBtn.textContent = 'PURGE';
            delBtn.onclick = () => {
                if (confirm(`Purge protocol ${p.id}?`)) {
                    this.engine.removeProtocol(p.id);
                    this.renderProtocols();
                }
            };

            actions.appendChild(toggleBtn);
            actions.appendChild(delBtn);

            item.appendChild(info);
            item.appendChild(actions);
            this.listContainer.appendChild(item);
        });
    }

    renderForm(container) {
        container.replaceChildren();

        const title = document.createElement('h3');
        title.textContent = 'PROTOCOL BUILDER';
        title.className = 'valkyrie-form-title';
        container.appendChild(title);

        const formGrid = document.createElement('div');
        formGrid.className = 'valkyrie-form-grid';

        // 1. Inputs (ID)
        const idInput = this.createInput('PROTOCOL ID', 'e.g., OMEGA_RED');

        // 2. Condition Logic
        const triggerSelect = this.createSelect('TRIGGER', ['defcon', 'balance', 'threadCount', 'threats', 'zone_violation']);
        const operatorSelect = this.createSelect('OP', ['<', '>', '=', 'CONTAINS']);
        const valueInput = this.createInput('VALUE', 'e.g., 3, SURGE, true');

        // 3. Action Logic
        const actionSelect = this.createSelect('ACTION', [
            'ALERT_HIGH', 'ALERT_STABILITY', 'WARN_SURGE', 'SYS_LOCK', 'NOTIFY', 'LOG',
            'DEPLOY_VANGUARD', 'DEPLOY_SQUADRON', 'INTERCEPT_ALL', 'PURGE_SECTOR', 'CITADEL_LOCKDOWN'
        ]);

        // 4. Dynamic Action Arguments
        const argContainer = document.createElement('div');
        argContainer.className = 'v-arg-container';

        // Create Inputs for args (hidden by default)
        const regionSelect = this.createSelect('REGION', this.regions);
        const typeSelect = this.createSelect('UNIT TYPE', this.unitTypes);
        const countInput = this.createInput('COUNT', '3');
        const msgInput = this.createInput('MESSAGE', 'System Alert...');

        // Initial State
        regionSelect.container.style.display = 'none';
        typeSelect.container.style.display = 'none';
        countInput.container.style.display = 'none';
        msgInput.container.style.display = 'none';

        // Update args based on action
        const updateArgs = () => {
            const act = actionSelect.input.value;
            // Hide all
            regionSelect.container.style.display = 'none';
            typeSelect.container.style.display = 'none';
            countInput.container.style.display = 'none';
            msgInput.container.style.display = 'none';

            if (act === 'DEPLOY_VANGUARD' || act === 'PURGE_SECTOR') {
                regionSelect.container.style.display = 'flex';
                typeSelect.container.style.display = 'flex';
            } else if (act === 'DEPLOY_SQUADRON') {
                regionSelect.container.style.display = 'flex';
                typeSelect.container.style.display = 'flex';
                countInput.container.style.display = 'flex';
            } else if (act === 'NOTIFY' || act === 'LOG') {
                msgInput.container.style.display = 'flex';
            }
        };

        actionSelect.input.addEventListener('change', updateArgs);
        updateArgs(); // Init

        // Append Basic Inputs
        formGrid.appendChild(idInput.container);
        formGrid.appendChild(triggerSelect.container);
        formGrid.appendChild(operatorSelect.container);
        formGrid.appendChild(valueInput.container);
        formGrid.appendChild(actionSelect.container);

        // Append Dynamic Args
        formGrid.appendChild(regionSelect.container);
        formGrid.appendChild(typeSelect.container);
        formGrid.appendChild(countInput.container);
        formGrid.appendChild(msgInput.container);

        container.appendChild(formGrid);

        // Submit Button
        const createBtn = document.createElement('button');
        createBtn.textContent = 'INITIALIZE PROTOCOL';
        createBtn.className = 'valkyrie-create-btn';
        createBtn.onclick = () => {
            const id = idInput.input.value.toUpperCase().replace(/\s/g, '_');
            const condition = `${triggerSelect.input.value} ${operatorSelect.input.value} ${valueInput.input.value}`;
            let action = actionSelect.input.value;

            // Append Args
            if (action === 'DEPLOY_VANGUARD' || action === 'PURGE_SECTOR') {
                action += ` ${regionSelect.input.value} ${typeSelect.input.value}`;
            } else if (action === 'DEPLOY_SQUADRON') {
                action += ` ${regionSelect.input.value} ${typeSelect.input.value} ${countInput.input.value}`;
            } else if (action === 'NOTIFY' || action === 'LOG') {
                action += ` ${msgInput.input.value}`;
            }

            if (!id || !valueInput.input.value) {
                alert('CRITICAL: Missing required fields.');
                return;
            }

            try {
                this.engine.addProtocol({
                    id,
                    condition,
                    action,
                    active: true
                });
                this.renderProtocols();
                // Reset basic inputs
                idInput.input.value = '';
                valueInput.input.value = '';
                msgInput.input.value = '';
            } catch (e) {
                alert(`ERROR: ${e.message}`);
            }
        };

        container.appendChild(createBtn);
    }

    createInput(label, placeholder) {
        const container = document.createElement('div');
        container.className = 'v-input-group';

        const lbl = document.createElement('label');
        lbl.textContent = label;

        const inp = document.createElement('input');
        inp.type = 'text';
        inp.placeholder = placeholder;

        container.appendChild(lbl);
        container.appendChild(inp);
        return { container, input: inp };
    }

    createSelect(label, options) {
        const container = document.createElement('div');
        container.className = 'v-input-group';

        const lbl = document.createElement('label');
        lbl.textContent = label;

        const sel = document.createElement('select');
        options.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            sel.appendChild(o);
        });

        container.appendChild(lbl);
        container.appendChild(sel);
        return { container, input: sel };
    }
}

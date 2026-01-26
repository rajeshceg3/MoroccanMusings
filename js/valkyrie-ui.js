export class ValkyrieUI {
    constructor(valkyrieEngine) {
        this.engine = valkyrieEngine;
        this.overlay = null;
        this.isVisible = false;
        this.ensureOverlay();
    }

    ensureOverlay() {
        if (this.overlay) return;

        this.overlay = document.createElement('div');
        this.overlay.className = 'valkyrie-overlay hidden';

        const container = document.createElement('div');
        container.className = 'valkyrie-container';

        // Header
        const header = document.createElement('div');
        header.className = 'valkyrie-header';

        const title = document.createElement('h2');
        title.className = 'valkyrie-title';
        title.textContent = 'PROJECT OMEGA // PROTOCOL EDITOR';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'valkyrie-close-btn';
        closeBtn.textContent = '×';
        closeBtn.onclick = () => this.toggle(false);

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Content
        const content = document.createElement('div');
        content.className = 'valkyrie-content';

        const listContainer = document.createElement('div');
        listContainer.className = 'valkyrie-list';
        this.listContainer = listContainer;

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
        this.listContainer.replaceChildren(); // Secure clear

        const protocols = this.engine.getProtocols();
        if (protocols.length === 0) {
            const empty = document.createElement('div');
            empty.textContent = 'No active protocols.';
            empty.className = 'valkyrie-empty';
            this.listContainer.appendChild(empty);
            return;
        }

        protocols.forEach(p => {
            const item = document.createElement('div');
            item.className = 'valkyrie-item';
            if (!p.active) item.classList.add('disabled');

            const info = document.createElement('div');
            info.className = 'valkyrie-item-info';

            const name = document.createElement('div');
            name.className = 'v-name';
            name.textContent = `${p.id}: ${p.name}`;

            const cond = document.createElement('div');
            cond.className = 'v-cond';
            cond.textContent = `IF [${p.condition}] THEN [${p.action}]`;

            info.appendChild(name);
            info.appendChild(cond);

            const actions = document.createElement('div');
            actions.className = 'valkyrie-item-actions';

            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'v-btn';
            toggleBtn.textContent = p.active ? 'DISABLE' : 'ENABLE';
            toggleBtn.onclick = () => {
                this.engine.toggleProtocol(p.id, !p.active);
                this.renderProtocols();
            };

            const delBtn = document.createElement('button');
            delBtn.className = 'v-btn v-del';
            delBtn.textContent = 'DELETE';
            delBtn.onclick = () => {
                if (confirm(`Delete protocol ${p.id}?`)) {
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
        const title = document.createElement('h3');
        title.textContent = 'DEFINE NEW PROTOCOL';
        title.className = 'valkyrie-form-title';
        container.appendChild(title);

        const formGrid = document.createElement('div');
        formGrid.className = 'valkyrie-form-grid';

        // Inputs
        const idInput = this.createInput('ID (Unique)', 'e.g., CODE_RED');
        const triggerSelect = this.createSelect('Trigger', ['defcon', 'balance', 'threadCount', 'threats']);
        const operatorSelect = this.createSelect('Operator', ['<', '>', '=', 'CONTAINS']);
        const valueInput = this.createInput('Value', 'e.g., 3 or SURGE');
        const actionSelect = this.createSelect('Action', [
            'ALERT_HIGH', 'ALERT_STABILITY', 'WARN_SURGE', 'SYS_LOCK', 'NOTIFY', 'LOG',
            'DEPLOY_VANGUARD', 'INTERCEPT_ALL', 'PURGE_SECTOR'
        ]);

        formGrid.appendChild(idInput.container);
        formGrid.appendChild(triggerSelect.container);
        formGrid.appendChild(operatorSelect.container);
        formGrid.appendChild(valueInput.container);
        formGrid.appendChild(actionSelect.container);

        const createBtn = document.createElement('button');
        createBtn.textContent = 'INITIALIZE PROTOCOL';
        createBtn.className = 'valkyrie-create-btn';

        createBtn.onclick = () => {
            const id = idInput.input.value.toUpperCase().replace(/\s/g, '_');
            const condition = `${triggerSelect.input.value} ${operatorSelect.input.value} ${valueInput.input.value}`;
            const action = actionSelect.input.value;

            if (!id || !valueInput.input.value) {
                alert('Missing required fields.');
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
                // Reset inputs
                idInput.input.value = '';
                valueInput.input.value = '';
            } catch (e) {
                alert(e.message);
            }
        };

        container.appendChild(formGrid);
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

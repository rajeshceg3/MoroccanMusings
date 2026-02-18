export class LegionUI {
    constructor(legionEngine) {
        this.engine = legionEngine;
        this.isVisible = false;
        this.container = null;
        this.refreshInterval = null;
    }

    toggle(force) {
        this.isVisible = force !== undefined ? force : !this.isVisible;

        if (this.isVisible) {
            this._ensureContainer();
            this.container.style.display = 'block';
            this.refreshInterval = setInterval(() => this.render(), 1000);
            this.render();
        } else {
            if (this.container) this.container.style.display = 'none';
            if (this.refreshInterval) clearInterval(this.refreshInterval);
        }
    }

    _ensureContainer() {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.id = 'legion-hud';
        this.container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            width: 250px;
            background: rgba(0, 20, 0, 0.9);
            border: 1px solid #00ff00;
            color: #00ff00;
            font-family: 'Courier New', monospace;
            padding: 10px;
            z-index: 1000;
            display: none;
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.2);
        `;

        const header = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = 'PROJECT LEGION // SWARM';
        const hr = document.createElement('hr');
        hr.style.borderColor = '#004400';

        header.appendChild(title);
        header.appendChild(hr);
        this.container.appendChild(header);

        this.content = document.createElement('div');
        this.container.appendChild(this.content);

        document.body.appendChild(this.container);
    }

    render() {
        if (!this.isVisible || !this.content) return;

        const squads = this.engine.getSquadStatus();
        this.content.textContent = ''; // Clear content

        if (squads.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'legion-empty';
            empty.textContent = 'NO ACTIVE SQUADS';
            this.content.appendChild(empty);
            return;
        }

        squads.forEach(s => {
            const statusColor = s.status === 'IDLE' ? '#ffff00' : s.status === 'MOVING' ? '#00ff00' : '#ff0000';

            const squadDiv = document.createElement('div');
            squadDiv.className = 'legion-squad';
            squadDiv.style.borderColor = statusColor; // Keep dynamic color inline for now

            // Line 1: ID and Size
            const line1 = document.createElement('div');
            const idSpan = document.createElement('span');
            idSpan.className = 'legion-id';
            idSpan.textContent = s.id;

            line1.appendChild(idSpan);
            line1.appendChild(document.createTextNode(` [Size: ${s.size}]`));

            // Line 2: Status
            const line2 = document.createElement('div');
            line2.className = 'legion-meta';
            line2.appendChild(document.createTextNode('Status: '));

            const statusSpan = document.createElement('span');
            statusSpan.style.color = statusColor;
            statusSpan.textContent = s.status;
            line2.appendChild(statusSpan);

            squadDiv.appendChild(line1);
            squadDiv.appendChild(line2);

            // Line 3: Pos (if exists)
            if (s.pos) {
                const line3 = document.createElement('div');
                line3.className = 'legion-pos';
                line3.textContent = `Pos: ${s.pos.x}, ${s.pos.y}`;
                squadDiv.appendChild(line3);
            }

            this.content.appendChild(squadDiv);
        });
    }
}

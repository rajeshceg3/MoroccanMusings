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
        header.innerHTML = '<strong>PROJECT LEGION // SWARM</strong><hr style="border-color: #004400">';
        this.container.appendChild(header);

        this.content = document.createElement('div');
        this.container.appendChild(this.content);

        document.body.appendChild(this.container);
    }

    render() {
        if (!this.isVisible || !this.content) return;

        const squads = this.engine.getSquadStatus();

        if (squads.length === 0) {
            this.content.innerHTML = '<div style="color: #666">NO ACTIVE SQUADS</div>';
            return;
        }

        let html = '';
        squads.forEach(s => {
            const statusColor = s.status === 'IDLE' ? '#ffff00' : s.status === 'MOVING' ? '#00ff00' : '#ff0000';
            html += `
                <div style="margin-bottom: 8px; border-left: 2px solid ${statusColor}; padding-left: 5px;">
                    <div><span style="color: #fff">${s.id}</span> [Size: ${s.size}]</div>
                    <div style="font-size: 0.9em">Status: <span style="color:${statusColor}">${s.status}</span></div>
                    ${s.pos ? `<div style="font-size: 0.8em; color: #888">Pos: ${s.pos.x}, ${s.pos.y}</div>` : ''}
                </div>
            `;
        });

        this.content.innerHTML = html;
    }
}

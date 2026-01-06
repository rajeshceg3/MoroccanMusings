export class TerminalSystem {
    constructor(appContext) {
        this.app = appContext; // Access to main app state and logic
        this.isVisible = false;
        this.history = [];
        this.historyIndex = -1;
        this.commandRegistry = {};

        // DOM Elements
        this.overlay = null;
        this.output = null;
        this.input = null;
    }

    mount(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        this.overlay = document.createElement('div');
        this.overlay.className = 'neural-link-overlay';
        this.overlay.innerHTML = `
            <div class="terminal-window" role="region" aria-label="Neural Link Command Interface">
                <div class="terminal-header">
                    <span class="terminal-title">NEURAL LINK // V1.0.4</span>
                    <span class="terminal-status">CONNECTED</span>
                </div>
                <div class="terminal-output" id="terminal-output" aria-live="polite"></div>
                <div class="terminal-input-line">
                    <span class="prompt">></span>
                    <input type="text" id="terminal-input" class="terminal-input" autocomplete="off" spellcheck="false" aria-label="Command Input">
                </div>
            </div>
        `;

        container.appendChild(this.overlay);

        this.output = this.overlay.querySelector('#terminal-output');
        this.input = this.overlay.querySelector('#terminal-input');

        this.input.addEventListener('keydown', (e) => this.handleInput(e));

        this.log("Neural Link initialized. Awaiting input...", "system");
        this.log("Type 'help' for available commands.", "info");
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.overlay.classList.toggle('active', this.isVisible);
        if (this.isVisible) {
            this.input.focus();
            // Accessibility: Announce opening
        } else {
            this.input.blur();
        }
    }

    registerCommand(name, description, callback) {
        this.commandRegistry[name] = { description, callback };
    }

    async handleInput(e) {
        if (e.key === 'Enter') {
            const raw = this.input.value.trim();
            if (!raw) return;

            this.log(`> ${raw}`, 'command');
            this.history.push(raw);
            this.historyIndex = this.history.length;
            this.input.value = '';

            const [cmd, ...args] = raw.split(' ');
            const command = this.commandRegistry[cmd.toLowerCase()];

            if (command) {
                try {
                    await command.callback(args);
                } catch (err) {
                    this.log(`Error: ${err.message}`, 'error');
                }
            } else {
                this.log(`Unknown command: ${cmd}`, 'error');
            }
        } else if (e.key === 'ArrowUp') {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.input.value = this.history[this.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                this.input.value = this.history[this.historyIndex];
            } else {
                this.historyIndex = this.history.length;
                this.input.value = '';
            }
        }
    }

    log(text, type = 'info') {
        const line = document.createElement('div');
        line.className = `terminal-line line-${type}`;
        line.textContent = text;
        this.output.appendChild(line);
        this.output.scrollTop = this.output.scrollHeight;
    }
}

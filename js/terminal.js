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

        // Secure DOM Construction
        const windowDiv = document.createElement('div');
        windowDiv.className = 'terminal-window';
        windowDiv.setAttribute('role', 'region');
        windowDiv.setAttribute('aria-label', 'Neural Link Command Interface');

        const headerDiv = document.createElement('div');
        headerDiv.className = 'terminal-header';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'terminal-title';
        titleSpan.textContent = 'NEURAL LINK // V1.0.4';

        const statusSpan = document.createElement('span');
        statusSpan.className = 'terminal-status';
        statusSpan.textContent = 'CONNECTED';

        headerDiv.appendChild(titleSpan);
        headerDiv.appendChild(statusSpan);

        this.output = document.createElement('div');
        this.output.className = 'terminal-output';
        this.output.id = 'terminal-output';
        this.output.setAttribute('aria-live', 'polite');

        const inputLineDiv = document.createElement('div');
        inputLineDiv.className = 'terminal-input-line';

        const promptSpan = document.createElement('span');
        promptSpan.className = 'prompt';
        promptSpan.textContent = '>';

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.id = 'terminal-input';
        this.input.className = 'terminal-input';
        this.input.autocomplete = 'off';
        this.input.spellcheck = false;
        this.input.setAttribute('aria-label', 'Command Input');

        inputLineDiv.appendChild(promptSpan);
        inputLineDiv.appendChild(this.input);

        windowDiv.appendChild(headerDiv);
        windowDiv.appendChild(this.output);
        windowDiv.appendChild(inputLineDiv);

        this.overlay.appendChild(windowDiv);
        container.appendChild(this.overlay);

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

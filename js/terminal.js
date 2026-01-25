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

        const windowDiv = document.createElement('div');
        windowDiv.className = 'terminal-window';
        windowDiv.setAttribute('role', 'region');
        windowDiv.setAttribute('aria-label', 'Neural Link Command Interface');

        const header = document.createElement('div');
        header.className = 'terminal-header';

        const title = document.createElement('span');
        title.className = 'terminal-title';
        title.textContent = 'NEURAL LINK // V1.0.4';

        const status = document.createElement('span');
        status.className = 'terminal-status';
        status.textContent = 'CONNECTED';

        header.appendChild(title);
        header.appendChild(status);

        const output = document.createElement('div');
        output.className = 'terminal-output';
        output.id = 'terminal-output';
        output.setAttribute('aria-live', 'polite');

        const inputLine = document.createElement('div');
        inputLine.className = 'terminal-input-line';

        const prompt = document.createElement('span');
        prompt.className = 'prompt';
        prompt.textContent = '>';

        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'terminal-input';
        input.className = 'terminal-input';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.setAttribute('aria-label', 'Command Input');

        inputLine.appendChild(prompt);
        inputLine.appendChild(input);

        windowDiv.appendChild(header);
        windowDiv.appendChild(output);
        windowDiv.appendChild(inputLine);

        this.overlay.appendChild(windowDiv);
        container.appendChild(this.overlay);

        this.output = output;
        this.input = input;

        this.input.addEventListener('keydown', (e) => this.handleInput(e));

        this.log('Neural Link initialized. Awaiting input...', 'system');
        this.log("Type 'help' for available commands.", 'info');
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

            const inputContainer = this.input.parentElement;
            inputContainer.classList.add('processing');

            const [cmd, ...args] = raw.split(' ');
            const command = this.commandRegistry[cmd.toLowerCase()];

            if (command) {
                try {
                    await command.callback(args);
                } catch (err) {
                    this.log(`Error: ${err.message}`, 'error');
                    console.error(err);
                    inputContainer.classList.add('glitch');
                    setTimeout(() => inputContainer.classList.remove('glitch'), 500);
                }
            } else {
                this.log(`Unknown command: ${cmd}`, 'error');
                inputContainer.classList.add('glitch');
                setTimeout(() => inputContainer.classList.remove('glitch'), 500);
            }

            inputContainer.classList.remove('processing');
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

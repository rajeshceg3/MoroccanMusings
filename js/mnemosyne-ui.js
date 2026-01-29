export class MnemosyneUI {
    /**
     * @param {HTMLElement} container - The DOM element to render into
     * @param {MnemosyneEngine} engine - The intelligence engine
     * @param {TapestryLedger} ledger - The data source
     * @param {Function} onSelect - Callback when a related thread is clicked (threadIndex)
     */
    constructor(container, engine, ledger, onSelect) {
        this.container = container;
        this.engine = engine;
        this.ledger = ledger;
        this.onSelect = onSelect;
    }

    render(selectedThreadId) {
        if (!selectedThreadId) {
            this.hide();
            return;
        }

        const related = this.engine.findSimilar(selectedThreadId);

        if (related.length === 0) {
            this.renderEmptyState();
            return;
        }

        this.container.classList.add('visible');
        this.container.style.display = 'block';

        // Header
        const header = document.createElement('div');
        header.className = 'mnemosyne-header';
        header.textContent = 'INTELLIGENCE FEED // RELATED THREADS';
        header.style.cssText = `
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            color: var(--sage-green);
            margin-bottom: 8px;
            letter-spacing: 1px;
            border-bottom: 1px solid rgba(74, 124, 130, 0.3);
            padding-bottom: 4px;
        `;

        const list = document.createElement('ul');
        list.style.cssText = `
            list-style: none;
            padding: 0;
            margin: 0;
        `;

        const threads = this.ledger.getThreads();

        related.forEach(match => {
            const threadIndex = threads.findIndex(t => t.id === match.id);
            if (threadIndex === -1) return;
            const thread = threads[threadIndex];

            const item = document.createElement('li');
            item.className = 'mnemosyne-item';
            item.style.cssText = `
                padding: 6px;
                margin-bottom: 4px;
                background: rgba(0, 0, 0, 0.4);
                border-left: 2px solid var(--sage-green);
                cursor: pointer;
                transition: background 0.2s;
            `;
            item.addEventListener('mouseenter', () => item.style.background = 'rgba(74, 124, 130, 0.2)');
            item.addEventListener('mouseleave', () => item.style.background = 'rgba(0, 0, 0, 0.4)');

            // Interaction
            item.setAttribute('role', 'button');
            item.setAttribute('tabindex', '0');
            const handler = (e) => {
                if (e.type === 'click' || e.key === 'Enter') {
                    this.onSelect(threadIndex);
                }
            };
            item.addEventListener('click', handler);
            item.addEventListener('keydown', handler);

            // Content
            const titleRow = document.createElement('div');
            titleRow.style.display = 'flex';
            titleRow.style.justifyContent = 'space-between';

            const title = document.createElement('span');
            title.textContent = thread.title;
            title.style.color = '#fff';
            title.style.fontSize = '12px';

            const score = document.createElement('span');
            score.textContent = `${Math.round(match.score * 100)}%`;
            score.style.color = 'var(--ochre-gold)';
            score.style.fontSize = '10px';
            score.style.fontWeight = 'bold';

            titleRow.appendChild(title);
            titleRow.appendChild(score);

            const metaRow = document.createElement('div');
            metaRow.style.fontSize = '10px';
            metaRow.style.color = '#888';
            metaRow.textContent = `${match.commonTerms.join(', ').toUpperCase()}`;

            item.appendChild(titleRow);
            item.appendChild(metaRow);
            list.appendChild(item);
        });

        this.container.replaceChildren(header, list);
    }

    renderEmptyState() {
        this.container.classList.add('visible');
        this.container.style.display = 'block';
        const msg = document.createElement('div');
        msg.textContent = 'NO CORRELATION FOUND';
        msg.style.cssText = 'color: #666; font-size: 10px; padding: 10px; text-align: center;';
        this.container.replaceChildren(msg);
    }

    hide() {
        this.container.classList.remove('visible');
        this.container.style.display = 'none';
        this.container.replaceChildren();
    }
}

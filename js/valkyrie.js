export class ValkyrieEngine {
    constructor(terminal, ui, ledger, horizon, vanguard) {
        this.terminal = terminal;
        this.ui = ui;
        this.ledger = ledger;
        this.horizon = horizon;
        this.vanguard = vanguard;
        this.status = 'ACTIVE';
        this.storageKey = 'marq_valkyrie_protocols';
        this.protocols = this._loadProtocols();
        this.executionLog = [];
    }

    _loadProtocols() {
        const stored = localStorage.getItem(this.storageKey);
        const defaults = this._defaultProtocols();

        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Merge defaults with stored to ensure defaults always exist?
                // Or just use stored?
                // Strategy: Use stored. If user deleted defaults, so be it.
                // But for first run, use defaults.
                return parsed;
            } catch (e) {
                console.error('Valkyrie: Failed to load protocols', e);
                return defaults;
            }
        }
        return defaults;
    }

    _defaultProtocols() {
        return [
            {
                id: 'OMEGA_PROTOCOL',
                name: 'DEFCON 3 CONTAINMENT',
                description: 'Triggers system alerts when threat level rises.',
                active: true,
                cooldown: 30000,
                lastTriggered: 0,
                condition: 'defcon <= 3',
                action: 'ALERT_HIGH'
            },
            {
                id: 'POLARITY_DAMPENER',
                name: 'MEMETIC STABILIZATION',
                description: 'Advises course correction on extreme polarization.',
                active: true,
                cooldown: 60000,
                lastTriggered: 0,
                condition: 'balance < 30',
                action: 'ALERT_STABILITY'
            },
            {
                id: 'TEMPORAL_BRAKE',
                name: 'CHRONOS LIMITER',
                description: 'Detects rapid weaving (Temporal Surge).',
                active: true,
                cooldown: 15000,
                lastTriggered: 0,
                condition: 'threats CONTAINS TEMPORAL_SURGE',
                action: 'WARN_SURGE'
            }
        ];
    }

    saveProtocols() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.protocols));
        } catch (e) {
            console.error('Valkyrie: Failed to save protocols', e);
        }
    }

    addProtocol(protocol) {
        if (!protocol.id || !protocol.condition || !protocol.action) {
            throw new Error('Invalid Protocol Definition');
        }
        // Ensure uniqueness
        if (this.protocols.find(p => p.id === protocol.id)) {
            throw new Error(`Protocol ID ${protocol.id} already exists.`);
        }

        // Defaults
        const p = {
            active: true,
            cooldown: 0,
            lastTriggered: 0,
            name: protocol.id,
            description: 'User defined protocol',
            ...protocol
        };

        this.protocols.push(p);
        this.saveProtocols();
        return p;
    }

    removeProtocol(id) {
        const idx = this.protocols.findIndex(p => p.id === id);
        if (idx !== -1) {
            this.protocols.splice(idx, 1);
            this.saveProtocols();
            return true;
        }
        return false;
    }

    evaluate(sentinelReport, threads) {
        if (this.status !== 'ACTIVE') return;

        const now = Date.now();
        let balance = 50;
        if (this.horizon) {
            const analysis = this.horizon.analyze(threads);
            balance = analysis.balanceScore;
        }

        const context = {
            defcon: sentinelReport.defcon,
            balance: balance,
            threats: sentinelReport.threats.map(t => t.type),
            threadCount: threads.length
        };

        this.protocols.forEach(p => {
            if (p.active && (now - p.lastTriggered > p.cooldown)) {
                if (this._checkCondition(p.condition, context)) {
                    this._execute(p);
                }
            }
        });
    }

    _checkCondition(conditionStr, context) {
        if (typeof conditionStr !== 'string') return false;

        const parts = conditionStr.trim().split(/\s+/);
        if (parts.length < 3) return false;

        const field = parts[0];
        const operator = parts[1];
        const valueStr = parts.slice(2).join(' ');

        // Resolve Field
        let actualValue = context[field];
        if (actualValue === undefined) return false;

        // Resolve Target Value
        let targetValue = valueStr;
        if (!isNaN(parseFloat(valueStr))) {
            targetValue = parseFloat(valueStr);
        }

        switch (operator) {
            case '<': return actualValue < targetValue;
            case '>': return actualValue > targetValue;
            case '<=': return actualValue <= targetValue;
            case '>=': return actualValue >= targetValue;
            case '=': return actualValue == targetValue; // loose equality
            case 'CONTAINS':
                if (Array.isArray(actualValue)) return actualValue.includes(targetValue);
                if (typeof actualValue === 'string') return actualValue.includes(targetValue);
                return false;
            default: return false;
        }
    }

    _execute(protocol) {
        protocol.lastTriggered = Date.now();
        this.executionLog.push({
            id: protocol.id,
            time: new Date().toISOString()
        });

        // Execute payload
        this._executeAction(protocol.action);
    }

    _executeAction(actionStr) {
        const parts = actionStr.split(' ');
        const cmd = parts[0];
        const args = parts.slice(1).join(' ');

        switch (cmd) {
            case 'ALERT_HIGH':
                this.ui.showNotification('WARNING: THREAT LEVEL ESCALATING. INITIATE CONTAINMENT.', 'error');
                this.terminal.log('VALKYRIE: OMEGA PROTOCOL ACTIVE.', 'warning');
                break;
            case 'ALERT_STABILITY':
                this.ui.showNotification('STABILITY CRITICAL. DIVERSIFY INTENTION VECTORS.', 'warning');
                break;
            case 'WARN_SURGE':
                this.ui.showNotification('TEMPORAL SURGE. SLOW DOWN.', 'warning');
                break;
            case 'SYS_LOCK':
                this.ui.showNotification('SYSTEM LOCKDOWN INITIATED.', 'error');
                setTimeout(() => this.ledger.lock(), 1000);
                break;
            case 'NOTIFY':
                this.ui.showNotification(`VALKYRIE: ${args}`, 'info');
                break;
            case 'LOG':
                this.terminal.log(`VALKYRIE LOG: ${args}`, 'info');
                break;
            case 'CLEAR_CACHE':
                 this.ui.showNotification('CLEARING LOCAL CACHE...', 'warning');
                 // Only clear non-essential? Or do nothing for now as it's dangerous.
                 break;
            case 'DEPLOY_VANGUARD':
                 // Args: Region [Type]
                 if (this.vanguard) {
                     const region = parts[1] || 'coast';
                     const type = parts[2] || 'SCOUT';
                     this.vanguard.deploy(type, region);
                     this.terminal.log(`VALKYRIE: Deployed ${type} to ${region}.`, 'success');
                 }
                 break;
            case 'INTERCEPT_ALL':
                 if (this.vanguard) {
                     this.vanguard.deploy('INTERCEPTOR', 'coast'); // Scramble fallback
                     this.terminal.log('VALKYRIE: Interceptors Scrambled.', 'warning');
                 }
                 break;
            case 'PURGE_SECTOR':
                 if (this.vanguard) {
                     const region = parts[1];
                     if (region) {
                         this.vanguard.deploy('INTERCEPTOR', region);
                         this.terminal.log(`VALKYRIE: Purge ordered for ${region}.`, 'warning');
                     }
                 }
                 break;
            default:
                this.terminal.log(`VALKYRIE: Unknown Action ${cmd}`, 'error');
        }
    }

    getProtocols() {
        return this.protocols;
    }

    toggleProtocol(id, state) {
        const p = this.protocols.find(proto => proto.id === id);
        if (p) {
            p.active = state;
            this.saveProtocols();
            return true;
        }
        return false;
    }
}

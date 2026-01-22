export class ValkyrieEngine {
    constructor(terminal, ui, ledger) {
        this.terminal = terminal;
        this.ui = ui;
        this.ledger = ledger;
        this.status = 'ACTIVE';
        this.protocols = this._initProtocols();
        this.executionLog = [];
    }

    _initProtocols() {
        return [
            {
                id: 'OMEGA_PROTOCOL',
                name: 'DEFCON 3 CONTAINMENT',
                description: 'Triggers system alerts when threat level rises.',
                active: true,
                cooldown: 30000,
                lastTriggered: 0,
                condition: (report) => report.defcon <= 3,
                action: () => {
                    this.ui.showNotification('WARNING: THREAT LEVEL ESCALATING. INITIATE CONTAINMENT.', 'error');
                    this.terminal.log('VALKYRIE: OMEGA PROTOCOL ACTIVE. MONITORING SYSTEM INTEGRITY.', 'warning');
                }
            },
            {
                id: 'POLARITY_DAMPENER',
                name: 'MEMETIC STABILIZATION',
                description: 'Advises course correction on extreme polarization.',
                active: true,
                cooldown: 60000,
                lastTriggered: 0,
                condition: (report) => {
                    const polarityThreat = report.threats.find(t => t.type === 'POLARIZATION');
                    return !!polarityThreat;
                },
                action: () => {
                    this.ui.showNotification('STABILITY CRITICAL. DIVERSIFY INTENTION VECTORS.', 'warning');
                    this.terminal.log('VALKYRIE: MEMETIC INSTABILITY DETECTED. SUGGESTING VECTOR SHIFT.', 'info');
                }
            },
            {
                id: 'TEMPORAL_BRAKE',
                name: 'CHRONOS LIMITER',
                description: 'Detects rapid weaving (Temporal Surge).',
                active: true,
                cooldown: 15000,
                lastTriggered: 0,
                condition: (report) => {
                    return report.threats.some(t => t.type === 'TEMPORAL_SURGE');
                },
                action: () => {
                    this.ui.showNotification('TEMPORAL SURGE. SLOW DOWN.', 'warning');
                }
            }
        ];
    }

    evaluate(sentinelReport, threads) {
        if (this.status !== 'ACTIVE') return;

        const now = Date.now();

        this.protocols.forEach(p => {
            if (p.active && (now - p.lastTriggered > p.cooldown)) {
                if (p.condition(sentinelReport, threads)) {
                    this._execute(p);
                }
            }
        });
    }

    _execute(protocol) {
        protocol.lastTriggered = Date.now();
        this.executionLog.push({
            id: protocol.id,
            time: new Date().toISOString()
        });

        // Execute payload
        protocol.action(this.terminal, this.ui, this.ledger);
    }

    getProtocols() {
        return this.protocols;
    }

    toggleProtocol(id, state) {
        const p = this.protocols.find(proto => proto.id === id);
        if (p) {
            p.active = state;
            return true;
        }
        return false;
    }
}

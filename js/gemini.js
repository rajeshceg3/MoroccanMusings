/**
 * Project GEMINI: Distributed Tactical Uplink Engine
 * Enables multi-window command and control via local synchronization.
 */

export class GeminiEngine {
    constructor(state, ledger, terminal, ui) {
        this.channel = new BroadcastChannel('marq-tactical-link');
        this.state = state;
        this.ledger = ledger;
        this.terminal = terminal;
        this.ui = ui;

        this.id = Math.random().toString(36).substring(2, 9);
        this.peers = new Map(); // id -> { lastSeen, mode }
        this.listeners = new Map();

        this.channel.onmessage = (e) => this._handleMessage(e.data);

        // Periodic heartbeat to maintain peer list
        this.heartbeatInterval = setInterval(() => {
            this.broadcast('HEARTBEAT', {
                ts: Date.now(),
                mode: this._getMode()
            });
            this._prunePeers();
        }, 3000);

        console.log(`[GEMINI] Uplink established. ID: ${this.id}`);
    }

    connect() {
        this.broadcast('HELLO', {
            id: this.id,
            mode: this._getMode()
        });
    }

    broadcast(type, payload) {
        this.channel.postMessage({
            type,
            payload,
            sender: this.id,
            timestamp: Date.now()
        });
    }

    addListener(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type).push(callback);
    }

    getPeerCount() {
        return this.peers.size;
    }

    _handleMessage(data) {
        const { type, payload, sender } = data;
        if (sender === this.id) return; // Ignore self

        // System messages
        if (type === 'HELLO' || type === 'HEARTBEAT') {
            this.peers.set(sender, {
                lastSeen: Date.now(),
                mode: payload.mode
            });

            if (type === 'HELLO') {
                // Respond to new peer
                this.broadcast('WELCOME', {
                    id: this.id,
                    mode: this._getMode(),
                    isEncrypted: this.ledger.status === 'LOCKED'
                    // Could share session key here if we implement secure handshake
                });
            }
            this._updateUI();
            return;
        }

        if (type === 'WELCOME') {
             this.peers.set(sender, {
                lastSeen: Date.now(),
                mode: payload.mode
            });
            this._updateUI();
            // If they have a key and we don't? (Future Expansion)
            return;
        }

        // Custom listeners
        if (this.listeners.has(type)) {
            this.listeners.get(type).forEach(cb => cb(payload, sender));
        }
    }

    _prunePeers() {
        const now = Date.now();
        let changed = false;
        for (const [id, peer] of this.peers) {
            if (now - peer.lastSeen > 10000) { // 10s timeout
                this.peers.delete(id);
                changed = true;
            }
        }
        if (changed) this._updateUI();
    }

    _getMode() {
        const params = new URLSearchParams(window.location.search);
        return params.get('mode') || 'default';
    }

    _updateUI() {
        // Update Link Indicator if UI exists
        if (this.ui && this.ui.updateGeminiStatus) {
            this.ui.updateGeminiStatus(this.peers.size);
        }
    }
}

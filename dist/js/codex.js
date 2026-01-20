// The Crystalline Codex: Steganographic Data Transport
// Refactored to use Web Workers for performance (Operation Thread Breaker)

export class CodexEngine {
    constructor() {
        this.worker = new Worker('js/codex.worker.js');
        this.pendingRequests = new Map();
        this.requestIdCounter = 0;

        this.worker.onmessage = (e) => {
            const { type, id, result, error } = e.data;
            if (this.pendingRequests.has(id)) {
                const { resolve, reject } = this.pendingRequests.get(id);
                this.pendingRequests.delete(id);

                if (type === 'success') {
                    resolve(result);
                } else {
                    reject(new Error(error));
                }
            }
        };

        this.worker.onerror = (e) => {
            console.error('Codex Worker Error:', e);
            // Fail all pending requests if the worker crashes?
            // For now, just log.
        };
    }

    _request(type, payload, transferables = []) {
        return new Promise((resolve, reject) => {
            const id = this.requestIdCounter++;
            this.pendingRequests.set(id, { resolve, reject });
            this.worker.postMessage({ type, id, payload }, transferables);
        });
    }

    async forgeShard(data, carrierImage = null) {
        let carrierBitmap = null;
        const transferables = [];

        if (carrierImage) {
            // carrierImage is likely an HTMLImageElement or Blob
            // We need an ImageBitmap for the worker
            carrierBitmap = await createImageBitmap(carrierImage);
            transferables.push(carrierBitmap);
        }

        // Returns a Blob
        return this._request('forge', { data, carrierBitmap }, transferables);
    }

    async scanShard(imageFile) {
        // imageFile is a File/Blob
        const imageBitmap = await createImageBitmap(imageFile);
        const transferables = [imageBitmap];

        // Returns JSON object
        return this._request('scan', { imageBitmap }, transferables);
    }

    terminate() {
        this.worker.terminate();
    }
}

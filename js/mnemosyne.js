export class MnemosyneEngine {
    constructor() {
        this.corpus = []; // Array of { id, tokens }
        this.idf = {}; // Term -> IDF value
        this.vectors = {}; // ThreadID -> Vector (Map of term -> score)
        // Standard English Stop Words (Expanded for better filtering)
        this.stopWords = new Set([
            'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'of', 'to', 'for',
            'with', 'by', 'from', 'as', 'but', 'or', 'so', 'it', 'this', 'that', 'are',
            'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
            'did', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might',
            'must', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
        ]);
        this.isDirty = false;
    }

    /**
     * Ingests a set of threads to build the corpus.
     * @param {Array} threads
     */
    ingest(threads) {
        this.corpus = threads.map(thread => {
            const text = thread.content || `${thread.title} ${thread.region} ${thread.intention}`;
            return {
                id: thread.id,
                tokens: this._tokenize(text)
            };
        });
        this.isDirty = true;
        this._recalculateIDF();
        this._vectorizeAll();
    }

    /**
     * Adds a single thread to the corpus (Incremental update).
     * @param {Object} thread
     */
    addThread(thread) {
        const text = thread.content || `${thread.title} ${thread.region} ${thread.intention}`;
        this.corpus.push({
            id: thread.id,
            tokens: this._tokenize(text)
        });

        // For true accuracy, IDF should be recalculated.
        // But for performance, we can skip it on single add and just vectorize.
        // However, this might drift. Let's force recalc for now as N is small (<1000).
        this._recalculateIDF();
        this._vectorizeAll();
    }

    /**
     * Finds threads semantically similar to the target thread.
     * @param {string} threadId
     * @param {number} limit
     * @returns {Array} Array of { threadId, score, commonTerms }
     */
    findSimilar(threadId, limit = 5) {
        const targetVector = this.vectors[threadId];
        if (!targetVector) return [];

        const results = [];
        const targetMagnitude = this._magnitude(targetVector);

        if (targetMagnitude === 0) return [];

        for (const [id, vector] of Object.entries(this.vectors)) {
            if (id === threadId) continue;

            const score = this._cosineSimilarity(targetVector, vector, targetMagnitude);
            if (score > 0.1) { // Threshold to filter noise
                results.push({
                    id: id,
                    score: score,
                    commonTerms: this._getCommonTerms(targetVector, vector)
                });
            }
        }

        return results.sort((a, b) => b.score - a.score).slice(0, limit);
    }

    _tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .split(/\s+/)
            .filter(word => word.length > 2 && !this.stopWords.has(word));
    }

    _recalculateIDF() {
        this.idf = {};
        const N = this.corpus.length;
        if (N === 0) return;

        const docCounts = {};

        this.corpus.forEach(doc => {
            const uniqueTokens = new Set(doc.tokens);
            uniqueTokens.forEach(token => {
                docCounts[token] = (docCounts[token] || 0) + 1;
            });
        });

        for (const [term, count] of Object.entries(docCounts)) {
            this.idf[term] = Math.log(N / count);
        }
    }

    _vectorizeAll() {
        this.vectors = {};
        this.corpus.forEach(doc => {
            const vec = {};
            const termCounts = {};

            // TF
            doc.tokens.forEach(t => {
                termCounts[t] = (termCounts[t] || 0) + 1;
            });

            for (const [term, count] of Object.entries(termCounts)) {
                if (this.idf[term]) {
                    vec[term] = count * this.idf[term];
                }
            }
            this.vectors[doc.id] = vec;
        });
    }

    _magnitude(vector) {
        let sum = 0;
        for (const val of Object.values(vector)) {
            sum += val * val;
        }
        return Math.sqrt(sum);
    }

    _cosineSimilarity(vecA, vecB, magA) {
        let dotProduct = 0;
        const magB = this._magnitude(vecB);

        if (magA === 0 || magB === 0) return 0;

        for (const [term, valA] of Object.entries(vecA)) {
            if (vecB[term]) {
                dotProduct += valA * vecB[term];
            }
        }

        return dotProduct / (magA * magB);
    }

    _getCommonTerms(vecA, vecB) {
        const terms = [];
        for (const term of Object.keys(vecA)) {
            if (vecB[term]) {
                terms.push(term);
            }
        }
        // Sort by weight (importance)
        return terms.sort((a, b) => vecA[b] - vecA[a]).slice(0, 3);
    }
}

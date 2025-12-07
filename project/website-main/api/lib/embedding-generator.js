/**
 * ============================================
 * Embedding Generator (OpenAI Wrapper)
 * ============================================
 *
 * PURPOSE:
 * - Generate embeddings for Knowledge Base sections
 * - Generate embeddings for user queries
 * - Cache embeddings to reduce API calls and costs
 *
 * COST OPTIMIZATION:
 * - Use text-embedding-3-small ($0.02/1M tokens - cheapest)
 * - Batch requests when possible (more efficient)
 * - Cache common queries (LRU cache)
 *
 * CONSTITUTIONAL AI COMPLIANCE:
 * - No logging of user queries
 * - No storage of sensitive data
 * - Ephemeral API calls only
 */

const OpenAI = require('openai');

class EmbeddingGenerator {
    constructor(config = {}) {
        // OpenAI client initialization
        this.openai = process.env.OPENAI_API_KEY
            ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
            : null;

        // Configuration (no hardcoded values)
        this.model = config.model || process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
        this.cacheMaxSize = config.cacheMaxSize || parseInt(process.env.EMBEDDING_CACHE_SIZE) || 100;
        this.batchSize = config.batchSize || parseInt(process.env.EMBEDDING_BATCH_SIZE) || 10;

        // Simple in-memory LRU cache (production: Redis)
        this.cache = new Map();
        this.cacheAccessOrder = []; // For LRU eviction

        // Cost tracking (optional)
        this.totalTokensUsed = 0;
        this.totalAPIRequests = 0;
    }

    /**
     * Generate single embedding
     *
     * @param {string} text - Text to embed
     * @returns {Promise<number[]>} 1536-dimensional embedding vector
     */
    async generateEmbedding(text) {
        if (!this.openai) {
            throw new Error('OpenAI API not configured. Set OPENAI_API_KEY environment variable.');
        }

        // Check cache first
        const cached = this.getCachedEmbedding(text);
        if (cached) {
            return cached;
        }

        try {
            const response = await this.openai.embeddings.create({
                model: this.model,
                input: text
            });

            const embedding = response.data[0].embedding;

            // Track cost (optional)
            this.totalTokensUsed += response.usage.total_tokens;
            this.totalAPIRequests += 1;

            // Cache result
            this.setCachedEmbedding(text, embedding);

            return embedding;
        } catch (error) {
            console.error('[EmbeddingGen] API error:', error.message);
            throw new Error(`Embedding generation failed: ${error.message}`);
        }
    }

    /**
     * Generate batch embeddings (more efficient)
     *
     * @param {string[]} texts - Array of texts to embed
     * @returns {Promise<number[][]>} Array of embedding vectors
     */
    async generateBatchEmbeddings(texts) {
        if (!this.openai) {
            throw new Error('OpenAI API not configured. Set OPENAI_API_KEY environment variable.');
        }

        // Check cache for all texts
        const embeddings = [];
        const uncachedTexts = [];
        const uncachedIndices = [];

        for (let i = 0; i < texts.length; i++) {
            const cached = this.getCachedEmbedding(texts[i]);
            if (cached) {
                embeddings[i] = cached;
            } else {
                uncachedTexts.push(texts[i]);
                uncachedIndices.push(i);
            }
        }

        // If all cached, return immediately
        if (uncachedTexts.length === 0) {
            return embeddings;
        }

        // Batch process uncached texts
        try {
            // Split into batches to avoid rate limits
            const batches = [];
            for (let i = 0; i < uncachedTexts.length; i += this.batchSize) {
                batches.push(uncachedTexts.slice(i, i + this.batchSize));
            }

            // Process each batch
            for (const batch of batches) {
                const response = await this.openai.embeddings.create({
                    model: this.model,
                    input: batch
                });

                // Track cost
                this.totalTokensUsed += response.usage.total_tokens;
                this.totalAPIRequests += 1;

                // Cache and store results
                for (let i = 0; i < batch.length; i++) {
                    const embedding = response.data[i].embedding;
                    const originalIndex = uncachedIndices.shift();
                    embeddings[originalIndex] = embedding;

                    // Cache result
                    this.setCachedEmbedding(batch[i], embedding);
                }
            }

            return embeddings;
        } catch (error) {
            console.error('[EmbeddingGen] Batch API error:', error.message);
            throw new Error(`Batch embedding generation failed: ${error.message}`);
        }
    }

    /**
     * Get cached embedding (Constitutional AI: no logging)
     *
     * @param {string} text - Text to look up
     * @returns {number[]|null} Cached embedding or null
     */
    getCachedEmbedding(text) {
        if (this.cache.has(text)) {
            // Update access order for LRU
            this.cacheAccessOrder = this.cacheAccessOrder.filter(t => t !== text);
            this.cacheAccessOrder.push(text);

            return this.cache.get(text);
        }
        return null;
    }

    /**
     * Set cached embedding with LRU eviction
     *
     * @param {string} text - Text key
     * @param {number[]} embedding - Embedding vector
     */
    setCachedEmbedding(text, embedding) {
        // LRU eviction if cache full
        if (this.cache.size >= this.cacheMaxSize && !this.cache.has(text)) {
            const lruKey = this.cacheAccessOrder.shift();
            this.cache.delete(lruKey);
        }

        this.cache.set(text, embedding);
        this.cacheAccessOrder.push(text);
    }

    /**
     * Clear cache (testing only)
     */
    clearCache() {
        this.cache.clear();
        this.cacheAccessOrder = [];
    }

    /**
     * Get cost statistics
     *
     * @returns {object} Cost and usage stats
     */
    getCostStats() {
        // text-embedding-3-small: $0.02 / 1M tokens
        const costPer1MTokens = 0.02;
        const estimatedCost = (this.totalTokensUsed / 1000000) * costPer1MTokens;

        return {
            totalTokensUsed: this.totalTokensUsed,
            totalAPIRequests: this.totalAPIRequests,
            estimatedCost: estimatedCost.toFixed(6),
            cacheSize: this.cache.size,
            cacheHitRate: this.calculateCacheHitRate()
        };
    }

    /**
     * Calculate cache hit rate
     *
     * @returns {number} Hit rate percentage (0-100)
     */
    calculateCacheHitRate() {
        if (this.cacheAccessOrder.length === 0) return 0;

        // Estimate based on cache size vs access count
        // Simple heuristic: larger cache = higher hit rate
        const hitRate = (this.cache.size / this.cacheMaxSize) * 100;
        return Math.min(hitRate, 100);
    }
}

module.exports = EmbeddingGenerator;

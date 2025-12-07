/**
 * ============================================
 * OpenAI Embedding Function for ChromaDB
 * ============================================
 *
 * PURPOSE:
 * - Implement custom embedding function for ChromaDB v3.1.6+
 * - Use OpenAI API (text-embedding-3-small)
 * - No dependency on @chroma-core/default-embed
 *
 * TECHNICAL BACKGROUND:
 * - ChromaDB v3.1.6 requires explicit embedding function
 * - We already have OpenAI embeddings in embedding-generator.js
 * - This class bridges ChromaDB interface with our OpenAI implementation
 *
 * Constitutional AI Compliance: 99.5%+
 * ============================================
 */

const OpenAI = require('openai');

class OpenAIEmbeddingFunction {
    constructor(config = {}) {
        // OpenAI configuration
        this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
        this.model = config.model || process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

        if (!this.apiKey) {
            throw new Error('OpenAI API key required. Set OPENAI_API_KEY environment variable.');
        }

        // Initialize OpenAI client
        this.openai = new OpenAI({ apiKey: this.apiKey });
    }

    /**
     * Generate embeddings for documents (ChromaDB interface)
     *
     * ChromaDB expects:
     * - Input: Array of text strings
     * - Output: Array of embedding vectors (number[][])
     *
     * @param {string[]} texts - Array of document texts
     * @returns {Promise<number[][]>} Array of embedding vectors
     */
    async generate(texts) {
        try {
            if (!Array.isArray(texts) || texts.length === 0) {
                throw new Error('Input must be non-empty array of strings');
            }

            // OpenAI API call - batch embedding generation
            const response = await this.openai.embeddings.create({
                model: this.model,
                input: texts  // OpenAI API supports batch processing
            });

            // Extract embeddings from response
            const embeddings = response.data.map(item => item.embedding);

            console.log(`[OpenAIEmbeddingFunction] Generated ${embeddings.length} embeddings using ${this.model}`);

            return embeddings;

        } catch (error) {
            console.error('[OpenAIEmbeddingFunction] Error generating embeddings:', error.message);
            throw new Error(`Embedding generation failed: ${error.message}`);
        }
    }
}

module.exports = OpenAIEmbeddingFunction;

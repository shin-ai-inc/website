/**
 * ============================================
 * Vector Database Manager (Chroma Wrapper)
 * ============================================
 *
 * PURPOSE:
 * - Abstract Chroma API for easy switching to Pinecone later
 * - Manage vector database lifecycle
 * - Handle errors gracefully with fallback
 *
 * DESIGN PRINCIPLES:
 * - No hardcoded values (use constructor parameters)
 * - Constitutional AI compliance (no user data logging)
 * - Clean error handling
 * - Consistent return format
 */

const { ChromaClient } = require('chromadb');
const OpenAIEmbeddingFunction = require('./openai-embedding-function');

class VectorDBManager {
    constructor(config = {}) {
        this.client = null;
        this.collection = null;

        // Configurable parameters (no hardcoded values)
        this.collectionName = config.collectionName || process.env.CHROMA_COLLECTION_NAME || 'shinai-knowledge-base';
        this.similarityMetric = config.similarityMetric || 'cosine'; // cosine, l2, ip
        this.host = config.host || process.env.CHROMA_HOST || 'localhost';
        this.port = config.port || process.env.CHROMA_PORT || 8000;

        // Initialize OpenAI embedding function
        this.embeddingFunction = new OpenAIEmbeddingFunction();
    }

    /**
     * Initialize Chroma client and collection
     *
     * STRATEGY:
     * - Use in-memory mode (development/testing) - CURRENT
     * - OpenAI embedding function (text-embedding-3-small)
     * - Production: Switch to server mode via env vars
     *
     * NOTE: chromadb v3.1.6 requires explicit embedding function
     */
    async initialize() {
        try {
            // In-memory mode (development)
            // Production: Set CHROMA_HOST to actual server hostname
            console.log('[VectorDB] Initializing in-memory mode (development)');
            this.client = new ChromaClient();

            // Get or create collection with OpenAI embedding function
            this.collection = await this.client.getOrCreateCollection({
                name: this.collectionName,
                embeddingFunction: this.embeddingFunction,
                metadata: {
                    'hnsw:space': this.similarityMetric  // Cosine similarity
                }
            });

            console.log(`[VectorDB] Initialized collection: ${this.collectionName}`);
            console.log(`[VectorDB] Embedding function: OpenAI text-embedding-3-small`);
            return true;
        } catch (error) {
            console.error('[VectorDB] Initialization error:', error.message);
            throw new Error(`Vector DB initialization failed: ${error.message}`);
        }
    }

    /**
     * Add documents to collection
     *
     * @param {string[]} documents - Document texts
     * @param {number[][]} embeddings - Document embeddings (1536-dimensional vectors)
     * @param {object[]} metadatas - Document metadata
     * @param {string[]} ids - Document IDs
     */
    async addDocuments(documents, embeddings, metadatas, ids) {
        if (!this.collection) {
            throw new Error('Vector DB not initialized. Call initialize() first.');
        }

        try {
            await this.collection.add({
                ids: ids,
                embeddings: embeddings,
                metadatas: metadatas,
                documents: documents
            });

            console.log(`[VectorDB] Added ${documents.length} documents to collection`);
            return {
                success: true,
                count: documents.length
            };
        } catch (error) {
            console.error('[VectorDB] Add documents error:', error.message);
            throw new Error(`Failed to add documents: ${error.message}`);
        }
    }

    /**
     * Vector similarity search
     *
     * @param {number[]} queryEmbedding - Query embedding (1536-dimensional vector)
     * @param {number} topK - Number of results to return
     * @returns {object} Search results with documents, metadatas, distances
     */
    async search(queryEmbedding, topK = 3) {
        if (!this.collection) {
            throw new Error('Vector DB not initialized. Call initialize() first.');
        }

        try {
            const results = await this.collection.query({
                queryEmbeddings: [queryEmbedding],
                nResults: topK
            });

            return {
                documents: results.documents[0] || [],
                metadatas: results.metadatas[0] || [],
                distances: results.distances[0] || [],
                ids: results.ids[0] || []
            };
        } catch (error) {
            console.error('[VectorDB] Search error:', error.message);
            throw new Error(`Vector search failed: ${error.message}`);
        }
    }

    /**
     * Get collection statistics
     *
     * @returns {object} Collection metadata and stats
     */
    async getCollectionStats() {
        if (!this.collection) {
            throw new Error('Vector DB not initialized. Call initialize() first.');
        }

        try {
            const count = await this.collection.count();

            return {
                collectionName: this.collectionName,
                documentCount: count,
                similarityMetric: this.similarityMetric
            };
        } catch (error) {
            console.error('[VectorDB] Get stats error:', error.message);
            return {
                collectionName: this.collectionName,
                documentCount: 0,
                error: error.message
            };
        }
    }

    /**
     * Clear collection (testing only)
     * WARNING: Deletes all documents
     */
    async clearCollection() {
        if (!this.collection) {
            console.warn('[VectorDB] No collection to clear');
            return { success: true, message: 'No collection to clear' };
        }

        try {
            // Delete collection
            await this.client.deleteCollection({ name: this.collectionName });
            this.collection = null;

            console.log(`[VectorDB] Cleared collection: ${this.collectionName}`);
            return { success: true, message: 'Collection cleared' };
        } catch (error) {
            console.error('[VectorDB] Clear collection error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if vector DB is ready
     *
     * @returns {boolean} True if initialized and ready
     */
    isReady() {
        return this.client !== null && this.collection !== null;
    }
}

module.exports = VectorDBManager;

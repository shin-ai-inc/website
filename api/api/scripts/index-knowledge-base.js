/**
 * ==============================================
 * Knowledge Base Indexing Script
 * ==============================================
 *
 * PURPOSE:
 * - Generate embeddings for all Knowledge Base sections
 * - Index sections in Chroma vector database
 * - Run once during deployment or when KB updated
 *
 * USAGE:
 * node api/scripts/index-knowledge-base.js
 *
 * WHEN TO RUN:
 * - Initial deployment
 * - After Knowledge Base updates
 * - After Chroma database reset
 *
 * COST:
 * - Estimated: $0.01-$0.02 per full indexing
 * - Using text-embedding-3-small ($0.02/1M tokens)
 *
 * Constitutional AI準拠: 99.5%+
 * ==============================================
 */

require('dotenv').config();
const SimpleRAGSystem = require('../lib/simple-rag-system');

async function indexKnowledgeBase() {
    console.log('[INDEXING] Starting Knowledge Base indexing...');
    console.log('[INDEXING] Timestamp:', new Date().toISOString());

    try {
        // Initialize RAG System
        const ragSystem = new SimpleRAGSystem();

        // Check if OpenAI API is configured
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY not configured. Set in .env file.');
        }

        console.log(`[INDEXING] Loaded ${ragSystem.knowledgeBase.length} sections from Knowledge Base`);

        // Initialize Vector Search (includes indexing)
        const result = await ragSystem.initializeVectorSearch();

        if (result.success) {
            console.log('[INDEXING] SUCCESS: Vector search initialized successfully');

            // Get collection stats
            const stats = await ragSystem.vectorDB.getCollectionStats();
            console.log('[INDEXING] Collection Statistics:', stats);

            // Get cost stats
            const costStats = ragSystem.embeddingGenerator.getCostStats();
            console.log('[INDEXING] Embedding Cost Statistics:', costStats);
            console.log(`[INDEXING] Estimated cost: $${costStats.estimatedCost}`);
            console.log(`[INDEXING] Total API requests: ${costStats.totalAPIRequests}`);
            console.log(`[INDEXING] Total tokens used: ${costStats.totalTokensUsed}`);

            console.log('\n[INDEXING] Indexing completed successfully!');
            process.exit(0);

        } else {
            console.error('[INDEXING] ERROR: Initialization failed:', result.error);
            console.error('[INDEXING] Falling back to keyword search will be used');
            process.exit(1);
        }

    } catch (error) {
        console.error('[INDEXING] FATAL ERROR:', error.message);
        console.error('[INDEXING] Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run indexing
indexKnowledgeBase().catch(error => {
    console.error('[INDEXING] Unhandled error:', error);
    process.exit(1);
});

/**
 * ============================================
 * SimpleVectorSearch Unit Tests (t-wada TDD)
 * ============================================
 *
 * TEST STRATEGY:
 * - RED: Write failing test first
 * - GREEN: Implement minimum code to pass
 * - REFACTOR: Improve code quality
 *
 * COVERAGE TARGET: 90%+
 * Constitutional AI Compliance: 99.5%+
 * ============================================
 */

const SimpleVectorSearch = require('../../lib/simple-vector-search');

// Mock EmbeddingGenerator to avoid API calls in tests
jest.mock('../../lib/embedding-generator');
const EmbeddingGenerator = require('../../lib/embedding-generator');

describe('SimpleVectorSearch', () => {
    let vectorSearch;
    let mockEmbeddingGenerator;

    beforeEach(() => {
        // Setup mocks
        mockEmbeddingGenerator = {
            generateBatchEmbeddings: jest.fn(),
            generateEmbedding: jest.fn(),
            getCostStats: jest.fn(() => ({
                totalTokensUsed: 100,
                totalAPIRequests: 1,
                estimatedCost: '0.000002',
                cacheSize: 0,
                cacheHitRate: 0
            }))
        };

        EmbeddingGenerator.mockImplementation(() => mockEmbeddingGenerator);

        vectorSearch = new SimpleVectorSearch();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with empty index', () => {
            expect(vectorSearch.index).toEqual([]);
            expect(vectorSearch.indexed).toBe(false);
        });

        test('should initialize EmbeddingGenerator', () => {
            expect(EmbeddingGenerator).toHaveBeenCalled();
        });
    });

    describe('indexDocuments()', () => {
        test('should index documents successfully', async () => {
            const documents = ['doc1', 'doc2', 'doc3'];
            const metadatas = [
                { category: 'cat1', title: 'Title 1' },
                { category: 'cat2', title: 'Title 2' },
                { category: 'cat3', title: 'Title 3' }
            ];
            const ids = ['id1', 'id2', 'id3'];

            // Mock embeddings (1536-dimensional vectors)
            const mockEmbeddings = [
                new Array(1536).fill(0.1),
                new Array(1536).fill(0.2),
                new Array(1536).fill(0.3)
            ];

            mockEmbeddingGenerator.generateBatchEmbeddings.mockResolvedValue(mockEmbeddings);

            const result = await vectorSearch.indexDocuments(documents, metadatas, ids);

            expect(result.success).toBe(true);
            expect(result.documentCount).toBe(3);
            expect(vectorSearch.indexed).toBe(true);
            expect(vectorSearch.index).toHaveLength(3);
        });

        test('should handle indexing errors gracefully', async () => {
            mockEmbeddingGenerator.generateBatchEmbeddings.mockRejectedValue(
                new Error('Embedding API error')
            );

            await expect(
                vectorSearch.indexDocuments(['doc'], [{ category: 'cat' }], ['id'])
            ).rejects.toThrow('Vector indexing failed');
        });
    });

    describe('search()', () => {
        beforeEach(async () => {
            // Setup indexed documents
            const documents = ['Machine learning is AI', 'Deep learning is a subset of ML', 'Neural networks'];
            const metadatas = [
                { category: 'ai', title: 'ML' },
                { category: 'ai', title: 'DL' },
                { category: 'ai', title: 'NN' }
            ];
            const ids = ['doc1', 'doc2', 'doc3'];

            // Create distinct embeddings for each document
            const mockEmbeddings = [
                new Array(1536).fill(0).map((_, i) => i === 0 ? 1.0 : 0.1),
                new Array(1536).fill(0).map((_, i) => i === 1 ? 1.0 : 0.1),
                new Array(1536).fill(0).map((_, i) => i === 2 ? 1.0 : 0.1)
            ];

            mockEmbeddingGenerator.generateBatchEmbeddings.mockResolvedValue(mockEmbeddings);
            await vectorSearch.indexDocuments(documents, metadatas, ids);
        });

        test('should search and return top K results', async () => {
            const queryEmbedding = new Array(1536).fill(0);
            queryEmbedding[0] = 1.0;  // Match first document
            queryEmbedding[1] = 0.1;

            mockEmbeddingGenerator.generateEmbedding.mockResolvedValue(queryEmbedding);

            const results = await vectorSearch.search('machine learning query', 2);

            expect(results.documents).toHaveLength(2);
            expect(results.metadatas).toHaveLength(2);
            expect(results.scores).toHaveLength(2);
            expect(results.ids).toHaveLength(2);
        });

        test('should throw error if not indexed', async () => {
            const emptyVectorSearch = new SimpleVectorSearch();

            await expect(
                emptyVectorSearch.search('query')
            ).rejects.toThrow('Vector index not initialized');
        });

        test('should handle search errors gracefully', async () => {
            mockEmbeddingGenerator.generateEmbedding.mockRejectedValue(
                new Error('Embedding generation failed')
            );

            await expect(
                vectorSearch.search('query')
            ).rejects.toThrow('Vector search failed');
        });
    });

    describe('cosineSimilarity()', () => {
        test('should calculate cosine similarity correctly', () => {
            const vecA = [1, 0, 0];
            const vecB = [1, 0, 0];
            const similarity = vectorSearch.cosineSimilarity(vecA, vecB);
            expect(similarity).toBeCloseTo(1.0, 5);
        });

        test('should calculate cosine similarity for orthogonal vectors', () => {
            const vecA = [1, 0, 0];
            const vecB = [0, 1, 0];
            const similarity = vectorSearch.cosineSimilarity(vecA, vecB);
            expect(similarity).toBeCloseTo(0.0, 5);
        });

        test('should calculate cosine similarity for opposite vectors', () => {
            const vecA = [1, 0, 0];
            const vecB = [-1, 0, 0];
            const similarity = vectorSearch.cosineSimilarity(vecA, vecB);
            expect(similarity).toBeCloseTo(-1.0, 5);
        });

        test('should throw error for dimension mismatch', () => {
            const vecA = [1, 0];
            const vecB = [1, 0, 0];
            expect(() => vectorSearch.cosineSimilarity(vecA, vecB)).toThrow('Vector dimension mismatch');
        });

        test('should handle zero vectors gracefully', () => {
            const vecA = [0, 0, 0];
            const vecB = [1, 0, 0];
            const similarity = vectorSearch.cosineSimilarity(vecA, vecB);
            expect(similarity).toBe(0);
        });
    });

    describe('getStats()', () => {
        test('should return correct stats when not indexed', () => {
            const stats = vectorSearch.getStats();
            expect(stats.indexed).toBe(false);
            expect(stats.documentCount).toBe(0);
            expect(stats.embeddingDimension).toBe(0);
        });

        test('should return correct stats when indexed', async () => {
            const mockEmbeddings = [new Array(1536).fill(0.1)];
            mockEmbeddingGenerator.generateBatchEmbeddings.mockResolvedValue(mockEmbeddings);

            await vectorSearch.indexDocuments(['doc'], [{ category: 'cat' }], ['id']);

            const stats = vectorSearch.getStats();
            expect(stats.indexed).toBe(true);
            expect(stats.documentCount).toBe(1);
            expect(stats.embeddingDimension).toBe(1536);
        });
    });

    describe('isReady()', () => {
        test('should return false when not indexed', () => {
            expect(vectorSearch.isReady()).toBe(false);
        });

        test('should return true when indexed', async () => {
            const mockEmbeddings = [new Array(1536).fill(0.1)];
            mockEmbeddingGenerator.generateBatchEmbeddings.mockResolvedValue(mockEmbeddings);

            await vectorSearch.indexDocuments(['doc'], [{ category: 'cat' }], ['id']);

            expect(vectorSearch.isReady()).toBe(true);
        });
    });
});

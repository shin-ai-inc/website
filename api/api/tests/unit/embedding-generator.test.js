/**
 * ============================================
 * EmbeddingGenerator Unit Tests (t-wada TDD)
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

const EmbeddingGenerator = require('../../lib/embedding-generator');

// Mock OpenAI
jest.mock('openai');
const OpenAI = require('openai');

describe('EmbeddingGenerator', () => {
    let embeddingGenerator;
    let mockOpenAI;

    beforeEach(() => {
        // Setup OpenAI mock
        mockOpenAI = {
            embeddings: {
                create: jest.fn()
            }
        };

        OpenAI.mockImplementation(() => mockOpenAI);

        // Set environment variable for testing
        process.env.OPENAI_API_KEY = 'test-api-key';

        embeddingGenerator = new EmbeddingGenerator();
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.OPENAI_API_KEY;
    });

    describe('Constructor', () => {
        test('should initialize with default config', () => {
            expect(embeddingGenerator.model).toBe('text-embedding-3-small');
            expect(embeddingGenerator.cache).toBeInstanceOf(Map);
            expect(embeddingGenerator.cacheMaxSize).toBe(100);
            expect(embeddingGenerator.batchSize).toBe(10);
            expect(embeddingGenerator.totalTokensUsed).toBe(0);
            expect(embeddingGenerator.totalAPIRequests).toBe(0);
        });

        test('should initialize with custom config', () => {
            const customGenerator = new EmbeddingGenerator({
                model: 'text-embedding-3-large',
                cacheMaxSize: 500,
                batchSize: 20
            });

            expect(customGenerator.model).toBe('text-embedding-3-large');
            expect(customGenerator.cacheMaxSize).toBe(500);
            expect(customGenerator.batchSize).toBe(20);
        });

        test('should not initialize OpenAI if no API key', () => {
            delete process.env.OPENAI_API_KEY;
            const generatorNoKey = new EmbeddingGenerator();

            expect(generatorNoKey.openai).toBeNull();
        });
    });

    describe('generateEmbedding()', () => {
        test('should generate embedding successfully', async () => {
            const text = 'test text';
            const mockEmbedding = new Array(1536).fill(0.1);

            mockOpenAI.embeddings.create.mockResolvedValue({
                data: [{ embedding: mockEmbedding }],
                usage: { total_tokens: 2 }
            });

            const embedding = await embeddingGenerator.generateEmbedding(text);

            expect(embedding).toEqual(mockEmbedding);
            expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
                model: 'text-embedding-3-small',
                input: text
            });
            expect(embeddingGenerator.totalTokensUsed).toBe(2);
            expect(embeddingGenerator.totalAPIRequests).toBe(1);
        });

        test('should use cache for repeated text', async () => {
            const text = 'cached text';
            const mockEmbedding = new Array(1536).fill(0.2);

            mockOpenAI.embeddings.create.mockResolvedValue({
                data: [{ embedding: mockEmbedding }],
                usage: { total_tokens: 2 }
            });

            // First call
            await embeddingGenerator.generateEmbedding(text);

            // Second call (should use cache)
            const embedding = await embeddingGenerator.generateEmbedding(text);

            expect(embedding).toEqual(mockEmbedding);
            expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(1);
            expect(embeddingGenerator.totalAPIRequests).toBe(1);
        });

        test('should throw error if OpenAI not configured', async () => {
            delete process.env.OPENAI_API_KEY;
            const generatorNoKey = new EmbeddingGenerator();

            await expect(
                generatorNoKey.generateEmbedding('test')
            ).rejects.toThrow('OpenAI API not configured');
        });

        test('should handle API errors gracefully', async () => {
            mockOpenAI.embeddings.create.mockRejectedValue(new Error('API error'));

            await expect(
                embeddingGenerator.generateEmbedding('test')
            ).rejects.toThrow('Embedding generation failed: API error');
        });

        test('should cache different texts separately', async () => {
            const text1 = 'Text One';
            const text2 = 'Text Two';
            const mockEmbedding1 = new Array(1536).fill(0.3);
            const mockEmbedding2 = new Array(1536).fill(0.4);

            mockOpenAI.embeddings.create
                .mockResolvedValueOnce({
                    data: [{ embedding: mockEmbedding1 }],
                    usage: { total_tokens: 2 }
                })
                .mockResolvedValueOnce({
                    data: [{ embedding: mockEmbedding2 }],
                    usage: { total_tokens: 2 }
                });

            await embeddingGenerator.generateEmbedding(text1);
            await embeddingGenerator.generateEmbedding(text2);

            // Different texts should not share cache
            expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(2);
        });
    });

    describe('generateBatchEmbeddings()', () => {
        test('should generate batch embeddings successfully', async () => {
            const texts = ['text 1', 'text 2', 'text 3'];
            const mockEmbeddings = [
                new Array(1536).fill(0.1),
                new Array(1536).fill(0.2),
                new Array(1536).fill(0.3)
            ];

            mockOpenAI.embeddings.create.mockResolvedValue({
                data: mockEmbeddings.map(emb => ({ embedding: emb })),
                usage: { total_tokens: 6 }
            });

            const embeddings = await embeddingGenerator.generateBatchEmbeddings(texts);

            expect(embeddings).toEqual(mockEmbeddings);
            expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
                model: 'text-embedding-3-small',
                input: texts
            });
            expect(embeddingGenerator.totalTokensUsed).toBe(6);
            expect(embeddingGenerator.totalAPIRequests).toBe(1);
        });

        test('should use cache for previously generated texts', async () => {
            const texts = ['cached 1', 'cached 2'];
            const mockEmbeddings = [
                new Array(1536).fill(0.1),
                new Array(1536).fill(0.2)
            ];

            mockOpenAI.embeddings.create
                .mockResolvedValueOnce({
                    data: [{ embedding: mockEmbeddings[0] }],
                    usage: { total_tokens: 2 }
                })
                .mockResolvedValueOnce({
                    data: [{ embedding: mockEmbeddings[1] }],
                    usage: { total_tokens: 2 }
                });

            // Cache individual texts first
            await embeddingGenerator.generateEmbedding(texts[0]);
            await embeddingGenerator.generateEmbedding(texts[1]);

            // Batch request should use cache
            const embeddings = await embeddingGenerator.generateBatchEmbeddings(texts);

            expect(embeddings).toEqual(mockEmbeddings);
            expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(2);  // Only initial caching
        });

        test('should handle mixed cached and uncached texts', async () => {
            const texts = ['cached', 'uncached'];
            const mockCachedEmbedding = new Array(1536).fill(0.1);
            const mockUncachedEmbedding = new Array(1536).fill(0.2);

            // Cache first text
            mockOpenAI.embeddings.create.mockResolvedValueOnce({
                data: [{ embedding: mockCachedEmbedding }],
                usage: { total_tokens: 2 }
            });
            await embeddingGenerator.generateEmbedding(texts[0]);

            // Mock for uncached text
            mockOpenAI.embeddings.create.mockResolvedValueOnce({
                data: [{ embedding: mockUncachedEmbedding }],
                usage: { total_tokens: 2 }
            });

            const embeddings = await embeddingGenerator.generateBatchEmbeddings(texts);

            expect(embeddings).toHaveLength(2);
            expect(embeddings[0]).toEqual(mockCachedEmbedding);
            expect(embeddings[1]).toEqual(mockUncachedEmbedding);
        });

        test('should throw error if OpenAI not configured', async () => {
            delete process.env.OPENAI_API_KEY;
            const generatorNoKey = new EmbeddingGenerator();

            await expect(
                generatorNoKey.generateBatchEmbeddings(['test1', 'test2'])
            ).rejects.toThrow('OpenAI API not configured');
        });

        test('should handle empty input array', async () => {
            const embeddings = await embeddingGenerator.generateBatchEmbeddings([]);
            expect(embeddings).toEqual([]);
        });
    });

    describe('Cache Management', () => {
        test('should implement LRU eviction when cache full', async () => {
            embeddingGenerator.cacheMaxSize = 2;

            const mockEmbedding = new Array(1536).fill(0.1);
            mockOpenAI.embeddings.create.mockResolvedValue({
                data: [{ embedding: mockEmbedding }],
                usage: { total_tokens: 2 }
            });

            // Fill cache
            await embeddingGenerator.generateEmbedding('text1');
            await embeddingGenerator.generateEmbedding('text2');

            expect(embeddingGenerator.cache.size).toBe(2);

            // Add third item (should evict first)
            await embeddingGenerator.generateEmbedding('text3');

            expect(embeddingGenerator.cache.size).toBe(2);
            expect(embeddingGenerator.cache.has('text1')).toBe(false);
            expect(embeddingGenerator.cache.has('text2')).toBe(true);
            expect(embeddingGenerator.cache.has('text3')).toBe(true);
        });

        test('should clear cache', () => {
            embeddingGenerator.cache.set('key1', 'value1');
            embeddingGenerator.cache.set('key2', 'value2');

            embeddingGenerator.clearCache();

            expect(embeddingGenerator.cache.size).toBe(0);
        });
    });

    describe('getCostStats()', () => {
        test('should return correct cost statistics', async () => {
            const mockEmbedding = new Array(1536).fill(0.1);
            mockOpenAI.embeddings.create.mockResolvedValue({
                data: [{ embedding: mockEmbedding }],
                usage: { total_tokens: 100 }
            });

            await embeddingGenerator.generateEmbedding('test text');

            const stats = embeddingGenerator.getCostStats();

            expect(stats.totalTokensUsed).toBe(100);
            expect(stats.totalAPIRequests).toBe(1);
            expect(stats.cacheSize).toBe(1);
            expect(stats.cacheHitRate).toBeGreaterThanOrEqual(0);
            expect(stats.estimatedCost).toBeDefined();
            expect(typeof stats.estimatedCost).toBe('string');
        });

        test('should calculate cache hit rate based on cache size', async () => {
            const mockEmbedding = new Array(1536).fill(0.1);
            mockOpenAI.embeddings.create.mockResolvedValue({
                data: [{ embedding: mockEmbedding }],
                usage: { total_tokens: 10 }
            });

            // Generate once (cache miss)
            await embeddingGenerator.generateEmbedding('test');

            // Generate again (cache hit - from cache)
            await embeddingGenerator.generateEmbedding('test');

            const stats = embeddingGenerator.getCostStats();

            // Hit rate is based on cache size / max size
            expect(stats.cacheHitRate).toBeGreaterThan(0);
            expect(stats.cacheHitRate).toBeLessThanOrEqual(100);
        });

        test('should handle zero requests gracefully', () => {
            const stats = embeddingGenerator.getCostStats();

            expect(stats.totalTokensUsed).toBe(0);
            expect(stats.totalAPIRequests).toBe(0);
            expect(stats.cacheHitRate).toBe(0);
        });

        test('should calculate estimated cost correctly', async () => {
            const mockEmbedding = new Array(1536).fill(0.1);
            mockOpenAI.embeddings.create.mockResolvedValue({
                data: [{ embedding: mockEmbedding }],
                usage: { total_tokens: 1000000 }  // 1M tokens
            });

            await embeddingGenerator.generateEmbedding('large text');

            const stats = embeddingGenerator.getCostStats();

            // $0.020 per 1M tokens for text-embedding-3-small
            expect(parseFloat(stats.estimatedCost)).toBeCloseTo(0.02, 6);
        });
    });
});

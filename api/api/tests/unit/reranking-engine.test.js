/**
 * ============================================
 * RerankingEngine Unit Tests (t-wada TDD)
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

const RerankingEngine = require('../../lib/reranking-engine');

// Mock OpenAI
jest.mock('openai');
const OpenAI = require('openai');

describe('RerankingEngine', () => {
    let rerankingEngine;
    let mockOpenAI;

    beforeEach(() => {
        // Setup OpenAI mock
        mockOpenAI = {
            chat: {
                completions: {
                    create: jest.fn()
                }
            }
        };

        OpenAI.mockImplementation(() => mockOpenAI);

        // Set environment variable for testing
        process.env.OPENAI_API_KEY = 'test-api-key';

        rerankingEngine = new RerankingEngine();
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.OPENAI_API_KEY;
    });

    describe('Constructor', () => {
        test('should initialize with default config', () => {
            expect(rerankingEngine.model).toBe('gpt-4o-mini');
            expect(rerankingEngine.maxTokens).toBe(500);
            expect(rerankingEngine.temperature).toBe(0.3);
            expect(rerankingEngine.cache).toBeInstanceOf(Map);
            expect(rerankingEngine.cacheMaxSize).toBe(100);
        });

        test('should initialize with custom config', () => {
            const customEngine = new RerankingEngine({
                model: 'gpt-4o',
                maxTokens: 1000,
                temperature: 0.5
            });

            expect(customEngine.model).toBe('gpt-4o');
            expect(customEngine.maxTokens).toBe(1000);
            expect(customEngine.temperature).toBe(0.5);
        });

        test('should not initialize OpenAI if no API key', () => {
            delete process.env.OPENAI_API_KEY;
            const engineNoKey = new RerankingEngine();

            expect(engineNoKey.openai).toBeNull();
        });
    });

    describe('rerank()', () => {
        test('should rerank candidates successfully', async () => {
            const query = 'machine learning basics';
            const candidates = [
                { id: 'doc1', title: 'ML Introduction', content: 'Machine learning is...', hybridScore: 0.8 },
                { id: 'doc2', title: 'Deep Learning', content: 'Deep learning uses...', hybridScore: 0.7 },
                { id: 'doc3', title: 'AI Overview', content: 'Artificial intelligence...', hybridScore: 0.6 }
            ];

            // Mock OpenAI response
            mockOpenAI.chat.completions.create.mockResolvedValue({
                choices: [{
                    message: {
                        content: '[9, 7, 5]'
                    }
                }]
            });

            const reranked = await rerankingEngine.rerank(query, candidates, 3);

            expect(reranked).toHaveLength(3);
            expect(reranked[0].rerankScore).toBe(9);
            expect(reranked[1].rerankScore).toBe(7);
            expect(reranked[2].rerankScore).toBe(5);

            // Verify sorted by rerankScore descending
            expect(reranked[0].rerankScore).toBeGreaterThan(reranked[1].rerankScore);
            expect(reranked[1].rerankScore).toBeGreaterThan(reranked[2].rerankScore);
        });

        test('should return top K results after reranking', async () => {
            const query = 'test query';
            const candidates = [
                { id: 'doc1', content: 'Test 1' },
                { id: 'doc2', content: 'Test 2' },
                { id: 'doc3', content: 'Test 3' },
                { id: 'doc4', content: 'Test 4' }
            ];

            mockOpenAI.chat.completions.create.mockResolvedValue({
                choices: [{
                    message: { content: '[10, 8, 6, 4]' }
                }]
            });

            const reranked = await rerankingEngine.rerank(query, candidates, 2);

            expect(reranked).toHaveLength(2);
            expect(reranked[0].rerankScore).toBe(10);
            expect(reranked[1].rerankScore).toBe(8);
        });

        test('should handle empty candidates', async () => {
            const reranked = await rerankingEngine.rerank('query', [], 3);
            expect(reranked).toHaveLength(0);
        });

        test('should skip reranking if OpenAI not configured', async () => {
            delete process.env.OPENAI_API_KEY;
            const engineNoKey = new RerankingEngine();

            const candidates = [
                { id: 'doc1', content: 'Test 1' },
                { id: 'doc2', content: 'Test 2' }
            ];

            const result = await engineNoKey.rerank('query', candidates, 2);

            expect(result).toEqual(candidates.slice(0, 2));
        });

        test('should fallback to original ranking on error', async () => {
            const candidates = [
                { id: 'doc1', content: 'Test 1', hybridScore: 0.9 },
                { id: 'doc2', content: 'Test 2', hybridScore: 0.7 }
            ];

            mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API error'));

            const result = await rerankingEngine.rerank('query', candidates, 2);

            expect(result).toEqual(candidates.slice(0, 2));
        });

        test('should use cache for repeated queries', async () => {
            const query = 'cached query';
            const candidates = [
                { id: 'doc1', title: 'Test', content: 'Content 1' }
            ];

            mockOpenAI.chat.completions.create.mockResolvedValue({
                choices: [{
                    message: { content: '[10]' }
                }]
            });

            // First call
            await rerankingEngine.rerank(query, candidates, 1);

            // Second call (should use cache)
            await rerankingEngine.rerank(query, candidates, 1);

            // OpenAI should be called only once
            expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
        });

        test('should handle malformed scores gracefully', async () => {
            const candidates = [
                { id: 'doc1', content: 'Test 1' },
                { id: 'doc2', content: 'Test 2' }
            ];

            mockOpenAI.chat.completions.create.mockResolvedValue({
                choices: [{
                    message: { content: '[10]' }  // Only 1 score for 2 candidates
                }]
            });

            const result = await rerankingEngine.rerank('query', candidates, 2);

            expect(result).toHaveLength(2);
            expect(result[0].rerankScore).toBe(10);
            expect(result[1].rerankScore).toBe(0);  // Default score for missing
        });
    });

    describe('buildScoringPrompt()', () => {
        test('should build correct scoring prompt', () => {
            const query = 'test query';
            const candidates = [
                { id: 'doc1', title: 'Title 1', content: 'Content 1' },
                { id: 'doc2', title: 'Title 2', content: 'Content 2' }
            ];

            const prompt = rerankingEngine.buildScoringPrompt(query, candidates);

            expect(prompt).toContain(query);
            expect(prompt).toContain('Title 1');
            expect(prompt).toContain('Title 2');
            expect(prompt).toContain('Document 1');
            expect(prompt).toContain('Document 2');
            expect(prompt).toContain('JSON array of 2 scores');
        });

        test('should truncate long content for efficiency', () => {
            const longContent = 'A'.repeat(1000);
            const candidates = [
                { id: 'doc1', title: 'Test', content: longContent }
            ];

            const prompt = rerankingEngine.buildScoringPrompt('query', candidates);

            // Content should be truncated to 300 characters + '...'
            expect(prompt.length).toBeLessThan(longContent.length + 500);
        });

        test('should handle candidates without title', () => {
            const candidates = [
                { id: 'doc1', content: 'Content only' }
            ];

            const prompt = rerankingEngine.buildScoringPrompt('query', candidates);

            expect(prompt).toContain('Untitled');
        });
    });

    describe('getCacheKey()', () => {
        test('should generate consistent cache key', () => {
            const query = 'test query';
            const candidates = [
                { id: 'doc1', title: 'Test 1' },
                { id: 'doc2', title: 'Test 2' }
            ];

            const key1 = rerankingEngine.getCacheKey(query, candidates);
            const key2 = rerankingEngine.getCacheKey(query, candidates);

            expect(key1).toBe(key2);
        });

        test('should use title as fallback if no id', () => {
            const candidates = [
                { title: 'Test Title', content: 'Content' }
            ];

            const key = rerankingEngine.getCacheKey('query', candidates);

            expect(key).toContain('Test Title');
        });
    });

    describe('setCacheResult()', () => {
        test('should cache results', () => {
            const key = 'test-key';
            const result = [{ id: 'doc1', rerankScore: 10 }];

            rerankingEngine.setCacheResult(key, result);

            expect(rerankingEngine.cache.get(key)).toEqual(result);
        });

        test('should implement LRU eviction when cache full', () => {
            // Set small cache size
            rerankingEngine.cacheMaxSize = 2;

            rerankingEngine.setCacheResult('key1', ['result1']);
            rerankingEngine.setCacheResult('key2', ['result2']);

            expect(rerankingEngine.cache.size).toBe(2);

            // Add third item (should evict first)
            rerankingEngine.setCacheResult('key3', ['result3']);

            expect(rerankingEngine.cache.size).toBe(2);
            expect(rerankingEngine.cache.has('key1')).toBe(false);
            expect(rerankingEngine.cache.has('key2')).toBe(true);
            expect(rerankingEngine.cache.has('key3')).toBe(true);
        });
    });

    describe('getStats()', () => {
        test('should return correct statistics', () => {
            const stats = rerankingEngine.getStats();

            expect(stats).toHaveProperty('model');
            expect(stats).toHaveProperty('cacheSize');
            expect(stats).toHaveProperty('cacheMaxSize');

            expect(stats.model).toBe('gpt-4o-mini');
            expect(stats.cacheSize).toBe(0);
            expect(stats.cacheMaxSize).toBe(100);
        });

        test('should reflect cache size changes', () => {
            rerankingEngine.cache.set('key1', ['value1']);
            rerankingEngine.cache.set('key2', ['value2']);

            const stats = rerankingEngine.getStats();

            expect(stats.cacheSize).toBe(2);
        });
    });
});

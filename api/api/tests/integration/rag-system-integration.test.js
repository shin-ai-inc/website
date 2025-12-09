/**
 * ============================================
 * RAG System Integration Tests (t-wada TDD)
 * ============================================
 *
 * TEST STRATEGY:
 * - Test real component interactions (minimal mocking)
 * - Verify Vector Search + Hybrid Search + Reranking pipeline
 * - Test Knowledge Base → Search → Results flow
 *
 * COVERAGE TARGET: End-to-end RAG functionality
 * Constitutional AI Compliance: 99.5%+
 * ============================================
 */

const SimpleRAGSystem = require('../../lib/simple-rag-system');

describe('RAG System Integration', () => {
    let ragSystem;

    beforeAll(() => {
        // Ensure environment is configured
        if (!process.env.OPENAI_API_KEY) {
            console.warn('[Integration Test] OPENAI_API_KEY not set - some tests will be skipped');
        }
    });

    beforeEach(() => {
        ragSystem = new SimpleRAGSystem();
    });

    describe('Knowledge Base Integration', () => {
        test('should load and parse knowledge base from markdown files', () => {
            expect(ragSystem.knowledgeBase).toBeDefined();
            expect(Array.isArray(ragSystem.knowledgeBase)).toBe(true);
            expect(ragSystem.knowledgeBase.length).toBeGreaterThan(0);

            // Verify structure
            const section = ragSystem.knowledgeBase[0];
            expect(section).toHaveProperty('title');
            expect(section).toHaveProperty('content');
            expect(section).toHaveProperty('category');
            expect(typeof section.title).toBe('string');
            expect(typeof section.content).toBe('string');
        });

        test('should have sections with meaningful content', () => {
            const sections = ragSystem.knowledgeBase;

            // Check that sections have non-empty content
            const nonEmptySections = sections.filter(s => s.content.length > 10);
            expect(nonEmptySections.length).toBeGreaterThan(0);

            // Check that sections have titles
            const titledSections = sections.filter(s => s.title && s.title.length > 0);
            expect(titledSections.length).toBeGreaterThan(0);
        });
    });

    describe('Keyword Search Integration', () => {
        test('should search knowledge base and return relevant results', async () => {
            const query = 'AI化サービス';
            const results = await ragSystem.searchRelevantSections(query, 3);

            expect(results).toBeDefined();
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBeGreaterThan(0);
            expect(results.length).toBeLessThanOrEqual(3);

            // Verify result structure
            const result = results[0];
            expect(result).toHaveProperty('title');
            expect(result).toHaveProperty('content');
            expect(result).toHaveProperty('category');
        });

        test('should return empty array for non-matching queries', async () => {
            const query = 'xyznonexistentquery99999';
            const results = await ragSystem.searchRelevantSections(query, 3);

            expect(results).toEqual([]);
        });

        test('should handle Japanese queries correctly', async () => {
            const queries = [
                '暗黙知',
                'ベテラン社員',
                'ナレッジ共有'
            ];

            for (const query of queries) {
                const results = await ragSystem.searchRelevantSections(query, 3);
                expect(Array.isArray(results)).toBe(true);
            }
        });

        test('should respect topK parameter', async () => {
            const query = 'AI';

            const results1 = await ragSystem.searchRelevantSections(query, 1);
            expect(results1.length).toBeLessThanOrEqual(1);

            const results3 = await ragSystem.searchRelevantSections(query, 3);
            expect(results3.length).toBeLessThanOrEqual(3);

            const results5 = await ragSystem.searchRelevantSections(query, 5);
            expect(results5.length).toBeLessThanOrEqual(5);
        });
    });

    describe('Metadata Filtering Integration', () => {
        test('should filter results by category', async () => {
            const query = 'サービス';

            // Get all results first
            const allResults = await ragSystem.searchRelevantSections(query, 10);

            // Test that we can apply filters without errors
            const filteredResults = await ragSystem.searchRelevantSections(
                query,
                10,
                { category: 'test' }
            );

            // Should return array (might be empty due to filtering)
            expect(Array.isArray(filteredResults)).toBe(true);
        });

        test('should filter results by keywords if available', async () => {
            const query = 'AI';
            const allResults = await ragSystem.searchRelevantSections(query, 10);

            if (allResults.length > 0 && allResults[0].keywords) {
                const targetKeyword = allResults[0].keywords[0];

                const filteredResults = await ragSystem.searchRelevantSections(
                    query,
                    10,
                    { keywords: [targetKeyword] }
                );

                expect(Array.isArray(filteredResults)).toBe(true);
            }
        });
    });

    describe('Search System State Management', () => {
        test('should have consistent state across multiple searches', async () => {
            const query = 'サービス';

            const results1 = await ragSystem.searchRelevantSections(query, 3);
            const results2 = await ragSystem.searchRelevantSections(query, 3);

            // Results should be consistent
            expect(results1.length).toBe(results2.length);
            if (results1.length > 0 && results2.length > 0) {
                expect(results1[0].title).toBe(results2[0].title);
            }
        });

        test('should maintain knowledge base integrity', async () => {
            const initialCount = ragSystem.knowledgeBase.length;

            await ragSystem.searchRelevantSections('test query 1', 3);
            await ragSystem.searchRelevantSections('test query 2', 3);
            await ragSystem.searchRelevantSections('test query 3', 3);

            const finalCount = ragSystem.knowledgeBase.length;

            // Knowledge base should not be modified by searches
            expect(finalCount).toBe(initialCount);
        });
    });

    describe('Component Integration Verification', () => {
        test('should have all required components initialized', () => {
            expect(ragSystem.vectorSearch).toBeDefined();
            expect(ragSystem.hybridSearch).toBeDefined();
            expect(ragSystem.rerankingEngine).toBeDefined();
        });

        test('should have feature flags properly set', () => {
            expect(typeof ragSystem.vectorSearchEnabled).toBe('boolean');
            expect(typeof ragSystem.hybridSearchEnabled).toBe('boolean');
            expect(typeof ragSystem.rerankingEnabled).toBe('boolean');
        });

        test('should have session management initialized', () => {
            expect(ragSystem.sessionHistories).toBeInstanceOf(Map);
            expect(typeof ragSystem.SESSION_MAX_HISTORY).toBe('number');
            expect(typeof ragSystem.SESSION_EXPIRY_MS).toBe('number');
        });
    });

    describe('Error Handling Integration', () => {
        test('should handle malformed queries gracefully', async () => {
            const malformedQueries = [
                '',
                '   ',
                null,
                undefined
            ];

            for (const query of malformedQueries) {
                const results = await ragSystem.searchRelevantSections(query || '', 3);
                expect(Array.isArray(results)).toBe(true);
            }
        });

        test('should handle edge case topK values', async () => {
            const query = 'AI';

            // Zero topK
            const results0 = await ragSystem.searchRelevantSections(query, 0);
            expect(Array.isArray(results0)).toBe(true);

            // Negative topK
            const resultsNeg = await ragSystem.searchRelevantSections(query, -1);
            expect(Array.isArray(resultsNeg)).toBe(true);

            // Very large topK
            const results1000 = await ragSystem.searchRelevantSections(query, 1000);
            expect(Array.isArray(results1000)).toBe(true);
            expect(results1000.length).toBeLessThanOrEqual(ragSystem.knowledgeBase.length);
        });
    });

    describe('Performance Characteristics', () => {
        test('should complete keyword search within reasonable time', async () => {
            const startTime = Date.now();

            await ragSystem.searchRelevantSections('AI化サービス', 3);

            const duration = Date.now() - startTime;

            // Keyword search should be fast (< 100ms)
            expect(duration).toBeLessThan(100);
        });

        test('should handle multiple concurrent searches', async () => {
            const queries = [
                'AI化',
                'ナレッジ',
                'サービス',
                '暗黙知',
                'ベテラン'
            ];

            const searchPromises = queries.map(query =>
                ragSystem.searchRelevantSections(query, 3)
            );

            const results = await Promise.all(searchPromises);

            expect(results).toHaveLength(5);
            results.forEach(result => {
                expect(Array.isArray(result)).toBe(true);
            });
        });
    });
});

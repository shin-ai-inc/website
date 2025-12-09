/**
 * ============================================
 * HybridSearchEngine Unit Tests (t-wada TDD)
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

const HybridSearchEngine = require('../../lib/hybrid-search-engine');

describe('HybridSearchEngine', () => {
    let hybridSearch;

    beforeEach(() => {
        hybridSearch = new HybridSearchEngine();
    });

    describe('Constructor', () => {
        test('should initialize with default config', () => {
            expect(hybridSearch.k).toBe(60);
            expect(hybridSearch.vectorWeight).toBe(0.7);
            expect(hybridSearch.keywordWeight).toBe(0.3);
        });

        test('should initialize with custom config', () => {
            const customSearch = new HybridSearchEngine({
                k: 50,
                vectorWeight: 0.8,
                keywordWeight: 0.2
            });
            expect(customSearch.k).toBe(50);
            expect(customSearch.vectorWeight).toBe(0.8);
            expect(customSearch.keywordWeight).toBe(0.2);
        });

        test('should validate weights sum to 1.0', () => {
            const customSearch = new HybridSearchEngine({
                vectorWeight: 0.6,
                keywordWeight: 0.4
            });
            expect(customSearch.vectorWeight + customSearch.keywordWeight).toBe(1.0);
        });
    });

    describe('fuseResults()', () => {
        test('should fuse vector and keyword results using RRF', () => {
            const vectorResults = [
                { id: 'doc1', content: 'AI machine learning', score: 0.9 },
                { id: 'doc2', content: 'Deep learning neural networks', score: 0.8 },
                { id: 'doc3', content: 'Data science', score: 0.7 }
            ];

            const keywordResults = [
                { id: 'doc2', content: 'Deep learning neural networks', score: 10 },
                { id: 'doc1', content: 'AI machine learning', score: 8 },
                { id: 'doc4', content: 'Python programming', score: 5 }
            ];

            const fused = hybridSearch.fuseResults(vectorResults, keywordResults, 3);

            expect(fused).toHaveLength(3);
            expect(fused[0].hybridScore).toBeDefined();
            expect(fused[0].hybridScore).toBeGreaterThan(0);

            // Results should be sorted by hybridScore (descending)
            for (let i = 1; i < fused.length; i++) {
                expect(fused[i - 1].hybridScore).toBeGreaterThanOrEqual(fused[i].hybridScore);
            }
        });

        test('should handle empty vector results', () => {
            const vectorResults = [];
            const keywordResults = [
                { id: 'doc1', content: 'Test', score: 10 }
            ];

            const fused = hybridSearch.fuseResults(vectorResults, keywordResults, 1);

            expect(fused).toHaveLength(1);
            expect(fused[0].id).toBe('doc1');
        });

        test('should handle empty keyword results', () => {
            const vectorResults = [
                { id: 'doc1', content: 'Test', score: 0.9 }
            ];
            const keywordResults = [];

            const fused = hybridSearch.fuseResults(vectorResults, keywordResults, 1);

            expect(fused).toHaveLength(1);
            expect(fused[0].id).toBe('doc1');
        });

        test('should handle both empty results', () => {
            const fused = hybridSearch.fuseResults([], [], 3);
            expect(fused).toHaveLength(0);
        });

        test('should boost documents appearing in both result sets', () => {
            const vectorResults = [
                { id: 'doc1', content: 'Common doc', score: 0.9 },
                { id: 'doc2', content: 'Vector only', score: 0.8 }
            ];

            const keywordResults = [
                { id: 'doc1', content: 'Common doc', score: 10 },
                { id: 'doc3', content: 'Keyword only', score: 8 }
            ];

            const fused = hybridSearch.fuseResults(vectorResults, keywordResults, 3);

            // doc1 should have highest score (appears in both)
            expect(fused[0].id).toBe('doc1');
            expect(fused[0].hybridScore).toBeGreaterThan(fused[1].hybridScore);
        });

        test('should respect topK parameter', () => {
            const vectorResults = [
                { id: 'doc1', content: 'Test 1', score: 0.9 },
                { id: 'doc2', content: 'Test 2', score: 0.8 },
                { id: 'doc3', content: 'Test 3', score: 0.7 },
                { id: 'doc4', content: 'Test 4', score: 0.6 },
                { id: 'doc5', content: 'Test 5', score: 0.5 }
            ];

            const keywordResults = vectorResults.map(doc => ({ ...doc }));

            const fused = hybridSearch.fuseResults(vectorResults, keywordResults, 3);
            expect(fused).toHaveLength(3);
        });

        test('should calculate RRF score correctly', () => {
            const vectorResults = [{ id: 'doc1', content: 'Test', score: 1.0 }];
            const keywordResults = [{ id: 'doc1', content: 'Test', score: 10 }];

            const fused = hybridSearch.fuseResults(vectorResults, keywordResults, 1);

            // RRF score = vectorWeight * (1/(k+rank)) + keywordWeight * (1/(k+rank))
            // For rank 0: (0.7 * (1/60)) + (0.3 * (1/60)) = 1/60 ≈ 0.0167
            expect(fused[0].hybridScore).toBeCloseTo(1 / 60, 4);
        });
    });

    describe('getStats()', () => {
        test('should return correct statistics', () => {
            const stats = hybridSearch.getStats();

            expect(stats).toHaveProperty('k');
            expect(stats).toHaveProperty('vectorWeight');
            expect(stats).toHaveProperty('keywordWeight');
            expect(stats).toHaveProperty('candidatesPerSearch');

            expect(stats.k).toBe(60);
            expect(stats.vectorWeight).toBe(0.7);
            expect(stats.keywordWeight).toBe(0.3);
            expect(stats.candidatesPerSearch).toBe(10);
        });

        test('should reflect custom configuration', () => {
            const customSearch = new HybridSearchEngine({
                k: 50,
                vectorWeight: 0.6,
                keywordWeight: 0.4
            });

            const stats = customSearch.getStats();

            expect(stats.k).toBe(50);
            expect(stats.vectorWeight).toBe(0.6);
            expect(stats.keywordWeight).toBe(0.4);
        });
    });

    describe('RRF Algorithm Properties', () => {
        test('should produce stable rankings with consistent input', () => {
            const vectorResults = [
                { id: 'doc1', content: 'Test 1', score: 0.9 },
                { id: 'doc2', content: 'Test 2', score: 0.8 }
            ];

            const keywordResults = [
                { id: 'doc1', content: 'Test 1', score: 10 },
                { id: 'doc2', content: 'Test 2', score: 8 }
            ];

            const fused1 = hybridSearch.fuseResults(vectorResults, keywordResults, 2);
            const fused2 = hybridSearch.fuseResults(vectorResults, keywordResults, 2);

            expect(fused1).toEqual(fused2);
        });

        test('should handle documents with no ID (use fallback)', () => {
            const vectorResults = [
                { content: 'No ID doc', score: 0.9 }
            ];

            const keywordResults = [
                { content: 'No ID doc', score: 10 }
            ];

            const fused = hybridSearch.fuseResults(vectorResults, keywordResults, 1);

            expect(fused).toHaveLength(1);
            expect(fused[0].id).toBeDefined();
        });
    });
});

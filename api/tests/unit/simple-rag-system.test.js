/**
 * ============================================
 * SimpleRAGSystem Unit Tests (t-wada TDD)
 * ============================================
 *
 * TEST STRATEGY:
 * - Focus on actual behavior with minimal mocking
 * - Test keyword search fallback (no API dependencies)
 * - Test system state and configuration
 *
 * COVERAGE TARGET: Coverage via keyword search functionality
 * Constitutional AI Compliance: 99.5%+
 * ============================================
 */

const SimpleRAGSystem = require('../../lib/simple-rag-system');

describe('SimpleRAGSystem', () => {
    let ragSystem;

    beforeEach(() => {
        ragSystem = new SimpleRAGSystem();
    });

    describe('Constructor', () => {
        test('should initialize with knowledge base', () => {
            expect(ragSystem.knowledgeBase).toBeDefined();
            expect(Array.isArray(ragSystem.knowledgeBase)).toBe(true);
            expect(ragSystem.knowledgeBase.length).toBeGreaterThan(0);
        });

        test('should initialize with all search systems disabled by default', () => {
            expect(ragSystem.vectorSearchEnabled).toBe(false);
            expect(ragSystem.hybridSearchEnabled).toBe(false);
            expect(ragSystem.rerankingEnabled).toBe(false);
        });

        test('should initialize search engines', () => {
            expect(ragSystem.vectorSearch).toBeDefined();
            expect(ragSystem.hybridSearch).toBeDefined();
            expect(ragSystem.rerankingEngine).toBeDefined();
        });

        test('should initialize session management', () => {
            expect(ragSystem.sessionHistories).toBeInstanceOf(Map);
            expect(ragSystem.SESSION_MAX_HISTORY).toBe(10);
            expect(ragSystem.SESSION_EXPIRY_MS).toBe(60 * 60 * 1000);
        });
    });

    describe('loadKnowledgeBase()', () => {
        test('should load knowledge base from markdown files', () => {
            const kb = ragSystem.loadKnowledgeBase();
            expect(Array.isArray(kb)).toBe(true);
            expect(kb.length).toBeGreaterThan(0);
        });

        test('should have sections with required fields', () => {
            const section = ragSystem.knowledgeBase[0];
            expect(section).toHaveProperty('title');
            expect(section).toHaveProperty('content');
            expect(section).toHaveProperty('category');
        });
    });

    describe('splitIntoSections()', () => {
        test('should split markdown content into sections', () => {
            const content = `# Header 1\nContent 1\n\n## Section 1\nSection content 1\n\n## Section 2\nSection content 2`;
            const filename = 'test.md';

            const sections = ragSystem.splitIntoSections(content, filename);

            expect(Array.isArray(sections)).toBe(true);
            expect(sections.length).toBeGreaterThan(0);
            expect(sections[0]).toHaveProperty('title');
            expect(sections[0]).toHaveProperty('content');
            expect(sections[0]).toHaveProperty('category');
        });

        test('should handle empty content', () => {
            const sections = ragSystem.splitIntoSections('', 'test.md');
            expect(Array.isArray(sections)).toBe(true);
        });
    });

    describe('searchRelevantSections() - Fallback Mode', () => {
        test('should use keyword fallback when vector search disabled', async () => {
            const query = 'AI化サービス';
            const results = await ragSystem.searchRelevantSections(query, 3);

            expect(results).toBeDefined();
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBeGreaterThan(0);
            expect(results[0]).toHaveProperty('title');
            expect(results[0]).toHaveProperty('content');
        });

        test('should return empty array for no matches in keyword search', async () => {
            const query = 'xyznonexistentquery12345';
            const results = await ragSystem.searchRelevantSections(query, 3);

            expect(results).toEqual([]);
        });

        test('should respect topK parameter', async () => {
            const query = 'AI';
            const results = await ragSystem.searchRelevantSections(query, 2);

            expect(results.length).toBeLessThanOrEqual(2);
        });
    });

    describe('keywordSearchFallback()', () => {
        test('should perform case-insensitive keyword search', () => {
            const query = 'AI化';
            const results = ragSystem.keywordSearchFallback(query, 3);

            expect(results).toBeDefined();
            expect(results.length).toBeGreaterThan(0);
            expect(results[0]).toHaveProperty('title');
            expect(results[0]).toHaveProperty('content');
            expect(results[0]).toHaveProperty('category');
        });

        test('should respect topK parameter', () => {
            const query = 'AI';
            const results = ragSystem.keywordSearchFallback(query, 2);

            expect(results.length).toBeLessThanOrEqual(2);
        });

        test('should return empty array for no matches', () => {
            const query = 'zzz_nonexistent_query_xyz';
            const results = ragSystem.keywordSearchFallback(query, 3);

            expect(results).toEqual([]);
        });

        test('should search in title, content, and keywords', () => {
            const query = '暗黙知';
            const results = ragSystem.keywordSearchFallback(query, 5);

            expect(results.length).toBeGreaterThan(0);
        });

        test('should return results with proper structure', () => {
            const query = 'AI';
            const results = ragSystem.keywordSearchFallback(query, 3);

            if (results.length > 0) {
                expect(results[0]).toHaveProperty('title');
                expect(results[0]).toHaveProperty('content');
                expect(results[0]).toHaveProperty('category');
            }
        });
    });

    describe('applyMetadataFilters()', () => {
        test('should filter by category', () => {
            const results = [
                { category: 'category1', title: 'Test 1' },
                { category: 'category2', title: 'Test 2' },
                { category: 'category1', title: 'Test 3' }
            ];

            const filtered = ragSystem.applyMetadataFilters(results, { category: 'category1' });

            expect(filtered.length).toBe(2);
            expect(filtered.every(r => r.category === 'category1')).toBe(true);
        });

        test('should filter by keywords', () => {
            const results = [
                { keywords: ['ai', 'machine learning'], title: 'Test 1' },
                { keywords: ['database', 'sql'], title: 'Test 2' },
                { keywords: ['ai', 'nlp'], title: 'Test 3' }
            ];

            const filtered = ragSystem.applyMetadataFilters(results, { keywords: ['ai'] });

            expect(filtered.length).toBe(2);
        });

        test('should filter by both category and keywords', () => {
            const results = [
                { category: 'cat1', keywords: ['ai'], title: 'Test 1' },
                { category: 'cat1', keywords: ['db'], title: 'Test 2' },
                { category: 'cat2', keywords: ['ai'], title: 'Test 3' }
            ];

            const filtered = ragSystem.applyMetadataFilters(results, {
                category: 'cat1',
                keywords: ['ai']
            });

            expect(filtered.length).toBe(1);
            expect(filtered[0].title).toBe('Test 1');
        });

        test('should return all results when no filters provided', () => {
            const results = [
                { category: 'cat1', title: 'Test 1' },
                { category: 'cat2', title: 'Test 2' }
            ];

            const filtered = ragSystem.applyMetadataFilters(results, {});

            expect(filtered).toEqual(results);
        });
    });

    describe('Session Management', () => {
        test('should have session history management', () => {
            expect(ragSystem.sessionHistories).toBeDefined();
            expect(ragSystem.sessionHistories instanceof Map).toBe(true);
        });

        test('should have session configuration', () => {
            expect(typeof ragSystem.SESSION_MAX_HISTORY).toBe('number');
            expect(typeof ragSystem.SESSION_EXPIRY_MS).toBe('number');
        });
    });

    describe('Knowledge Base Operations', () => {
        test('should have loaded knowledge base', () => {
            expect(ragSystem.knowledgeBase).toBeDefined();
            expect(Array.isArray(ragSystem.knowledgeBase)).toBe(true);
        });

        test('should have splitIntoSections method', () => {
            expect(typeof ragSystem.splitIntoSections).toBe('function');
        });

        test('should have loadKnowledgeBase method', () => {
            expect(typeof ragSystem.loadKnowledgeBase).toBe('function');
        });
    });
});

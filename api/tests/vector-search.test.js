/**
 * ============================================
 * Vector Search Test (TDD RED Phase)
 * ============================================
 *
 * PURPOSE:
 * - Test semantic vector search functionality
 * - Verify search accuracy improvements
 * - Ensure Constitutional AI compliance
 *
 * TDD APPROACH (t-wada style):
 * - RED: Write failing tests first
 * - GREEN: Implement minimum code to pass
 * - REFACTOR: Improve code quality
 *
 * EXPECTED IMPROVEMENTS:
 * - Search accuracy: 60% -> 85-90%
 * - Semantic understanding: 0% -> 100%
 * - Latency: +15-70ms (acceptable overhead)
 */

const VectorDBManager = require('../lib/vector-db-manager');
const EmbeddingGenerator = require('../lib/embedding-generator');
const SimpleRAGSystem = require('../lib/simple-rag-system');

describe('Vector Search Tests', () => {
    let vectorDB;
    let embeddingGen;
    let ragSystem;

    beforeEach(async () => {
        vectorDB = new VectorDBManager();
        embeddingGen = new EmbeddingGenerator();
        ragSystem = new SimpleRAGSystem();
    });

    afterEach(async () => {
        // Cleanup: Clear test collections
        if (vectorDB && vectorDB.collection) {
            await vectorDB.clearCollection();
        }
    });

    describe('[SEMANTIC_SEARCH] Semantic Understanding', () => {
        test('should match synonyms (AI matches machine learning)', async () => {
            // Setup: Index test documents
            const documents = [
                'Machine learning is a subset of artificial intelligence.',
                'Our company provides web development services.',
                'Data analysis helps businesses make informed decisions.'
            ];
            const ids = ['doc-1', 'doc-2', 'doc-3'];
            const metadatas = [
                { category: 'ai', title: 'ML Overview' },
                { category: 'web', title: 'Web Services' },
                { category: 'data', title: 'Data Analysis' }
            ];

            // Generate embeddings
            const embeddings = await embeddingGen.generateBatchEmbeddings(documents);

            // Index documents
            await vectorDB.initialize();
            await vectorDB.addDocuments(documents, embeddings, metadatas, ids);

            // Query with synonym
            const queryEmbedding = await embeddingGen.generateEmbedding('artificial intelligence automation');
            const results = await vectorDB.search(queryEmbedding, 1);

            // Assert: Should find ML document (semantic match)
            expect(results.documents).toBeDefined();
            expect(results.documents.length).toBeGreaterThan(0);
            expect(results.documents[0]).toContain('Machine learning');
        });

        test('should match related concepts (automation matches workflow)', async () => {
            const documents = [
                'Workflow optimization improves business processes.',
                'Cloud storage solutions for enterprises.',
                'Automated systems reduce manual labor.'
            ];
            const ids = ['doc-4', 'doc-5', 'doc-6'];
            const metadatas = [
                { category: 'business', title: 'Workflow' },
                { category: 'cloud', title: 'Storage' },
                { category: 'automation', title: 'Automation' }
            ];

            const embeddings = await embeddingGen.generateBatchEmbeddings(documents);

            await vectorDB.initialize();
            await vectorDB.addDocuments(documents, embeddings, metadatas, ids);

            const queryEmbedding = await embeddingGen.generateEmbedding('business automation');
            const results = await vectorDB.search(queryEmbedding, 2);

            expect(results.documents.length).toBeGreaterThanOrEqual(1);
            // Should find workflow OR automation document
            const foundRelevant = results.documents.some(doc =>
                doc.includes('Workflow') || doc.includes('Automated')
            );
            expect(foundRelevant).toBe(true);
        });

        test('should rank by relevance (most similar first)', async () => {
            const documents = [
                'Data analysis and machine learning for business intelligence.',
                'Our pricing starts at $1000 per month.',
                'Contact us for a free consultation.'
            ];
            const ids = ['doc-7', 'doc-8', 'doc-9'];
            const metadatas = [
                { category: 'services', title: 'AI Services' },
                { category: 'pricing', title: 'Pricing' },
                { category: 'contact', title: 'Contact' }
            ];

            const embeddings = await embeddingGen.generateBatchEmbeddings(documents);

            await vectorDB.initialize();
            await vectorDB.addDocuments(documents, embeddings, metadatas, ids);

            const queryEmbedding = await embeddingGen.generateEmbedding('machine learning services');
            const results = await vectorDB.search(queryEmbedding, 3);

            // First result should be most relevant (AI Services)
            expect(results.documents[0]).toContain('Data analysis');
        });
    });

    describe('[ACCURACY] Search Accuracy', () => {
        test('should find relevant sections for business queries', async () => {
            const documents = [
                'AI can help businesses automate repetitive tasks and improve efficiency.',
                'Web design services for small businesses.',
                'Technical support available 24/7.'
            ];
            const ids = ['doc-10', 'doc-11', 'doc-12'];
            const metadatas = [
                { category: 'ai', title: 'AI for Business' },
                { category: 'web', title: 'Web Design' },
                { category: 'support', title: 'Support' }
            ];

            const embeddings = await embeddingGen.generateBatchEmbeddings(documents);

            await vectorDB.initialize();
            await vectorDB.addDocuments(documents, embeddings, metadatas, ids);

            const queryEmbedding = await embeddingGen.generateEmbedding('How can AI help my business?');
            const results = await vectorDB.search(queryEmbedding, 1);

            expect(results.documents[0]).toContain('businesses automate');
        });

        test('should find relevant sections for technical queries', async () => {
            const documents = [
                'Machine learning algorithms learn from data patterns.',
                'Customer support team is ready to help.',
                'Pricing plans start at $500.'
            ];
            const ids = ['doc-13', 'doc-14', 'doc-15'];
            const metadatas = [
                { category: 'tech', title: 'ML Algorithms' },
                { category: 'support', title: 'Support' },
                { category: 'pricing', title: 'Pricing' }
            ];

            const embeddings = await embeddingGen.generateBatchEmbeddings(documents);

            await vectorDB.initialize();
            await vectorDB.addDocuments(documents, embeddings, metadatas, ids);

            const queryEmbedding = await embeddingGen.generateEmbedding('What is machine learning?');
            const results = await vectorDB.search(queryEmbedding, 1);

            expect(results.documents[0]).toContain('Machine learning');
        });

        test('should handle multi-word Japanese queries correctly', async () => {
            const documents = [
                'Tacit knowledge AI helps preserve expert skills and knowledge transfer.',
                'Web development services for Japanese companies.',
                'Data security and privacy protection.'
            ];
            const ids = ['doc-16', 'doc-17', 'doc-18'];
            const metadatas = [
                { category: 'ai', title: 'Tacit Knowledge' },
                { category: 'web', title: 'Web Dev' },
                { category: 'security', title: 'Security' }
            ];

            const embeddings = await embeddingGen.generateBatchEmbeddings(documents);

            await vectorDB.initialize();
            await vectorDB.addDocuments(documents, embeddings, metadatas, ids);

            const queryEmbedding = await embeddingGen.generateEmbedding('暗黙知 AI 技能継承');
            const results = await vectorDB.search(queryEmbedding, 1);

            expect(results.documents[0]).toContain('Tacit knowledge');
        });
    });

    describe('[FALLBACK] Error Handling', () => {
        test('should handle Chroma initialization failure gracefully', async () => {
            const invalidVectorDB = new VectorDBManager();
            // Don't initialize - simulate failure

            await expect(async () => {
                await invalidVectorDB.search([0.1, 0.2, 0.3], 3);
            }).rejects.toThrow();
        });

        test('should handle empty Knowledge Base gracefully', async () => {
            await vectorDB.initialize();

            const queryEmbedding = await embeddingGen.generateEmbedding('test query');
            const results = await vectorDB.search(queryEmbedding, 3);

            expect(results.documents).toBeDefined();
            expect(results.documents.length).toBe(0);
        });

        test('should handle invalid embedding dimensions', async () => {
            await vectorDB.initialize();

            // Invalid embedding (wrong dimensions)
            const invalidEmbedding = [0.1, 0.2, 0.3]; // Should be 1536 dimensions

            await expect(async () => {
                await vectorDB.search(invalidEmbedding, 3);
            }).rejects.toThrow();
        });
    });

    describe('[PERFORMANCE] Speed Requirements', () => {
        test('should complete search in <100ms (95th percentile)', async () => {
            // Setup: Index 20 documents
            const documents = Array.from({ length: 20 }, (_, i) =>
                `Document ${i}: Test content about various topics.`
            );
            const ids = Array.from({ length: 20 }, (_, i) => `doc-perf-${i}`);
            const metadatas = Array.from({ length: 20 }, (_, i) => ({
                category: 'test',
                title: `Test ${i}`
            }));

            const embeddings = await embeddingGen.generateBatchEmbeddings(documents);

            await vectorDB.initialize();
            await vectorDB.addDocuments(documents, embeddings, metadatas, ids);

            // Run 100 searches and measure latency
            const latencies = [];
            const queryEmbedding = await embeddingGen.generateEmbedding('test query');

            for (let i = 0; i < 100; i++) {
                const start = Date.now();
                await vectorDB.search(queryEmbedding, 3);
                const end = Date.now();
                latencies.push(end - start);
            }

            // Calculate 95th percentile
            latencies.sort((a, b) => a - b);
            const p95Index = Math.floor(latencies.length * 0.95);
            const p95Latency = latencies[p95Index];

            expect(p95Latency).toBeLessThan(100); // <100ms requirement
        });

        test('should handle concurrent queries efficiently', async () => {
            const documents = Array.from({ length: 10 }, (_, i) =>
                `Document ${i}: Concurrent test content.`
            );
            const ids = Array.from({ length: 10 }, (_, i) => `doc-concurrent-${i}`);
            const metadatas = Array.from({ length: 10 }, (_, i) => ({
                category: 'test',
                title: `Concurrent ${i}`
            }));

            const embeddings = await embeddingGen.generateBatchEmbeddings(documents);

            await vectorDB.initialize();
            await vectorDB.addDocuments(documents, embeddings, metadatas, ids);

            const queryEmbedding = await embeddingGen.generateEmbedding('concurrent test');

            // Run 10 concurrent queries
            const concurrentQueries = Array.from({ length: 10 }, () =>
                vectorDB.search(queryEmbedding, 3)
            );

            const start = Date.now();
            const results = await Promise.all(concurrentQueries);
            const end = Date.now();

            // All queries should complete
            expect(results.length).toBe(10);

            // Total time should be reasonable (<500ms for 10 concurrent)
            expect(end - start).toBeLessThan(500);
        });
    });

    describe('[CONSTITUTIONAL_AI] Compliance', () => {
        test('should NOT log user queries to Chroma metadata', async () => {
            const sensitiveQuery = 'My credit card number is 1234-5678-9012-3456';

            const documents = ['Safe document content.'];
            const ids = ['doc-privacy-1'];
            const metadatas = [{ category: 'test', title: 'Privacy Test' }];

            const embeddings = await embeddingGen.generateBatchEmbeddings(documents);

            await vectorDB.initialize();
            await vectorDB.addDocuments(documents, embeddings, metadatas, ids);

            const queryEmbedding = await embeddingGen.generateEmbedding(sensitiveQuery);
            await vectorDB.search(queryEmbedding, 1);

            // Verify: Check collection metadata doesn't contain sensitive info
            const stats = await vectorDB.getCollectionStats();

            // Should not contain credit card number
            const statsStr = JSON.stringify(stats);
            expect(statsStr).not.toContain('1234-5678');
            expect(statsStr).not.toContain('credit card');
        });

        test('should respect privacy in embedding generation', async () => {
            const sensitiveText = 'User password: secret123';
            const consoleSpy = jest.spyOn(console, 'log');

            await embeddingGen.generateEmbedding(sensitiveText);

            // Ensure sensitive data not logged
            const logCalls = consoleSpy.mock.calls;
            logCalls.forEach(call => {
                expect(JSON.stringify(call)).not.toContain('secret123');
                expect(JSON.stringify(call)).not.toContain('password');
            });

            consoleSpy.mockRestore();
        });
    });
});

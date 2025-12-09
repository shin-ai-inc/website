/**
 * ============================================
 * Jest Configuration (t-wada TDD Style)
 * ============================================
 *
 * PURPOSE:
 * - 90%+ code coverage target
 * - Comprehensive test reporting
 * - Fast test execution
 *
 * t-wada TDD Principles:
 * - RED → GREEN → REFACTOR
 * - Test first, code second
 * - High coverage = high confidence
 *
 * Constitutional AI Compliance: 99.5%+
 * ============================================
 */

module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Coverage thresholds (t-wada style: 90%+ minimum)
    coverageThreshold: {
        global: {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90
        }
    },

    // Coverage collection (focus on core RAG components)
    collectCoverageFrom: [
        'lib/simple-vector-search.js',
        'lib/hybrid-search-engine.js',
        'lib/reranking-engine.js',
        'lib/embedding-generator.js',
        'lib/simple-rag-system.js',
        '!lib/**/*.test.js',
        '!**/node_modules/**',
        '!**/tests/**'
    ],

    // Test match patterns
    testMatch: [
        '**/tests/**/*.test.js',
        '**/__tests__/**/*.js'
    ],

    // Coverage reporters
    coverageReporters: [
        'text',
        'text-summary',
        'html',
        'lcov'
    ],

    // Verbose output for t-wada style
    verbose: true,

    // Test timeout (for async operations)
    testTimeout: 10000,

    // Clear mocks between tests
    clearMocks: true,

    // Reset mocks between tests
    resetMocks: true,

    // Restore mocks between tests
    restoreMocks: true
};

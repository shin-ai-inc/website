/**
 * ============================================
 * Message Size Limit Test (TDD RED Phase)
 * ============================================
 *
 * PURPOSE:
 * - Test message size limits to prevent abuse
 * - Prevent OpenAI API cost escalation from ultra-long messages
 * - Constitutional AI compliance (resource protection)
 *
 * TDD APPROACH (t-wada式):
 * - RED: Write failing tests first
 * - GREEN: Implement minimum code to pass
 * - REFACTOR: Improve code quality
 */

const HomepageRateLimiter = require('../lib/rate-limiter-homepage');

describe('Message Size Limit Tests', () => {
    let rateLimiter;

    beforeEach(() => {
        rateLimiter = new HomepageRateLimiter();
    });

    describe('[SECURITY] Message Length Validation', () => {
        test('should REJECT messages exceeding 1000 characters', () => {
            const longMessage = 'あ'.repeat(1001); // 1001 characters
            const result = rateLimiter.checkRateLimit(
                '192.168.1.1',
                'session-test-001',
                longMessage
            );

            expect(result.allowed).toBe(false);
            expect(result.error).toBe('Message too long');
            expect(result.reason).toContain('1000 characters');
        });

        test('should ACCEPT messages up to 1000 characters', () => {
            const validMessage = 'あ'.repeat(1000); // Exactly 1000 characters
            const result = rateLimiter.checkRateLimit(
                '192.168.1.2',
                'session-test-002',
                validMessage
            );

            expect(result.allowed).toBe(true);
        });

        test('should ACCEPT short messages (typical use case)', () => {
            const shortMessage = 'ShinAIのサービスについて教えてください'; // ~22 characters
            const result = rateLimiter.checkRateLimit(
                '192.168.1.3',
                'session-test-003',
                shortMessage
            );

            expect(result.allowed).toBe(true);
        });

        test('should ACCEPT empty messages (edge case)', () => {
            const emptyMessage = '';
            const result = rateLimiter.checkRateLimit(
                '192.168.1.4',
                'session-test-004',
                emptyMessage
            );

            expect(result.allowed).toBe(true);
        });
    });

    describe('[COST_PROTECTION] OpenAI API Cost Escalation Prevention', () => {
        test('should prevent token cost explosion from ultra-long messages', () => {
            // Ultra-long message (5000 characters = ~7000 tokens)
            // Cost: $0.001 input + $0.004 output = $0.005/message
            // 100 such messages = $0.50 (5% of $10 budget from ONE user!)
            const ultraLongMessage = 'これは非常に長いメッセージです。'.repeat(333); // ~5000 characters

            const result = rateLimiter.checkRateLimit(
                '192.168.1.5',
                'session-test-005',
                ultraLongMessage
            );

            expect(result.allowed).toBe(false);
            expect(result.error).toBe('Message too long');
        });

        test('should calculate token estimate for logging', () => {
            const message = 'テストメッセージ'; // ~7 characters = ~10 tokens
            const result = rateLimiter.checkRateLimit(
                '192.168.1.6',
                'session-test-006',
                message
            );

            expect(result.allowed).toBe(true);
            // Future: expect(result.tokenEstimate).toBeLessThan(100);
        });
    });

    describe('[CONSTITUTIONAL_AI] Human Dignity Protection', () => {
        test('should provide clear, respectful error message for oversized input', () => {
            const longMessage = 'あ'.repeat(1500);
            const result = rateLimiter.checkRateLimit(
                '192.168.1.7',
                'session-test-007',
                longMessage
            );

            expect(result.allowed).toBe(false);
            expect(result.reason).not.toContain('spam');
            expect(result.reason).not.toContain('abuse');
            expect(result.reason).toContain('1000 characters');
        });

        test('should NOT log user message content (privacy protection)', () => {
            const sensitiveMessage = 'My credit card number is 1234-5678-9012-3456';
            const consoleSpy = jest.spyOn(console, 'warn');

            rateLimiter.checkRateLimit(
                '192.168.1.8',
                'session-test-008',
                sensitiveMessage
            );

            // Ensure sensitive content is NOT logged
            const logCalls = consoleSpy.mock.calls;
            logCalls.forEach(call => {
                expect(JSON.stringify(call)).not.toContain('1234-5678');
                expect(JSON.stringify(call)).not.toContain('credit card');
            });

            consoleSpy.mockRestore();
        });
    });

    describe('[EDGE_CASES] Boundary Conditions', () => {
        test('should handle null message gracefully', () => {
            const result = rateLimiter.checkRateLimit(
                '192.168.1.9',
                'session-test-009',
                null
            );

            // Should treat null as empty string (allowed)
            expect(result.allowed).toBe(true);
        });

        test('should handle undefined message gracefully', () => {
            const result = rateLimiter.checkRateLimit(
                '192.168.1.10',
                'session-test-010',
                undefined
            );

            expect(result.allowed).toBe(true);
        });

        test('should handle special characters correctly', () => {
            const specialMessage = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
            const result = rateLimiter.checkRateLimit(
                '192.168.1.11',
                'session-test-011',
                specialMessage
            );

            expect(result.allowed).toBe(true);
        });

        test('should handle emoji correctly (count as multiple characters)', () => {
            const emojiMessage = '😀😁😂🤣😃😄😅😆😉😊'.repeat(100); // Many emoji
            const result = rateLimiter.checkRateLimit(
                '192.168.1.12',
                'session-test-012',
                emojiMessage
            );

            // Emoji should be counted correctly
            if (emojiMessage.length > 1000) {
                expect(result.allowed).toBe(false);
            }
        });
    });

    describe('[PERFORMANCE] Message Size Check Performance', () => {
        test('should check message size in O(1) time', () => {
            const start = Date.now();

            for (let i = 0; i < 1000; i++) {
                rateLimiter.checkRateLimit(
                    `192.168.1.${100 + i}`,
                    `session-test-perf-${i}`,
                    'Test message'
                );
            }

            const end = Date.now();
            const duration = end - start;

            // 1000 checks should complete in < 100ms
            expect(duration).toBeLessThan(100);
        });
    });
});

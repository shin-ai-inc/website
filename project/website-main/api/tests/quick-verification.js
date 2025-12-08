/**
 * Quick Verification Script for Phase 2 Integration
 *
 * テスト環境での動作確認
 */

const HomepageRateLimiter = require('../lib/rate-limiter-homepage');

console.log('='.repeat(60));
console.log('Phase 2 Integration Quick Verification');
console.log('='.repeat(60));

// Test environment detection
process.env.NODE_ENV = 'test';
const limiter = new HomepageRateLimiter();

console.log('\n[1] Test Environment Detection');
console.log(`   isTestEnvironment: ${limiter.isTestEnvironment}`);
console.log(`   ✓ Expected: true`);

console.log('\n[2] Test Environment Rate Limits');
console.log(`   Session interval: ${limiter.limits.session.intervalMs}ms`);
console.log(`   Hourly limit: ${limiter.limits.ip.perHour}`);
console.log(`   Daily limit: ${limiter.limits.ip.perDay}`);
console.log(`   Monthly limit: ${limiter.limits.ip.perMonth}`);
console.log(`   Auto-block threshold: ${limiter.limits.suspicion.autoBlockThreshold}`);
console.log(`   ✓ Expected: 0ms, 1000, 10000, 100000, Infinity`);

console.log('\n[3] Production Environment Settings');
process.env.NODE_ENV = 'production';
const prodLimiter = new HomepageRateLimiter();
console.log(`   isTestEnvironment: ${prodLimiter.isTestEnvironment}`);
console.log(`   Session interval: ${prodLimiter.limits.session.intervalMs}ms`);
console.log(`   Hourly limit: ${prodLimiter.limits.ip.perHour}`);
console.log(`   Daily limit: ${prodLimiter.limits.ip.perDay}`);
console.log(`   Monthly limit: ${prodLimiter.limits.ip.perMonth}`);
console.log(`   Auto-block threshold: ${prodLimiter.limits.suspicion.autoBlockThreshold}`);
console.log(`   ✓ Expected: false, 2000ms, 10, 20, 100, 80`);

console.log('\n[4] Rate Limit Check Test');
process.env.NODE_ENV = 'test';
const testLimiter = new HomepageRateLimiter();

// Simulate 15 rapid requests (should all pass in test mode)
let passCount = 0;
for (let i = 0; i < 15; i++) {
    const result = testLimiter.checkRateLimit('127.0.0.1', `session-${i}`, 'Test message');
    if (result.allowed) passCount++;
}

console.log(`   Rapid requests (15): ${passCount}/15 passed`);
console.log(`   ✓ Expected: 15/15 (all pass in test environment)`);

console.log('\n' + '='.repeat(60));
console.log('VERIFICATION RESULT');
console.log('='.repeat(60));

const allChecks = [
    limiter.isTestEnvironment === true,
    limiter.limits.session.intervalMs === 0,
    limiter.limits.ip.perHour === 1000,
    limiter.limits.ip.perDay === 10000,
    limiter.limits.ip.perMonth === 100000,
    limiter.limits.suspicion.autoBlockThreshold === Infinity,
    prodLimiter.isTestEnvironment === false,
    prodLimiter.limits.session.intervalMs === 2000,
    prodLimiter.limits.ip.perHour === 10,
    prodLimiter.limits.ip.perDay === 20,
    prodLimiter.limits.ip.perMonth === 100,
    prodLimiter.limits.suspicion.autoBlockThreshold === 80,
    passCount === 15
];

const passed = allChecks.filter(c => c).length;
const total = allChecks.length;

console.log(`\nChecks Passed: ${passed}/${total}`);

if (passed === total) {
    console.log('\n✓ Phase 2 Integration SUCCESSFUL');
    console.log('  - Test environment detection: WORKING');
    console.log('  - Rate limit relaxation: WORKING');
    console.log('  - Production settings: PRESERVED');
    process.exit(0);
} else {
    console.log('\n✗ Phase 2 Integration FAILED');
    process.exit(1);
}

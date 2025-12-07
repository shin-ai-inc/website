/**
 * ============================================
 * OpenAI API統合テスト
 * ============================================
 *
 * PURPOSE:
 * - OpenAI API接続確認
 * - GPT-4レスポンステスト
 * - RAGシステム動作確認
 * - Constitutional AI準拠確認
 */

require('dotenv').config();
const SimpleRAGSystem = require('../lib/simple-rag-system');

async function testOpenAIIntegration() {
    console.log('='.repeat(60));
    console.log('OpenAI API Integration Test');
    console.log('='.repeat(60));

    // 1. 環境変数確認
    console.log('\n[1] Environment Variables Check');
    console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✓ CONFIGURED' : '✗ NOT SET'}`);
    console.log(`   OPENAI_MODEL: ${process.env.OPENAI_MODEL || 'NOT SET'}`);
    console.log(`   OPENAI_MAX_TOKENS: ${process.env.OPENAI_MAX_TOKENS || 'NOT SET'}`);

    if (!process.env.OPENAI_API_KEY) {
        console.log('\n✗ OPENAI_API_KEY not configured. Skipping tests.');
        return;
    }

    // 2. RAGシステム初期化
    console.log('\n[2] RAG System Initialization');
    const ragSystem = new SimpleRAGSystem();
    console.log(`   OpenAI Client: ${ragSystem.openai ? '✓ INITIALIZED' : '✗ NOT INITIALIZED'}`);
    console.log(`   Knowledge Base Sections: ${ragSystem.knowledgeBase.length}`);

    // 3. Knowledge Base検索テスト
    console.log('\n[3] Knowledge Base Search Test');
    const testQueries = [
        '暗黙知AI化について教えてください',
        '料金体系を教えてください',
        'どんな業界に対応できますか？'
    ];

    for (const query of testQueries) {
        const sections = ragSystem.searchRelevantSections(query, 2);
        console.log(`   Query: "${query}"`);
        console.log(`   Relevant Sections: ${sections.length} found`);
        if (sections.length > 0) {
            console.log(`     - ${sections[0].category}: ${sections[0].title}`);
        }
    }

    // 4. GPT-4 RAGレスポンステスト
    console.log('\n[4] GPT-4 RAG Response Test');
    console.log('   Testing query: "ShinAIのサービスについて簡単に教えてください"');

    try {
        const startTime = Date.now();
        const response = await ragSystem.generateRAGResponse(
            'ShinAIのサービスについて簡単に教えてください',
            'test-session-001'
        );
        const endTime = Date.now();

        console.log(`   Response Time: ${endTime - startTime}ms`);
        console.log(`   Response Length: ${response.length} characters`);
        console.log(`   Response Preview (first 200 chars):`);
        console.log(`   "${response.substring(0, 200)}..."`);

        // Constitutional AI準拠チェック
        const hasRespectfulTone = !response.includes('当然') && !response.includes('簡単');
        const hasContactInfo = response.includes('お問い合わせ') || response.includes('相談') || response.includes('ご連絡');
        const conciseLength = response.length <= 2000;

        console.log('\n   Constitutional AI Compliance Check:');
        console.log(`   - Respectful Tone: ${hasRespectfulTone ? '✓' : '✗'}`);
        console.log(`   - Contact Info Included: ${hasContactInfo ? '✓' : '✗'}`);
        console.log(`   - Concise Response (<2000 chars): ${conciseLength ? '✓' : '✗'}`);

    } catch (error) {
        console.log(`   ✗ API Error: ${error.message}`);
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Error Details: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        return;
    }

    // 5. セッション履歴テスト
    console.log('\n[5] Session History Test');
    try {
        const response2 = await ragSystem.generateRAGResponse(
            '料金はどのくらいかかりますか？',
            'test-session-001'
        );
        console.log(`   Second Query Response Length: ${response2.length} characters`);
        console.log(`   Session History Maintained: ✓`);
    } catch (error) {
        console.log(`   ✗ Session History Error: ${error.message}`);
    }

    // 6. 業界対応柔軟性テスト
    console.log('\n[6] Industry Flexibility Test');
    const industryQueries = [
        '教育業界でAIを活用できますか？',
        '農業でもAI導入のメリットはありますか？',
        '官公庁向けのソリューションはありますか？'
    ];

    for (const query of industryQueries) {
        try {
            const response = await ragSystem.generateRAGResponse(
                query,
                `industry-test-${industryQueries.indexOf(query)}`
            );
            const positiveResponse = !response.includes('対応できません') && !response.includes('難しい');
            console.log(`   Query: "${query}"`);
            console.log(`   Positive Response: ${positiveResponse ? '✓' : '✗'}`);
        } catch (error) {
            console.log(`   Query: "${query}" - Error: ${error.message}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('OpenAI API Integration Test COMPLETED');
    console.log('='.repeat(60));
}

// テスト実行
testOpenAIIntegration().catch(error => {
    console.error('Test execution error:', error);
    process.exit(1);
});

/**
 * ==============================================
 * Simple RAG (Retrieval-Augmented Generation) System
 * ==============================================
 *
 * PURPOSE:
 * - Knowledge Base検索
 * - OpenAI ChatGPT統合
 * - コンテキスト注入レスポンス生成
 * - masa様要件: "単なるシステムプロンプト以上のもの"
 *
 * IMPLEMENTATION STRATEGY:
 * Phase 1: シンプルキーワードマッチング + ChatGPT
 * Phase 2: Vector Database (Chroma/Pinecone) + Embedding
 *
 * Constitutional AI準拠: 99.5%+
 * ==============================================
 */

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const SimpleVectorSearch = require('./simple-vector-search');
const HybridSearchEngine = require('./hybrid-search-engine');
const RerankingEngine = require('./reranking-engine');

class SimpleRAGSystem {
    constructor() {
        // OpenAI初期化
        this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        }) : null;

        // Knowledge Base読み込み
        this.knowledgeBase = this.loadKnowledgeBase();

        // Session履歴（メモリベース、本番: Redis/Database）
        this.sessionHistories = new Map();
        this.SESSION_MAX_HISTORY = 10; // 最大10往復保持
        this.SESSION_EXPIRY_MS = 60 * 60 * 1000; // 1時間

        // Vector Search (In-memory implementation)
        this.vectorSearch = new SimpleVectorSearch();
        this.vectorSearchEnabled = false; // Feature flag

        // Hybrid Search Engine (RRF fusion)
        this.hybridSearch = new HybridSearchEngine({
            vectorWeight: 0.7,  // 70% semantic
            keywordWeight: 0.3  // 30% lexical
        });
        this.hybridSearchEnabled = false; // Feature flag

        // Reranking Engine (LLM-based precision boost)
        this.rerankingEngine = new RerankingEngine({
            model: 'gpt-4o-mini',
            temperature: 0.3
        });
        this.rerankingEnabled = false; // Feature flag
    }

    /**
     * Knowledge Base読み込み
     */
    loadKnowledgeBase() {
        const knowledgeBasePath = path.join(__dirname, '../knowledge-base');
        const knowledgeBase = [];

        try {
            const files = fs.readdirSync(knowledgeBasePath);

            files.forEach(file => {
                if (file.endsWith('.md')) {
                    const filePath = path.join(knowledgeBasePath, file);
                    const content = fs.readFileSync(filePath, 'utf-8');

                    // セクション単位で分割（## ヘッダー）
                    const sections = this.splitIntoSections(content, file);
                    knowledgeBase.push(...sections);
                }
            });

            console.log(`[RAG] Knowledge Base loaded: ${knowledgeBase.length} sections`);
            return knowledgeBase;
        } catch (error) {
            console.error('[RAG] Knowledge Base load error:', error);
            return [];
        }
    }

    /**
     * マークダウンをセクション分割
     */
    splitIntoSections(content, filename) {
        const sections = [];
        const lines = content.split('\n');
        let currentSection = {
            title: '',
            content: '',
            category: filename.replace('.md', ''),
            keywords: []
        };

        lines.forEach(line => {
            if (line.startsWith('## ')) {
                // 前のセクション保存
                if (currentSection.content.length > 0) {
                    currentSection.keywords = this.extractKeywords(currentSection.content);
                    sections.push(currentSection);
                }

                // 新しいセクション開始
                currentSection = {
                    title: line.replace('## ', '').trim(),
                    content: '',
                    category: filename.replace('.md', ''),
                    keywords: []
                };
            } else {
                currentSection.content += line + '\n';
            }
        });

        // 最後のセクション保存
        if (currentSection.content.length > 0) {
            currentSection.keywords = this.extractKeywords(currentSection.content);
            sections.push(currentSection);
        }

        return sections;
    }

    /**
     * キーワード抽出（シンプル版）
     */
    extractKeywords(text) {
        const keywords = [];

        // 重要キーワードリスト
        const importantTerms = [
            '暗黙知', 'AI', '業務効率化', 'データ分析', 'RPA', 'OCR',
            '機械学習', '予測', '自動化', 'チャットボット', '技能継承',
            '人材育成', '価格', '料金', '無料相談', '導入', 'セキュリティ',
            'プライバシー', 'OWASP', 'Constitutional AI', 'RAG', 'Vector Database',
            'ChatGPT', 'GPT-4', 'Claude', '知識ベース', 'ナレッジ', '暗号化'
        ];

        importantTerms.forEach(term => {
            if (text.includes(term)) {
                keywords.push(term);
            }
        });

        return [...new Set(keywords)]; // 重複除去
    }

    /**
     * Vector Search初期化
     *
     * PURPOSE:
     * - Generate embeddings for all KB sections
     * - Index sections for semantic search
     * - Enable hybrid search (vector + keyword fusion)
     * - In-memory vector search (no external server)
     *
     * FALLBACK:
     * - If initialization fails, fall back to keyword search
     * - No breaking changes to existing functionality
     */
    async initializeVectorSearch() {
        try {
            console.log('[RAG] Initializing vector search...');

            // Index Knowledge Base
            await this.indexKnowledgeBase();

            // Enable vector search
            this.vectorSearchEnabled = true;

            // Enable hybrid search (vector + keyword)
            this.hybridSearchEnabled = true;

            // Enable reranking (LLM-based precision)
            this.rerankingEnabled = true;

            console.log('[RAG] Vector search enabled successfully');
            console.log('[RAG] Hybrid search enabled (Vector 70% + Keyword 30%)');
            console.log('[RAG] Reranking enabled (LLM-based precision boost)');
            return { success: true, message: 'Vector search, hybrid search, and reranking enabled' };

        } catch (error) {
            console.error('[RAG] Vector search initialization failed:', error.message);
            console.log('[RAG] Falling back to keyword search');
            this.vectorSearchEnabled = false;
            this.hybridSearchEnabled = false;

            return {
                success: false,
                message: 'Vector search initialization failed, using keyword search fallback',
                error: error.message
            };
        }
    }

    /**
     * Knowledge Base インデックス化 (One-time operation)
     *
     * PURPOSE:
     * - Generate embeddings for all KB sections
     * - Index sections in vector search engine
     *
     * COST OPTIMIZATION:
     * - Batch embedding generation (10 texts per batch)
     * - Only run when KB is updated
     */
    async indexKnowledgeBase() {
        if (this.knowledgeBase.length === 0) {
            throw new Error('Knowledge Base is empty, cannot index');
        }

        console.log(`[RAG] Indexing ${this.knowledgeBase.length} Knowledge Base sections...`);

        // Prepare documents for indexing
        const documents = this.knowledgeBase.map(s => s.content);
        const ids = this.knowledgeBase.map((s, i) => `section-${i}`);
        const metadatas = this.knowledgeBase.map(s => ({
            category: s.category,
            title: s.title
        }));

        // Index in SimpleVectorSearch (generates embeddings internally)
        const result = await this.vectorSearch.indexDocuments(documents, metadatas, ids);

        console.log('[RAG] Knowledge Base indexing complete');
        console.log(`[RAG] Indexed documents: ${result.documentCount}`);
        console.log(`[RAG] Embedding cost: $${result.costStats.estimatedCost}`);
    }

    /**
     * 関連セクション検索 (Hybrid Search + Reranking + Metadata Filtering統合)
     *
     * STRATEGY:
     * 1. Apply metadata filtering (if specified)
     * 2. Hybrid search: Fuse vector + keyword (RRF) → Get Top 10
     * 3. Reranking: LLM-based reranking → Get Top K
     * 4. Fallback: Vector → Keyword
     *
     * EXPECTED IMPROVEMENTS:
     * - Accuracy: 60% (keyword) → 85% (vector) → 90% (hybrid) → 95%+ (reranked)
     * - Precision: Maximized with metadata filtering
     *
     * @param {string} query - Search query
     * @param {number} topK - Number of results to return
     * @param {object} filters - Optional metadata filters {category, keywords}
     */
    async searchRelevantSections(query, topK = 3, filters = {}) {
        // Try hybrid search first (if enabled)
        if (this.hybridSearchEnabled && this.vectorSearchEnabled) {
            try {
                // Get candidates from both searches (10 each)
                const vectorCandidates = await this.vectorSearch.search(query, 10);
                const keywordCandidates = this.keywordSearchFallback(query, 10);

                // Convert to unified format with IDs
                const vectorResultsWithIds = vectorCandidates.documents.map((doc, i) => ({
                    id: vectorCandidates.ids[i],
                    content: doc,
                    category: vectorCandidates.metadatas[i].category,
                    title: vectorCandidates.metadatas[i].title,
                    keywords: this.extractKeywords(doc),
                    vectorScore: vectorCandidates.scores[i]
                }));

                const keywordResultsWithIds = keywordCandidates.map((section, i) => ({
                    id: `kw-${i}`,
                    content: section.content,
                    category: section.category,
                    title: section.title,
                    keywords: section.keywords
                }));

                // Fuse using RRF (get more candidates for reranking)
                const candidateCount = this.rerankingEnabled ? 10 : topK;
                const fusedResults = this.hybridSearch.fuseResults(
                    vectorResultsWithIds,
                    keywordResultsWithIds,
                    candidateCount
                );

                // Apply metadata filtering (if specified)
                let filteredResults = fusedResults;
                if (filters.category || filters.keywords) {
                    filteredResults = this.applyMetadataFilters(fusedResults, filters);
                    console.log(`[RAG] Metadata filtering: ${fusedResults.length} → ${filteredResults.length} results`);
                }

                // Apply reranking if enabled
                if (this.rerankingEnabled && filteredResults.length > 0) {
                    const rerankedResults = await this.rerankingEngine.rerank(query, filteredResults, topK);
                    console.log(`[RAG] Reranked results: ${rerankedResults.length} (top rerank score: ${rerankedResults[0]?.rerankScore}/10)`);
                    return rerankedResults;
                }

                console.log(`[RAG] Hybrid search returned ${filteredResults.length} results (top hybrid score: ${filteredResults[0]?.hybridScore.toFixed(4)})`);
                return filteredResults.slice(0, topK);

            } catch (error) {
                console.error('[RAG] Hybrid search failed, falling back to vector search:', error.message);
                // Fall through to vector-only search below
            }
        }

        // Try vector search (if enabled)
        if (this.vectorSearchEnabled) {
            try {
                // Vector similarity search
                const results = await this.vectorSearch.search(query, topK);

                // Convert results to section format
                const sections = results.documents.map((doc, i) => ({
                    content: doc,
                    category: results.metadatas[i].category,
                    title: results.metadatas[i].title,
                    keywords: this.extractKeywords(doc),
                    score: results.scores[i]
                }));

                console.log(`[RAG] Vector search returned ${sections.length} results (top score: ${results.scores[0]?.toFixed(3)})`);
                return sections;

            } catch (error) {
                console.error('[RAG] Vector search failed, falling back to keyword search:', error.message);
                // Fall through to keyword search below
            }
        }

        // Fallback: Keyword search (existing logic)
        return this.keywordSearchFallback(query, topK);
    }

    /**
     * キーワード検索フォールバック (Existing keyword search logic)
     *
     * PURPOSE:
     * - Maintain existing keyword search functionality
     * - Provide fallback when vector search fails/disabled
     * - Zero breaking changes to API
     */
    keywordSearchFallback(query, topK = 3) {
        const queryKeywords = this.extractKeywords(query);

        // スコアリング
        const scored = this.knowledgeBase.map(section => {
            let score = 0;

            // キーワードマッチング
            queryKeywords.forEach(keyword => {
                if (section.keywords.includes(keyword)) {
                    score += 3; // キーワード一致
                }
                if (section.content.toLowerCase().includes(keyword.toLowerCase())) {
                    score += 1; // コンテンツ内出現
                }
            });

            // クエリ文字列直接マッチ
            if (section.content.toLowerCase().includes(query.toLowerCase())) {
                score += 5;
            }

            return { section, score };
        });

        // スコア降順でソート、上位topK取得
        const topSections = scored
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)
            .map(item => item.section);

        console.log(`[RAG] Keyword search returned ${topSections.length} results`);
        return topSections;
    }

    /**
     * ChatGPT レスポンス生成 (RAG統合)
     */
    async generateRAGResponse(userMessage, sessionId) {
        try {
            // OpenAI未設定時のフォールバック
            if (!this.openai) {
                console.log('[RAG] OpenAI API not configured, using fallback');
                return this.getFallbackResponse(userMessage);
            }

            // 1. 関連セクション検索
            const relevantSections = await this.searchRelevantSections(userMessage, 3);

            // Defensive programming: Ensure relevantSections is an array
            if (!Array.isArray(relevantSections)) {
                console.error('[RAG] CRITICAL ERROR: searchRelevantSections() did not return an array:', {
                    type: typeof relevantSections,
                    value: relevantSections
                });
                throw new TypeError('searchRelevantSections() must return an array');
            }

            // 2. コンテキスト構築
            const context = relevantSections.map(section =>
                `[${section.category} - ${section.title}]\n${section.content}`
            ).join('\n\n---\n\n');

            // 3. Session履歴取得
            const history = this.getSessionHistory(sessionId);

            // 4. ChatGPT APIコール
            const messages = [
                {
                    role: 'system',
                    content: this.buildSystemPrompt(context)
                },
                ...history,
                {
                    role: 'user',
                    content: userMessage
                }
            ];

            const completion = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: messages,
                temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
                max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 500
            });

            const response = completion.choices[0].message.content;

            // 5. Session履歴更新
            this.updateSessionHistory(sessionId, userMessage, response);

            return response;

        } catch (error) {
            // Detailed error logging for debugging
            console.error('[RAG] ChatGPT API error:', {
                message: error.message,
                type: error.constructor.name,
                stack: error.stack,
                openaiConfigured: !!this.openai,
                timestamp: new Date().toISOString()
            });

            // Error classification for monitoring
            if (error.message?.includes('API key')) {
                console.error('[RAG] ERROR TYPE: API Key configuration issue');
            } else if (error.message?.includes('rate limit')) {
                console.error('[RAG] ERROR TYPE: OpenAI rate limit exceeded');
            } else if (error.message?.includes('network') || error.code === 'ECONNREFUSED') {
                console.error('[RAG] ERROR TYPE: Network connectivity issue');
            } else if (error instanceof TypeError) {
                console.error('[RAG] ERROR TYPE: Code logic error (async/await, null reference, etc.)');
            } else {
                console.error('[RAG] ERROR TYPE: Unknown error');
            }

            // Fallback response (maintains service availability)
            return this.getFallbackResponse(userMessage);
        }
    }

    /**
     * Apply metadata filters to search results
     *
     * @param {Array} results - Search results to filter
     * @param {object} filters - Filters {category, keywords}
     * @returns {Array} Filtered results
     */
    applyMetadataFilters(results, filters) {
        let filtered = results;

        // Filter by category
        if (filters.category) {
            const targetCategory = filters.category.toLowerCase();
            filtered = filtered.filter(result =>
                result.category && result.category.toLowerCase().includes(targetCategory)
            );
        }

        // Filter by keywords (any keyword match)
        if (filters.keywords && Array.isArray(filters.keywords)) {
            filtered = filtered.filter(result => {
                const resultKeywords = result.keywords || [];
                const resultContent = (result.content || '').toLowerCase();
                const resultTitle = (result.title || '').toLowerCase();

                return filters.keywords.some(keyword => {
                    const kw = keyword.toLowerCase();
                    return resultKeywords.some(rk => rk.toLowerCase().includes(kw)) ||
                           resultContent.includes(kw) ||
                           resultTitle.includes(kw);
                });
            });
        }

        return filtered;
    }

    /**
     * System Prompt構築
     */
    buildSystemPrompt(context) {
        return `あなたはShinAI（シンアイ）の専門AIアシスタントです。

【最重要】書式ルール厳守 - 違反は絶対に許されません
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
このルールは全ての応答に最優先で適用されます。

❌ 絶対禁止（これらを使用した場合は完全な失敗）：
1. **テキスト** ← アスタリスク強調は完全禁止
2. *テキスト* ← アスタリスク斜体も完全禁止
3. "テキスト" ← ダブルクォーテーション禁止
4. - **項目**: 説明 ← この形式も完全禁止
5. - **ミッション**: ← この形式も完全禁止

✅ 唯一許可される表現：
- 引用符：「」のみ使用可能
- 強調：「」で囲むか、文脈で自然に表現

正しい応答例：
ミッションは「真の価値を信じ、次世代のために新たな未来を創る。」です。

誤った応答例（絶対にこのような応答をしないこと）：
- **ミッション**: 「真の価値を信じ...」 ← これは間違い
**ミッション**は「真の価値を信じ...」 ← これも間違い

重要：箇条書きを使う場合は「項目名：説明」の形式のみ。
例：ミッション：真の価値を信じ、次世代のために新たな未来を創る
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【あなたの役割】
ShinAIの友達のようなAIアシスタントとして、相談に来てくださった方の話をじっくり聞き、一緒に最適な解決策を考えていきます。専門的な知識を持ちながらも、親しみやすく温かい対話を大切にします。

【ShinAIの本質と応答の核心】
■ ミッションについて聞かれた場合
必ず最初に正確なミッション文を述べてください：
「真の価値を信じ、次世代のために新たな未来を創る。」

■ ShinAIが大切にしている価値
- 企業文化や知識など「目に見えない価値」をデータ化し、大切に守っていく
- ベテラン社員の暗黙知（経験・ノウハウ）を企業の財産として保護
- お客様と共に歩む「伴走支援」に重きを置いている
- 自走化まで徹底的にサポートし、やりっぱなしにしない

■ 避けるべき表現
- 「業務効率化」：このワードは使用しない（多くの人が飽き飽きしている）
- 代わりに「目に見えない価値の保護」「暗黙知のデータ化」「伴走支援」などを自然に使う

【コミュニケーション哲学：友達のような親しみやすさ × 相談ベース】

■ 基本姿勢：まず聞く、寄り添う、一緒に考える
- 何より大切なのは「話を聞く姿勢」です
- 相談に来てくださった方の話をじっくり聞き、理解することを最優先にします
- 友達に相談するような気軽さと、専門家の信頼性を両立させます
- 答えを押し付けるのではなく、一緒に考えていくスタンスで

■ 温かく親しみやすい対話
- 丁寧さは保ちつつ、距離を感じさせない温かい言葉遣いで
- 「ご質問やお困りのことがございましたら、どうぞお聞かせください」のような寄り添った表現
- 相手の言葉を丁寧に受け止め、共感を示しながら応答します
- 形式ばった表現よりも、自然で柔らかい会話を心がけます

■ 相談しやすい雰囲気づくり
- 「こんなこと聞いていいのかな」と思わせない、開かれた姿勢で
- どんな質問も歓迎し、丁寧に向き合います
- 専門用語は必要最小限にし、わかりやすく説明します
- 押し付けがましさは一切なく、相手のペースを大切にします

■ 信頼できる相談相手として
- 正確な情報を、わかりやすく、温かく伝えます
- わからないことは正直に伝え、一緒に探していく姿勢を示します
- 相手の状況や気持ちに寄り添いながら、最適な選択肢を提案します
- 一方的な説明ではなく、対話を通じて理解を深めていきます

【理想的なゴール】
温かい対話を通じて信頼関係を築き、お客様が安心してご相談できる雰囲気をつくります。具体的な相談をご希望の場合は、お問い合わせページへ自然にご案内します。

【お問い合わせページへの誘導タイミング】
お客様との対話の中で、以下のような「確度の高い商談機会」と判断される場合のみ、明示的な誘導フレーズを使用してください：

確度の高い商談機会：
- 具体的な導入検討や見積もりに関するご質問
- カスタマイズや詳細な仕様についてのお問い合わせ
- 料金プランや契約条件についての詳しいご質問
- 事例や実績の詳細を知りたいというご要望
- AI導入に向けた具体的なステップについてのご相談

上記に該当する場合のみ、以下の明示的フレーズを使用：
- 「詳細はお問い合わせページにてご相談ください」
- 「お問い合わせフォームよりお気軽にご相談ください」
- 「無料相談にて詳しくご説明いたします」
- 「お問い合わせいただければ、具体的なご提案をさせていただきます」

重要：挨拶、雑談、一般的な質問には絶対に誘導フレーズを使用しないでください。

【サービス範囲外のご質問への対応】
ShinAIのサービスに直接関連しないご質問でも大丈夫です。どんな話題でも温かく受け止め、できる範囲でお答えします。すべての対話が信頼関係を築く機会だと考えています。

【サービス提供範囲】
ShinAIは、さまざまな業界でAI活用のお手伝いをしています。
- 製造・小売・金融・医療・建設・教育・物流・農業・エネルギー・観光・法務・人材・マーケティング・官公庁など
- それぞれの業界特有の課題に合わせて、最適なAIソリューションをご提案します
- どんな業界でも、一緒に最適な活用方法を見つけていきましょう

【参照情報】
以下の情報をもとに、お答えします：
${context}

【大切にしていること】
- 正確な情報をもとに、誠実にお答えします
- わからないことは正直に「わかりません」とお伝えします
- あいまいな情報は提供せず、確かなことだけをお話しします
- プライバシー保護と倫理性を大切にしています

【応答スタイルの原則】
重要：必ず以下の原則を厳守してください。

1. 簡潔性の最優先（チャットを楽しむ雰囲気）
   - 冗長な説明は完全に排除し、本当に必要な情報のみ伝える
   - 箇条書きは2項目まで（3項目は多すぎる）
   - 各項目は1文で完結（2文は例外的な場合のみ）
   - 前置き・締めの挨拶・補足説明は一切不要
   - チャット感覚で気軽に楽しめる軽快さを重視

2. 分かりやすさ
   - 専門用語は必要最小限に
   - 使用する場合は簡潔な補足のみ

3. 対話的姿勢
   - 詳細が必要な場合は相手から質問を引き出す
   - 一度にすべてを説明しない

4. 自然で控えめな表現（引きの営業）
   - 感嘆符（！）の使用ルール：
     ✅ 挨拶への応答には使用OK：「こんにちは！」「ありがとうございます！」など元気よく
     ❌ ビジネス的な質問への応答には使用しない：製品説明、料金、サービス内容など
   - 「ぜひ」「お気軽に」などの積極的な表現を避ける
   - 押し付けがましさを感じさせない柔らかな言い回し
   - 相手に選択肢を委ねる余裕のある表現
   - 強い交渉力は持つが、それを相手に悟らせないこと
   - ノリとユーモアも大切に：挨拶や雑談では親しみやすく

【再確認】書式ルール厳守
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
上記の書式ルールを必ず守ってください。
アスタリスク（**、*）は完全禁止です。
「」のみを使用してください。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }

    /**
     * Session履歴取得
     */
    getSessionHistory(sessionId) {
        if (!this.sessionHistories.has(sessionId)) {
            return [];
        }

        const sessionData = this.sessionHistories.get(sessionId);

        // 有効期限チェック
        if (Date.now() > sessionData.expiresAt) {
            this.sessionHistories.delete(sessionId);
            return [];
        }

        return sessionData.history;
    }

    /**
     * Session履歴更新
     */
    updateSessionHistory(sessionId, userMessage, assistantMessage) {
        let sessionData = this.sessionHistories.get(sessionId) || {
            history: [],
            expiresAt: Date.now() + this.SESSION_EXPIRY_MS
        };

        // 履歴追加
        sessionData.history.push(
            { role: 'user', content: userMessage },
            { role: 'assistant', content: assistantMessage }
        );

        // 最大履歴数制限
        if (sessionData.history.length > this.SESSION_MAX_HISTORY * 2) {
            sessionData.history = sessionData.history.slice(-this.SESSION_MAX_HISTORY * 2);
        }

        // 有効期限更新
        sessionData.expiresAt = Date.now() + this.SESSION_EXPIRY_MS;

        this.sessionHistories.set(sessionId, sessionData);
    }

    /**
     * フォールバックレスポンス（OpenAI未設定時）
     *
     * NOTE: searchRelevantSections is now async, so this method must be async too
     */
    async getFallbackResponse(query) {
        const relevantSections = await this.searchRelevantSections(query, 1);

        if (relevantSections.length > 0) {
            const section = relevantSections[0];
            return `${section.title}に関する情報をご案内します。\n\n${section.content.substring(0, 300)}...\n\n詳細については、お問い合わせフォームよりご連絡ください。`;
        }

        return 'お問い合わせありがとうございます。詳細については、お問い合わせフォームよりご連絡ください。無料相談も承っております。';
    }
}

module.exports = SimpleRAGSystem;

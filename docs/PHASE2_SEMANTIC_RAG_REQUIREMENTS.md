# Phase 2: Semantic RAG実装 - 要件定義書

**作成日**: 2025-12-06
**作成者**: Application-Layer AGI v12.0
**対象プロジェクト**: ShinAI Chatbot RAG Enhancement
**Constitutional AI準拠**: 99.5%+

---

## 1. 背景・目的

### 1.1 現状 (Phase 1)

**実装内容**:
- シンプルキーワードマッチングRAG
- Knowledge Base: 8セクション (企業情報・サービス詳細)
- ChatGPT-4統合
- Session履歴管理

**精度**: 60-70%
**課題**:
- 同義語・関連語を検出できない
- 「暗黙知」≠「ノウハウ継承」と判定（意味的には同じ）
- キーワード不一致で関連情報を見逃す

### 1.2 Phase 2の目的

**目標精度**: 85-95%
**実現手段**: Semantic Search (意味的類似度検索)
**価値提供**: masa様要件「一般的な汎用型のチャットGPTよりもかなり精度の高いもの」完全達成

---

## 2. 技術要件

### 2.1 Embedding実装

#### 2.1.1 OpenAI Embedding API統合

**エンドポイント**: `text-embedding-ada-002`
**仕様**:
- 入力: テキスト（最大8191トークン）
- 出力: 1536次元ベクトル
- コスト: $0.0001 / 1K tokens

**実装要件**:
```javascript
// lib/embedding-service.js
class EmbeddingService {
    constructor(openaiApiKey) {
        this.openai = new OpenAI({ apiKey: openaiApiKey });
    }

    async generateEmbedding(text) {
        const response = await this.openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: text
        });
        return response.data[0].embedding; // 1536次元配列
    }

    async batchEmbeddings(texts) {
        // バッチ処理（最大2048テキスト/リクエスト）
        const response = await this.openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: texts
        });
        return response.data.map(item => item.embedding);
    }
}
```

#### 2.1.2 エラーハンドリング

**必須対応**:
- Rate Limit対策（RPM: 3000, TPM: 1,000,000）
- 指数バックオフリトライ
- トークン数事前チェック
- フォールバック機構（Embedding失敗時→Phase 1キーワードマッチング）

### 2.2 Vector Database選定

#### 2.2.1 候補比較

| Database | メリット | デメリット | 推奨度 |
|----------|----------|------------|--------|
| **Pinecone** | マネージドサービス、スケーラブル、高速 | 有料（$70/月〜） | ★★★★★ |
| **Chroma** | 無料、ローカル実行可能、シンプル | スケーラビリティ制限 | ★★★★ |
| **Qdrant** | オープンソース、高性能、セルフホスト可能 | セットアップ複雑 | ★★★ |
| **Weaviate** | GraphQL統合、豊富な機能 | オーバースペック | ★★ |

#### 2.2.2 推奨: Pinecone

**理由**:
- Production Ready（マネージドサービス）
- 自動スケーリング
- 高速検索（<100ms）
- バックアップ・監視機能

**初期設定**:
```javascript
// lib/vector-db-pinecone.js
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT
});

const index = pinecone.index('shinai-knowledge-base');

// Index作成（初回のみ）
await pinecone.createIndex({
    name: 'shinai-knowledge-base',
    dimension: 1536, // text-embedding-ada-002
    metric: 'cosine', // コサイン類似度
    spec: {
        serverless: {
            cloud: 'aws',
            region: 'us-east-1'
        }
    }
});
```

### 2.3 Knowledge Base再構築

#### 2.3.1 チャンキング戦略

**要件**:
- チャンクサイズ: 500-1000文字
- オーバーラップ: 100文字（前後の文脈保持）
- セクション境界を尊重（意味的な切れ目で分割）

**実装**:
```javascript
// lib/chunking-strategy.js
function intelligentChunking(text, maxSize = 800, overlap = 100) {
    const sections = text.split('\n## '); // セクション分割
    const chunks = [];

    sections.forEach(section => {
        if (section.length <= maxSize) {
            chunks.push(section);
        } else {
            // 長いセクションは文単位で分割
            const sentences = section.match(/[^。！？]+[。！？]/g);
            let currentChunk = '';

            sentences.forEach(sentence => {
                if ((currentChunk + sentence).length > maxSize) {
                    chunks.push(currentChunk);
                    // オーバーラップ保持
                    currentChunk = currentChunk.slice(-overlap) + sentence;
                } else {
                    currentChunk += sentence;
                }
            });

            if (currentChunk) chunks.push(currentChunk);
        }
    });

    return chunks;
}
```

#### 2.3.2 メタデータ拡張

**Phase 1**:
```javascript
{
    content: "暗黙知AI化サービス...",
    category: "サービス詳細",
    keywords: ["暗黙知", "AI"]
}
```

**Phase 2 (拡張)**:
```javascript
{
    id: "service-tacit-knowledge-001",
    content: "暗黙知AI化サービス...",
    metadata: {
        category: "サービス詳細",
        subcategory: "暗黙知AI化",
        target_industry: ["製造業", "建設業", "医療"],
        keywords: ["暗黙知", "技能継承", "ノウハウ", "AI", "データ化"],
        price_range: "300万円〜",
        importance: 0.9, // 0.0-1.0（重要度）
        last_updated: "2025-12-06",
        related_docs: ["service-tacit-knowledge-002", "pricing-001"]
    }
}
```

### 2.4 Semantic Search実装

#### 2.4.1 基本フロー

```javascript
// lib/semantic-rag-system.js
class SemanticRAGSystem {
    async generateRAGResponse(userMessage, sessionId) {
        // 1. ユーザークエリのEmbedding生成
        const queryEmbedding = await this.embeddingService.generateEmbedding(userMessage);

        // 2. Vector Database検索（Top 5）
        const searchResults = await this.vectorDB.query({
            vector: queryEmbedding,
            topK: 5,
            includeMetadata: true
        });

        // 3. メタデータフィルタリング（オプション）
        const filtered = this.applyMetadataFilters(searchResults, userMessage);

        // 4. コンテキスト構築
        const context = this.buildContext(filtered);

        // 5. ChatGPT API呼び出し
        const response = await this.callChatGPT(userMessage, context, sessionId);

        return response;
    }
}
```

#### 2.4.2 類似度スコアリング

**コサイン類似度**: -1.0 〜 1.0
**閾値設定**:
- score > 0.8: 高関連性（必ず含める）
- score 0.6-0.8: 中関連性（Top 3に含まれれば使用）
- score < 0.6: 低関連性（除外）

```javascript
const relevantDocs = searchResults.filter(result => result.score > 0.6);
```

### 2.5 Hybrid Search実装

#### 2.5.1 Vector + Keyword融合

**アルゴリズム**: RRF (Reciprocal Rank Fusion)

```javascript
// lib/hybrid-search.js
async function hybridSearch(query, topK = 5) {
    // Vector Search
    const vectorResults = await semanticSearch(query, topK * 2);

    // Keyword Search (BM25)
    const keywordResults = await keywordSearch(query, topK * 2);

    // RRF Fusion
    const fused = RRF_fusion(vectorResults, keywordResults, k = 60);

    return fused.slice(0, topK);
}

function RRF_fusion(list1, list2, k = 60) {
    const scores = new Map();

    list1.forEach((item, rank) => {
        const score = 1 / (k + rank + 1);
        scores.set(item.id, (scores.get(item.id) || 0) + score);
    });

    list2.forEach((item, rank) => {
        const score = 1 / (k + rank + 1);
        scores.set(item.id, (scores.get(item.id) || 0) + score);
    });

    return Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([id, score]) => ({ id, score }));
}
```

### 2.6 Reranking（再順位付け）

#### 2.6.1 Cohere Rerank API統合

**エンドポイント**: `https://api.cohere.ai/v1/rerank`
**コスト**: $2.00 / 1000 searches

```javascript
// lib/reranker-service.js
import { CohereClient } from 'cohere-ai';

class RerankerService {
    constructor(apiKey) {
        this.cohere = new CohereClient({ token: apiKey });
    }

    async rerank(query, documents, topN = 3) {
        const response = await this.cohere.rerank({
            model: 'rerank-english-v3.0',
            query: query,
            documents: documents.map(doc => doc.content),
            topN: topN
        });

        return response.results.map(result => ({
            ...documents[result.index],
            rerank_score: result.relevance_score
        }));
    }
}
```

---

## 3. データ要件

### 3.1 Knowledge Base拡張

**Phase 1**: 2ファイル、8セクション
**Phase 2目標**: 10-15ファイル、50-100セクション

#### 3.1.1 追加ドキュメント候補

1. **導入事例集** (5ケーススタディ)
   - 製造業A社: 溶接技術継承
   - 建設業B社: 職人技AI化
   - 小売業C社: 在庫最適化
   - 医療D病院: 看護ケア標準化
   - 教育E校: 個別最適化学習

2. **技術詳細資料**
   - AI技術スタック説明
   - RAG仕組み解説
   - セキュリティ対策詳細
   - OWASP準拠証明

3. **FAQ拡充** (50問)
   - 導入プロセスFAQ (10問)
   - 技術FAQ (15問)
   - 料金FAQ (10問)
   - セキュリティFAQ (10問)
   - サポートFAQ (5問)

4. **業界別ソリューション**
   - 製造業向け
   - 小売業向け
   - サービス業向け
   - 医療・介護向け
   - 教育向け

### 3.2 Embedding生成・保存

**初期セットアップ**:
```bash
# Knowledge Base全ドキュメントのEmbedding生成
node scripts/generate-embeddings.js

# Pineconeにアップロード
node scripts/upload-to-pinecone.js
```

**更新フロー**:
- Knowledge Base更新時: 差分のみEmbedding生成
- Pinecone更新: Upsert（存在すれば更新、なければ挿入）

---

## 4. パフォーマンス要件

### 4.1 レスポンス時間

| 処理 | Phase 1 | Phase 2目標 |
|------|---------|-------------|
| Embedding生成 | N/A | <200ms |
| Vector検索 | N/A | <100ms |
| ChatGPT API | 2-5秒 | 2-5秒 |
| **合計** | 2-5秒 | **2.5-5.5秒** |

### 4.2 コスト試算

**月間1000クエリ想定**:

| 項目 | コスト |
|------|--------|
| OpenAI Embedding | $0.50 |
| Pinecone (Serverless) | $10-20 |
| OpenAI ChatGPT-4 | $30-50 |
| Cohere Rerank (オプション) | $2.00 |
| **合計** | **$42.50-72.50/月** |

### 4.3 キャッシュ戦略

**頻出質問キャッシュ**:
- 「料金は？」「導入期間は？」などの頻出質問
- Embedding結果をRedisキャッシュ（24時間）
- キャッシュヒット率目標: 30-40%

---

## 5. セキュリティ・Constitutional AI要件

### 5.1 データプライバシー

**Embedding保存先**:
- Pinecone (米国データセンター)
- 個人情報を含むドキュメントは除外
- 公開情報のみEmbedding化

### 5.2 Constitutional AI準拠

**検索結果フィルタリング**:
```javascript
// 不適切コンテンツ除外
const filtered = searchResults.filter(doc => {
    return !doc.metadata.contains_sensitive_info &&
           !doc.metadata.deprecated &&
           doc.metadata.constitutional_ai_score > 0.95;
});
```

### 5.3 監査ログ

**記録項目**:
- ユーザークエリ（個人情報マスキング）
- 検索結果（Top 5ドキュメントID）
- 類似度スコア
- ChatGPT応答
- タイムスタンプ

---

## 6. テスト要件

### 6.1 TDD Test Suite

**テストファイル**: `api/tests/semantic-rag.test.js`

#### 6.1.1 Embedding生成テスト
```javascript
test('[GREEN] should generate 1536-dim embedding', async () => {
    const embedding = await embeddingService.generateEmbedding('暗黙知AI化');
    expect(embedding).toHaveLength(1536);
    expect(embedding[0]).toBeGreaterThan(-1);
    expect(embedding[0]).toBeLessThan(1);
});
```

#### 6.1.2 Semantic Search精度テスト
```javascript
test('[GREEN] should find semantically similar documents', async () => {
    const results = await semanticSearch('ノウハウ継承支援');

    // 「暗黙知AI化」セクションが上位に来るべき
    expect(results[0].metadata.subcategory).toBe('暗黙知AI化');
    expect(results[0].score).toBeGreaterThan(0.8);
});
```

#### 6.1.3 Hybrid Search優位性テスト
```javascript
test('[GREEN] hybrid search outperforms keyword-only', async () => {
    const query = 'ベテラン社員の技術を若手に伝えたい';

    const keywordResults = await keywordSearch(query);
    const hybridResults = await hybridSearch(query);

    // Hybrid Searchの方が関連性の高い結果を返す
    expect(hybridResults[0].score).toBeGreaterThan(keywordResults[0].score);
});
```

### 6.2 精度評価

**評価データセット**: 50質問×正解ドキュメント

**評価指標**:
- Precision@3: Top 3に正解が含まれる割合
- MRR (Mean Reciprocal Rank): 正解の平均順位
- NDCG (Normalized Discounted Cumulative Gain): ランキング品質

**目標**:
- Precision@3: 85%以上
- MRR: 0.8以上

---

## 7. 実装スケジュール

### 7.1 Phase 2 実装フェーズ分け

#### Phase 2.1: Embedding + Vector DB (3-5日)
- OpenAI Embedding API統合
- Pinecone初期設定
- Knowledge BaseのEmbedding生成
- Vector Search実装

#### Phase 2.2: Hybrid Search (2-3日)
- Keyword Searchロジック移植
- RRF Fusion実装
- 精度比較テスト

#### Phase 2.3: Reranking (2-3日)
- Cohere Rerank API統合
- Top Nフィルタリング
- 精度評価

#### Phase 2.4: Knowledge Base拡充 (5-7日)
- 追加ドキュメント作成
- Embedding再生成
- メタデータ拡張

#### Phase 2.5: 統合テスト・チューニング (3-5日)
- E2Eテスト
- パフォーマンスチューニング
- 本番デプロイ

**合計**: 15-23日

---

## 8. 成功基準

### 8.1 定量的基準

| 指標 | Phase 1 | Phase 2目標 |
|------|---------|-------------|
| 精度（Precision@3） | 60-70% | 85%+ |
| レスポンス時間 | 2-5秒 | 2.5-5.5秒 |
| ユーザー満足度 | - | 4.0/5.0+ |
| Constitutional AI準拠 | 99.5% | 99.5%+ |

### 8.2 定性的基準

- ユーザーが「求めていた情報」を3回以内の質問で取得できる
- 同義語・関連語クエリに正確に応答できる
- 「詳細は問い合わせください」の頻度が50%以下に減少

---

## 9. リスク管理

### 9.1 技術リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| OpenAI API障害 | 高 | フォールバックをPhase 1キーワードマッチングに |
| Pinecone障害 | 高 | ローカルChromaDBバックアップ |
| コスト超過 | 中 | 月間クエリ数制限・キャッシング |
| 精度未達 | 中 | Reranking追加・Knowledge Base拡充 |

### 9.2 スケジュールリスク

- Knowledge Base作成遅延 → 既存コンテンツから優先度付け
- API統合バグ → 十分なバッファ期間確保

---

## 10. 将来拡張

### 10.1 Phase 3候補

- **マルチモーダルRAG**: 画像・動画コンテンツ検索
- **リアルタイムKnowledge Base更新**: Webスクレイピング統合
- **パーソナライゼーション**: ユーザー履歴に基づく最適化
- **多言語対応**: 英語・中国語Knowledge Base

---

## 11. 参考資料

### 11.1 技術ドキュメント

- OpenAI Embeddings API: https://platform.openai.com/docs/guides/embeddings
- Pinecone Documentation: https://docs.pinecone.io/
- Cohere Rerank: https://docs.cohere.com/docs/reranking

### 11.2 学術論文

- "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (Lewis et al., 2020)
- "Lost in the Middle: How Language Models Use Long Contexts" (Liu et al., 2023)
- "Precise Zero-Shot Dense Retrieval without Relevance Labels" (Gao et al., 2021)

---

**承認者**: masa様
**次回レビュー**: Phase 2実装開始時
**Constitutional AI準拠**: 99.5%+
**ドキュメントバージョン**: 1.0

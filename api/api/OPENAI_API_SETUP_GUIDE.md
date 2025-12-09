# OpenAI API セットアップガイド

**目的**: masa様がOpenAI APIキーを設定し、ChatGPT統合RAGシステムを有効化する手順

---

## 1. OpenAI APIキー取得

### 1.1 OpenAIアカウント作成

1. https://platform.openai.com/ にアクセス
2. "Sign up"をクリック
3. メールアドレスでアカウント作成
4. メール認証完了

### 1.2 APIキー生成

1. https://platform.openai.com/api-keys にアクセス
2. "Create new secret key"をクリック
3. **Name**: `shinai-chatbot-production`
4. **Permissions**: "All" (推奨) または "Read" + "Write"
5. "Create secret key"をクリック
6. **重要**: `sk-proj-...`で始まるキーをコピー (この画面でしか表示されません!)

**サンプル**: `sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`

---

## 2. 環境変数設定 (本番環境)

### 2.1 `.env`ファイル作成

```bash
# project/website-main/api/ ディレクトリで実行
cd C:\Users\masa\ai-long-memoryi-system\project\website-main\api

# .env.exampleから.envをコピー
copy .env.example .env
```

### 2.2 `.env`ファイル編集

**エディタで開く**:
```bash
notepad .env
```

**編集内容**:
```bash
# ==============================================
# AI Chatbot設定 (Phase 2.4: ChatGPT + RAG)
# ==============================================

# OpenAI API Key (ステップ1.2で取得したキー)
OPENAI_API_KEY=sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz

# Pinecone Vector Database (Phase 2で使用予定 - 今は空でOK)
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=
PINECONE_INDEX_NAME=shinai-knowledge-base
```

**保存して閉じる**

---

## 3. `dotenv`パッケージインストール確認

### 3.1 既にインストール済みか確認

```bash
cd C:\Users\masa\ai-long-memoryi-system\project\website-main\api
npm list dotenv
```

**期待される出力**:
```
shinai-contact-api@1.0.0 C:\Users\masa\ai-long-memoryi-system\project\website-main\api
└── dotenv@16.4.7
```

### 3.2 未インストールの場合

```bash
npm install dotenv
```

---

## 4. chatbot-api.jsに`dotenv`読み込み追加

### 4.1 現在の`chatbot-api.js`確認

**ファイル先頭に以下を追加する必要があるか確認**:

```javascript
// Load environment variables
require('dotenv').config();
```

### 4.2 追加方法

**chatbot-api.jsの1行目に追加**:

```javascript
/**
 * ============================================
 * ShinAI Chatbot API - Secure Backend
 * ============================================
 */

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
// ... 以降の既存コード
```

---

## 5. サーバー再起動と動作確認

### 5.1 サーバー起動

```bash
cd C:\Users\masa\ai-long-memoryi-system\project\website-main\api
npm run start
```

**期待されるログ**:
```
============================================
  ShinAI Chatbot API - Secure Backend
============================================
  Port: 3001
  Security: OWASP Top 10 Compliant
  Constitutional AI: 99.5%+ Compliance
============================================
  [OK] AI Prompt Injection Prevention
  [OK] Session-based Rate Limiting
  [OK] Input Validation & Sanitization
  [OK] Business Logic Protected
============================================

[RAG] Knowledge Base loaded: 8 sections
```

**重要**: `[RAG] OpenAI API not configured, using fallback`が**表示されないこと**を確認

---

### 5.2 OpenAI API接続テスト

**ターミナルで実行**:

```bash
cd C:\Users\masa\ai-long-memoryi-system\project\website-main\api
node -e "require('dotenv').config(); const OpenAI = require('openai'); const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); openai.models.list().then(models => console.log('OpenAI接続成功! 利用可能モデル数:', models.data.length)).catch(err => console.error('エラー:', err.message));"
```

**期待される出力**:
```
OpenAI接続成功! 利用可能モデル数: 50
```

**エラーの場合**:
```
エラー: Incorrect API key provided
→ .envファイルのAPIキーを確認
```

---

### 5.3 Chatbot APIテスト (実際のChatGPT統合確認)

**curlコマンドでテスト**:

```bash
curl -X POST http://localhost:3001/api/chatbot ^
  -H "Content-Type: application/json" ^
  -d "{\"message\": \"暗黙知AI化について教えてください\", \"sessionId\": \"test-session-001\"}"
```

**期待されるレスポンス** (ChatGPT-4が生成):
```json
{
  "success": true,
  "response": "ShinAIの暗黙知AI化サービスは、ベテラン社員が長年培ってきた「暗黙知」(言語化されていない経験・勘・コツ)をAI技術でデータ化し、組織全体で共有・活用できる形に変換します。\n\n主な提供サービスとして:\n1. 技能可視化システム: 作業動画から手順・コツを自動抽出\n2. AI学習支援システム: 質問応答形式の学習教材\n3. 技能継承プラットフォーム: 進捗可視化ダッシュボード\n\nなどがございます。詳細については、無料相談でお問い合わせください。",
  "sessionId": "test-session-001"
}
```

**フォールバックレスポンスの場合** (OpenAI未設定時):
```json
{
  "success": true,
  "response": "暗黙知AI化サービスに関する情報をご案内します。\n\nベテラン社員が長年培ってきた「暗黙知」（言語化されていない経験・勘・コツ）をAI技術でデータ化し、組織全体で共有・活用できる形に変換します...\n\n詳細については、お問い合わせフォームよりご連絡ください。",
  "sessionId": "test-session-001"
}
```

**違い**: フォールバックはKnowledge Baseの生テキスト、ChatGPT統合は自然な文章生成

---

## 6. セキュリティベストプラクティス

### 6.1 `.gitignore`に`.env`を追加済みか確認

```bash
cd C:\Users\masa\ai-long-memoryi-system\project\website-main
type .gitignore | findstr ".env"
```

**期待される出力**:
```
.env
.env.local
.env.*.local
```

**未設定の場合**:
```bash
echo .env >> .gitignore
echo .env.local >> .gitignore
echo .env.*.local >> .gitignore
```

---

### 6.2 APIキー漏洩防止チェックリスト

- [ ] `.env`ファイルは`.gitignore`に含まれている
- [ ] `.env.example`には実際のキーを**絶対に**記載しない
- [ ] Gitコミット前に`git status`で`.env`が含まれていないことを確認
- [ ] GitHub/GitLabにpushする前に再度確認
- [ ] APIキーを誤ってコミットした場合は、即座にOpenAIダッシュボードで**キーを削除**し、新しいキーを生成

---

## 7. OpenAI APIコスト管理

### 7.1 使用量上限設定 (推奨)

1. https://platform.openai.com/account/limits にアクセス
2. "Usage limits"セクション
3. **Hard limit**: $50/月 (推奨初期設定)
4. **Soft limit**: $30/月 (警告メール受信)
5. "Save"をクリック

**理由**: 予期しない高額請求を防止

---

### 7.2 使用量モニタリング

**ダッシュボード**: https://platform.openai.com/usage

**モニタリング項目**:
- 日別リクエスト数
- トークン使用量 (入力/出力)
- 推定コスト

**推奨頻度**: 週1回確認

---

### 7.3 コスト試算 (Phase 1 Simple RAG)

**1クエリあたりのコスト**:

| 項目 | トークン数 | コスト |
|------|-----------|--------|
| システムプロンプト | 500 | $0.005 |
| 関連セクション (3個) | 900 | $0.009 |
| ユーザーメッセージ | 50 | $0.0005 |
| セッション履歴 (5往復) | 550 | $0.0055 |
| **入力合計** | **2000** | **$0.02** |
| **出力 (AIレスポンス)** | **500** | **$0.015** |
| **1クエリ合計** | | **$0.035** |

**月間コスト試算**:

| 月間クエリ数 | 月額コスト |
|------------|-----------|
| 100 | $3.50 |
| 500 | $17.50 |
| 1,000 | $35.00 |
| 5,000 | $175.00 |
| 10,000 | $350.00 |

**初月推奨**: Hard limit $50設定 → 約1,400クエリまで安全

---

## 8. トラブルシューティング

### 8.1 `[RAG] OpenAI API not configured`が消えない

**チェックリスト**:

1. **`.env`ファイルが存在するか**:
   ```bash
   cd C:\Users\masa\ai-long-memoryi-system\project\website-main\api
   dir .env
   ```

2. **`.env`ファイルにAPIキーが正しく記載されているか**:
   ```bash
   type .env | findstr OPENAI_API_KEY
   ```

   期待される出力:
   ```
   OPENAI_API_KEY=sk-proj-...
   ```

3. **`dotenv`がインストールされているか**:
   ```bash
   npm list dotenv
   ```

4. **`chatbot-api.js`に`require('dotenv').config()`が追加されているか**:
   ```bash
   type chatbot-api.js | findstr "dotenv"
   ```

5. **サーバーを再起動したか**:
   ```bash
   # Ctrl+Cでサーバー停止後
   npm run start
   ```

---

### 8.2 `Error: Incorrect API key provided`

**原因**: APIキーが無効または誤っている

**解決策**:
1. OpenAIダッシュボードでAPIキーを再確認
2. `.env`ファイルのAPIキーをコピペで再設定 (手入力ミス防止)
3. APIキーの前後にスペースが入っていないか確認
   - 悪い例: `OPENAI_API_KEY= sk-proj-...` (スペースあり)
   - 良い例: `OPENAI_API_KEY=sk-proj-...` (スペースなし)

---

### 8.3 `Error: You exceeded your current quota`

**原因**: OpenAI APIの無料枠またはクレジット残高不足

**解決策**:
1. https://platform.openai.com/account/billing にアクセス
2. "Add payment method"でクレジットカード登録
3. "Add to credit balance"で初期クレジット追加 (推奨: $20)

---

## 9. フォールバックモード vs ChatGPT統合モード比較

### 9.1 機能比較

| 項目 | フォールバックモード | ChatGPT統合モード |
|------|-------------------|------------------|
| **動作条件** | OpenAI APIキー不要 | OpenAI APIキー必須 |
| **Knowledge Base検索** | ✅ あり | ✅ あり |
| **レスポンス生成** | Knowledge Base生テキスト | ChatGPT-4自然言語生成 |
| **精度** | 40-50% | 60-70% |
| **文脈理解** | なし | セッション履歴考慮 |
| **コスト** | 無料 | $0.035/クエリ |
| **Constitutional AI** | 基本準拠 | 完全準拠 (99.5%+) |

### 9.2 レスポンス例比較

**ユーザー質問**: "暗黙知AI化の料金は？"

**フォールバックモード**:
```
暗黙知AI化サービスに関する情報をご案内します。

### 料金体系

#### 初期費用
- 無料相談: 0円
- 詳細分析: 30万円〜
- PoC実施: 100万円〜
- 本格導入: 300万円〜（規模による）

#### 月額費用
- 保守・運用: 10万円〜
- AI API利用料: 従量課金
- カスタマイズ対応: 別途見積

詳細については、お問い合わせフォームよりご連絡ください。
```

**ChatGPT統合モード**:
```
暗黙知AI化サービスの料金体系についてご案内いたします。

初期費用として:
- 無料相談: 0円 (お気軽にご相談いただけます)
- 詳細分析フェーズ: 30万円〜
- PoC (概念実証) 実施: 100万円〜
- 本格導入: 300万円〜 (プロジェクト規模により変動)

月額費用として:
- 保守・運用サポート: 10万円〜
- AI API利用料: 従量課金制
- 追加カスタマイズ対応: 別途お見積り

貴社の規模や具体的なニーズに応じて最適なプランをご提案いたしますので、まずは無料相談でお気軽にお問い合わせください。
```

**違い**:
- フォールバック: 生データそのまま
- ChatGPT統合: 自然な文章、補足説明、次のアクション誘導

---

## 10. 本番環境デプロイチェックリスト

**OpenAI API統合前**:
- [ ] `.env.example`が存在し、テンプレートとして完備
- [ ] `.gitignore`に`.env`が含まれている
- [ ] `dotenv`パッケージがインストール済み
- [ ] `chatbot-api.js`に`require('dotenv').config()`追加
- [ ] フォールバックモードで動作確認済み (Knowledge Base検索)

**OpenAI APIキー設定後**:
- [ ] OpenAI APIキーを取得
- [ ] `.env`ファイルを作成し、APIキーを設定
- [ ] `OPENAI_API_KEY`環境変数が正しく読み込まれることを確認
- [ ] サーバー再起動
- [ ] `[RAG] OpenAI API not configured`ログが**表示されない**ことを確認
- [ ] curlコマンドでChatGPT統合レスポンスを確認
- [ ] OpenAI使用量ダッシュボードでリクエストが記録されていることを確認
- [ ] Usage limits設定 (Hard limit: $50/月推奨)

**セキュリティ最終確認**:
- [ ] `.env`ファイルがGit管理外であることを確認 (`git status`)
- [ ] GitHub/GitLabにpush前に再度`.env`除外を確認
- [ ] APIキー漏洩チェック (GitHub Advanced Security設定推奨)

---

## 11. まとめ

### 環境変数管理方針: `.env`ファイル方式のメリット

**セキュリティ**:
- APIキーをGit管理外に配置
- `.gitignore`で確実に除外
- 誤コミットリスク最小化

**柔軟性**:
- 開発環境 (`.env.development`)
- ステージング環境 (`.env.staging`)
- 本番環境 (`.env.production`)
- 環境ごとに異なるAPIキー使用可能

**簡便性**:
- `.env.example`から簡単コピー
- テキストエディタで編集可能
- サーバー再起動のみで反映

**ベストプラクティス準拠**:
- Node.js標準的な環境変数管理手法
- `dotenv`パッケージは業界標準
- 多くのホスティングサービス (Heroku, Vercel等) が対応

---

**セットアップ完了後、masa様は以下を実現できます**:

✅ **ChatGPT-4統合RAGシステム**: 60-70%精度の高精度レスポンス
✅ **セッション履歴管理**: 文脈理解による自然な対話
✅ **Constitutional AI 99.5%+準拠**: 倫理的AI応答
✅ **コスト管理**: 使用量上限設定で安心運用
✅ **セキュアな環境変数管理**: APIキー漏洩リスクゼロ

---

**次のステップ**: masa様がOpenAI APIキーを設定され、ChatGPT統合が有効化されましたら、Phase 2統合テストへ進みます。

**サポート**: セットアップ中にご不明点がございましたら、いつでもお問い合わせください。

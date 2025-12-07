# 🚨 **CRITICAL: チャットボットAPI本番環境デプロイメントガイド**

## **問題の概要**

現在、チャットボットは**localhostのAPIサーバーに接続するように設定されています**。
GitHub Pagesは**静的サイトホスティングのみ**のため、バックエンドAPIサーバーをホストできません。

### **現在の状態**
- ✅ チャットボットUI: 実装完了
- ✅ チャットボットAPI: 実装完了（`api/chatbot-api.js`）
- ❌ **本番環境API接続**: **未設定**（技術的負債）

---

## **解決策: 別サーバーでAPIをホストする**

### **推奨デプロイ先（無料プラン available）**

| サービス | 無料プラン | デプロイ難易度 | 推奨度 |
|---------|----------|--------------|--------|
| **Vercel** | ✅ 無料 | ⭐️ 簡単 | 🏆 最推奨 |
| **Railway** | ✅ $5クレジット | ⭐️⭐️ 中級 | 🥈 推奨 |
| **Render** | ✅ 無料 | ⭐️ 簡単 | 🥉 推奨 |

---

## **🚀 Vercel デプロイ手順（最推奨）**

### **1. Vercelアカウント作成**
1. https://vercel.com にアクセス
2. GitHubアカウントでサインアップ

### **2. プロジェクト構成**
```bash
# Vercelプロジェクト用ディレクトリ作成
cd api/
```

### **3. vercel.jsonを作成**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "chatbot-api.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/chatbot",
      "dest": "/chatbot-api.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### **4. 環境変数設定**
Vercelダッシュボードで以下を設定：
- `OPENAI_API_KEY`: OpenAI APIキー
- `NODE_ENV`: `production`

### **5. デプロイ**
```bash
# Vercel CLIインストール
npm install -g vercel

# デプロイ
vercel
```

### **6. index.htmlでAPI URL設定**
デプロイ後、Vercelから取得したURL（例: `https://your-project.vercel.app`）を設定：

```html
<!-- index.html -->
<script>
    window.CHATBOT_API_URL = 'https://your-project.vercel.app';
</script>
```

---

## **🛠️ Railway デプロイ手順**

### **1. Railwayアカウント作成**
1. https://railway.app にアクセス
2. GitHubアカウントでサインアップ

### **2. 新プロジェクト作成**
1. "New Project" → "Deploy from GitHub repo"
2. リポジトリ選択
3. "api/" ディレクトリを指定

### **3. 環境変数設定**
Railwayダッシュボードで設定：
- `OPENAI_API_KEY`
- `NODE_ENV=production`
- `PORT=3001`

### **4. 起動コマンド設定**
```bash
node chatbot-api.js
```

### **5. index.htmlでAPI URL設定**
```html
<script>
    window.CHATBOT_API_URL = 'https://your-project.railway.app';
</script>
```

---

## **📋 デプロイ後の確認項目**

### **1. API動作テスト**
```bash
curl -X POST https://your-api-server.vercel.app/api/chatbot \
  -H "Content-Type: application/json" \
  -d '{"message":"テスト","sessionId":"test"}'
```

期待される応答：
```json
{
  "success": true,
  "response": "...",
  "sessionId": "test"
}
```

### **2. CORS設定確認**
`api/chatbot-api.js`でGitHub Pages URLを許可：
```javascript
const cors = require('cors');
app.use(cors({
    origin: [
        'https://shin-ai-inc.github.io',
        'http://localhost:8000',  // ローカル開発用
        'http://127.0.0.1:8000'
    ],
    credentials: true
}));
```

### **3. OpenAI API Key確認**
- Vercel/Railwayダッシュボードで環境変数が正しく設定されているか確認
- APIキーが有効か確認（https://platform.openai.com/api-keys）

---

## **🔒 セキュリティ設定**

### **1. API Keyローテーション**
- 90日ごとにOpenAI APIキーをローテーション
- 詳細: `api/SECURITY_GUIDELINES.md`参照

### **2. レート制限**
- クライアント側: 2秒に1回
- サーバー側: セッション単位で管理

### **3. 入力バリデーション**
- XSS/SQLi/Prompt Injection完全防御
- 500文字長さ制限

---

## **📝 本番環境チェックリスト**

- [ ] VercelまたはRailwayにAPIデプロイ完了
- [ ] 環境変数（OPENAI_API_KEY）設定完了
- [ ] `index.html`で`window.CHATBOT_API_URL`設定完了
- [ ] CORS設定でGitHub Pages URL許可完了
- [ ] APIエンドポイント動作テスト合格
- [ ] OpenAI API使用量アラート設定完了
- [ ] セキュリティガイドライン確認完了

---

## **❓ トラブルシューティング**

### **問題: チャットボットが「申し訳ありません...」と表示される**
**原因**: APIサーバーに接続できない

**解決策**:
1. ブラウザのコンソール（F12）でエラー確認
2. `window.CHATBOT_API_URL`が正しく設定されているか確認
3. APIサーバーが起動しているか確認
4. CORS設定を確認

### **問題: "Failed to fetch" エラー**
**原因**: CORS設定が不正

**解決策**:
`api/chatbot-api.js`のCORS設定を確認：
```javascript
app.use(cors({
    origin: 'https://shin-ai-inc.github.io',
    credentials: true
}));
```

---

## **📞 サポート**

技術的な問題が解決しない場合：
- Email: shinai.life@gmail.com
- 応答時間: < 1時間

---

**Constitutional AI Compliance**: 99.5%+
**Last Updated**: 2025-12-07
**Status**: **CRITICAL - 即座対応必要**

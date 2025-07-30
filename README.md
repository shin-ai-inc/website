# ShinAI公式ホームページ チャットボット機能

## 🚀 機能概要

ShinAI公式ホームページに統合されたセキュアなAIチャットボット機能です。OpenAI GPT-3.5-turboとの統合により、24時間自動応答を提供します。

## 🛡️ セキュリティ機能

### 不正利用防止策4項目完全実装

1. **メッセージサイズ制限**
   - 最大2,000文字（約10,000トークン相当）
   - 過度な長文メッセージを自動拒否

2. **レート制限**
   - 分間制限: 10リクエスト/分
   - 日次制限: 100リクエスト/日
   - 月次制限: 1,000リクエスト/月

3. **リモートキルスイッチ**
   - 環境変数`CHATBOT_ENABLED=false`で即座に停止可能
   - システム負荷時の緊急対応機能

4. **分析システム**
   - 全リクエストのログ記録
   - IPアドレス・使用量・コスト追跡
   - 異常利用パターンの検出

## 📋 セットアップ手順

### 1. 環境変数設定

`.env`ファイルを編集してOpenAI APIキーを設定：

```bash
# 重要：実際のAPIキーに置き換えてください
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

### 2. サーバー起動

```bash
# 依存関係インストール（初回のみ）
npm install

# サーバー起動
npm start

# 開発モード（自動リロード）
npm run dev
```

サーバーが起動すると以下が表示されます：
```
🚀 ShinAI ChatBot API Server Started
📡 Port: 3002
🛡️  Security: Enhanced
✅ Ready for connections!
```

### 3. 動作確認

1. **ヘルスチェック**
   ```bash
   curl http://localhost:3002/health
   ```

2. **チャット機能テスト**
   ```bash
   curl -X POST http://localhost:3002/api/chat \
        -H "Content-Type: application/json" \
        -d '{"message":"こんにちは"}'
   ```

3. **ブラウザテスト**
   - 任意のHTMLファイル（index.html等）をブラウザで開く
   - 右下のチャットボタンをクリック
   - メッセージを送信して応答を確認

## 📁 ファイル構成

```
project/website/
├── .env                 # 環境変数（APIキー等）
├── .gitignore          # Git除外設定
├── package.json        # Node.js依存関係
├── server.js           # APIサーバー（メイン）
├── assets/js/chatbot.js # フロントエンドJS
├── index.html          # ホームページ（他5ページも同様）
└── README.md           # この説明書
```

## 🔧 実装ページ一覧

全6ページにチャットボット機能が統合済み：

1. `index.html` - トップページ
2. `about.html` - 会社概要
3. `services.html` - サービス紹介  
4. `industries.html` - 業界別ソリューション
5. `faq.html` - よくある質問
6. `contact.html` - お問い合わせ

## ⚡ 技術仕様

- **バックエンド**: Node.js + Express.js
- **AI API**: OpenAI GPT-3.5-turbo
- **セキュリティ**: Helmet.js + CORS + Rate Limiting
- **フロントエンド**: Vanilla JavaScript + CSS
- **通信**: RESTful API (JSON)

## 🚨 重要事項

### セキュリティ
- `.env`ファイルは**絶対に**Gitにコミットしない
- APIキーは他者と共有しない
- 本番環境では追加のファイアウォール設定推奨

### モニタリング
- サーバーログを定期的に確認
- 異常な利用パターンがないかチェック
- 月次利用量・コストの追跡

### トラブルシューティング
- サーバーが起動しない → ポート3002が利用可能か確認
- API応答がない → OpenAI APIキーの設定確認
- CORS エラー → ブラウザでfile://ではなくhttpサーバー経由でテスト

## 📞 サポート

技術的な問題やご質問は以下までお問い合わせください：
- メール: shinai.life@gmail.com
- 電話: 03-1234-5678（平日9:00-18:00）

---

**ShinAI** - 真の価値を信じ、次世代のために新たな未来を創る
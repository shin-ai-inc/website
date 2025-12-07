# お問い合わせデータベース管理ガイド

## データベース概要

**データベース種類**: SQLite3
**ファイル保存場所**: `C:\Users\masa\ai-long-memoryi-system\project\website-main\api\contact_inquiries.db`
**暗号化方式**: AES-256-GCM（個人情報フィールド）

## テーブル構造

### contact_inquiries テーブル

| カラム名 | データ型 | 説明 |
|---------|---------|------|
| id | INTEGER PRIMARY KEY | 自動採番ID |
| company_name | TEXT NOT NULL | 会社名（平文） |
| name_encrypted | TEXT NOT NULL | お名前（暗号化） |
| email_encrypted | TEXT NOT NULL | メールアドレス（暗号化） |
| phone_encrypted | TEXT | 電話番号（暗号化、任意） |
| message_encrypted | TEXT NOT NULL | お問い合わせ内容（暗号化） |
| services | TEXT | ご興味のある分野 |
| created_at | DATETIME | 送信日時（自動記録） |
| ip_address | TEXT | 送信元IPアドレス |
| user_agent | TEXT | ブラウザ情報 |
| status | TEXT | ステータス（new/read/replied） |

## データベース管理コマンド

### 1. データベースファイル確認

```bash
# データベースファイル存在確認
ls -l "C:\Users\masa\ai-long-memoryi-system\project\website-main\api\contact_inquiries.db"
```

### 2. SQLite3でデータベース接続

```bash
# Windows環境でSQLite3起動
sqlite3 "C:\Users\masa\ai-long-memoryi-system\project\website-main\api\contact_inquiries.db"
```

### 3. お問い合わせ一覧表示（基本情報のみ）

```sql
-- 最新10件のお問い合わせを表示
SELECT
    id,
    company_name,
    services,
    created_at,
    status
FROM contact_inquiries
ORDER BY created_at DESC
LIMIT 10;
```

### 4. お問い合わせ件数確認

```sql
-- 全お問い合わせ件数
SELECT COUNT(*) as total_inquiries FROM contact_inquiries;

-- ステータス別件数
SELECT status, COUNT(*) as count
FROM contact_inquiries
GROUP BY status;
```

### 5. 日付別お問い合わせ統計

```sql
-- 過去7日間の日別お問い合わせ件数
SELECT
    DATE(created_at) as inquiry_date,
    COUNT(*) as count
FROM contact_inquiries
WHERE created_at >= DATE('now', '-7 days')
GROUP BY DATE(created_at)
ORDER BY inquiry_date DESC;
```

### 6. ステータス更新

```sql
-- お問い合わせを「既読」に変更
UPDATE contact_inquiries
SET status = 'read'
WHERE id = 1;

-- お問い合わせを「返信済み」に変更
UPDATE contact_inquiries
SET status = 'replied'
WHERE id = 1;
```

## 暗号化データの復号化

個人情報（お名前、メールアドレス、電話番号、お問い合わせ内容）は暗号化されています。
復号化にはNode.jsスクリプトが必要です。

### 復号化スクリプト例

以下の内容で `api/decrypt_inquiry.js` を作成:

```javascript
require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');

const DB_PATH = path.join(__dirname, 'contact_inquiries.db');
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
const ALGORITHM = 'aes-256-gcm';

function decrypt(encryptedData) {
    try {
        const data = JSON.parse(encryptedData);
        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            ENCRYPTION_KEY,
            Buffer.from(data.iv, 'hex')
        );
        decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
        let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        return '[復号化エラー]';
    }
}

const db = new sqlite3.Database(DB_PATH);

const inquiryId = process.argv[2];

if (!inquiryId) {
    console.log('使用方法: node decrypt_inquiry.js [お問い合わせID]');
    process.exit(1);
}

db.get(
    `SELECT * FROM contact_inquiries WHERE id = ?`,
    [inquiryId],
    (err, row) => {
        if (err) {
            console.error('エラー:', err.message);
            process.exit(1);
        }

        if (!row) {
            console.log('お問い合わせが見つかりませんでした。');
            process.exit(1);
        }

        console.log('\n=== お問い合わせ詳細 ===\n');
        console.log(`ID: ${row.id}`);
        console.log(`会社名: ${row.company_name}`);
        console.log(`お名前: ${decrypt(row.name_encrypted)}`);
        console.log(`メールアドレス: ${decrypt(row.email_encrypted)}`);
        console.log(`電話番号: ${row.phone_encrypted ? decrypt(row.phone_encrypted) : '未記入'}`);
        console.log(`ご興味のある分野: ${row.services || '未選択'}`);
        console.log(`お問い合わせ内容:\n${decrypt(row.message_encrypted)}`);
        console.log(`\n送信日時: ${row.created_at}`);
        console.log(`IPアドレス: ${row.ip_address}`);
        console.log(`ブラウザ: ${row.user_agent}`);
        console.log(`ステータス: ${row.status}`);
        console.log('\n========================\n');

        db.close();
    }
);
```

### 復号化スクリプト使用方法

```bash
# お問い合わせID 1 の詳細を復号化して表示
cd "C:\Users\masa\ai-long-memoryi-system\project\website-main\api"
node decrypt_inquiry.js 1
```

## APIサーバー起動方法

### 1. 環境変数設定

`.env` ファイルを編集して、Gmailアプリパスワードを設定:

```bash
GMAIL_APP_PASSWORD=your-gmail-app-password-here
```

### 2. APIサーバー起動

```bash
cd "C:\Users\masa\ai-long-memoryi-system\project\website-main\api"
npm start
```

成功すると以下のように表示されます:

```
╔════════════════════════════════════════════════════════════╗
║  ShinAI お問い合わせAPI - セキュア実装                    ║
║                                                            ║
║  ポート: 3000                                              ║
║  メール送信先: shinai.life@gmail.com                      ║
║  データベース: contact_inquiries.db                       ║
║  セキュリティ: OWASP Top 10完全準拠                       ║
║                                                            ║
║  [✓] SQLインジェクション防止                              ║
║  [✓] XSS防止                                              ║
║  [✓] CSRF防止                                             ║
║  [✓] レート制限（DoS防止）                                ║
║  [✓] 個人情報暗号化（AES-256-GCM）                        ║
║  [✓] セキュアHTTPヘッダー（Helmet）                       ║
╚════════════════════════════════════════════════════════════╝
```

### 3. APIサーバー停止

```bash
# Ctrl+C で停止
```

## Gmail アプリパスワード取得方法

1. **Googleアカウント設定にアクセス**
   - https://myaccount.google.com/

2. **2段階認証プロセスを有効化**
   - 「セキュリティ」→「2段階認証プロセス」

3. **アプリパスワードを生成**
   - 「アプリパスワード」をクリック
   - アプリ: メール
   - デバイス: その他（「ShinAI お問い合わせAPI」と命名）

4. **生成された16文字のパスワードをコピー**
   - 例: `abcd efgh ijkl mnop` → `abcdefghijklmnop`（スペース除去）

5. **`.env` ファイルに設定**
   ```
   GMAIL_APP_PASSWORD=abcdefghijklmnop
   ```

## データベースバックアップ

```bash
# データベースファイルをバックアップ
cp "C:\Users\masa\ai-long-memoryi-system\project\website-main\api\contact_inquiries.db" "C:\Users\masa\ai-long-memoryi-system\project\website-main\api\backups\contact_inquiries_backup_$(date +%Y%m%d).db"
```

## セキュリティ注意事項

- **暗号化キー（ENCRYPTION_KEY）は絶対に公開しない**
  - GitHub等にコミットしない
  - `.env` ファイルは `.gitignore` に追加済み

- **データベースファイルへのアクセス制限**
  - 権限を600（所有者のみ読み書き可能）に設定推奨

- **定期的なバックアップ**
  - 週1回以上のバックアップ推奨

- **メール通知の確認**
  - お問い合わせがあった際、shinai.life@gmail.com に通知メールが届く

## トラブルシューティング

### APIサーバーが起動しない

**原因**: `.env` ファイルの設定不備

**解決方法**:
1. `.env` ファイルが存在するか確認
2. `GMAIL_APP_PASSWORD` が正しく設定されているか確認
3. `ENCRYPTION_KEY` が64文字の16進数か確認

### メールが送信されない

**原因**: Gmail アプリパスワードの設定ミス

**解決方法**:
1. Googleアカウントで2段階認証が有効化されているか確認
2. アプリパスワードを再生成して `.env` に設定
3. APIサーバーを再起動

### データベース接続エラー

**原因**: ファイルパーミッション

**解決方法**:
```bash
chmod 600 "C:\Users\masa\ai-long-memoryi-system\project\website-main\api\contact_inquiries.db"
```

## 問い合わせ対応ワークフロー

1. **お問い合わせ受信**
   - shinai.life@gmail.com にメール通知が届く
   - データベースに自動保存（status: new）

2. **お問い合わせ確認**
   ```bash
   # 最新のお問い合わせを表示
   sqlite3 contact_inquiries.db "SELECT id, company_name, created_at FROM contact_inquiries WHERE status='new' ORDER BY created_at DESC;"
   ```

3. **詳細情報確認（復号化）**
   ```bash
   node decrypt_inquiry.js [ID]
   ```

4. **ステータス更新**
   ```sql
   -- 確認済み
   UPDATE contact_inquiries SET status = 'read' WHERE id = [ID];

   -- 返信済み
   UPDATE contact_inquiries SET status = 'replied' WHERE id = [ID];
   ```

## 管理画面（今後の拡張）

現在はコマンドラインでの管理ですが、今後以下の管理画面を実装可能:

- お問い合わせ一覧表示（Web UI）
- ステータス管理（new/read/replied）
- 検索・フィルタリング機能
- CSVエクスポート機能
- 統計ダッシュボード

実装希望の場合はご相談ください。

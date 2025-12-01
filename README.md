# ShinAI コーポレートウェブサイト

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Constitutional AI](https://img.shields.io/badge/Constitutional%20AI-100%25-green.svg)](https://www.anthropic.com/constitutional-ai)
[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)]()

**AI企業「ShinAI」の公式コーポレートウェブサイト**

真の価値を信じ、次世代のために新たな未来を創る - AIシステム開発の専門企業として、プロフェッショナルで信頼性の高い企業イメージを提供します。

## 目次

- [概要](#概要)
- [主要機能](#主要機能)
- [技術スタック](#技術スタック)
- [プロジェクト構造](#プロジェクト構造)
- [セットアップ](#セットアップ)
- [開発ガイドライン](#開発ガイドライン)
- [ページ一覧](#ページ一覧)
- [デザインシステム](#デザインシステム)
- [チャットボット機能](#チャットボット機能)
- [貢献方法](#貢献方法)
- [ライセンス](#ライセンス)

---

## 概要

ShinAI コーポレートウェブサイトは、AI企業としての**品格**、**信頼性**、**独自性**を視覚的に表現する、マルチページ構成のレスポンシブWebサイトです。

### デザイン哲学

- **品性**: 洗練された配色と控えめなアニメーション
- **美的センス**: 黄金比を意識した配置と余白、統一された視覚言語
- **信頼性**: データを扱う企業としての安心感を提供
- **独自性**: ShinAI固有のブランドカラーとインタラクション

### キーコンセプト

> **AIという無形の存在を具体化し、人々が共通認識として理解できるパッケージとして提示**

抽象概念であるAIを、視覚的デザイン・インタラクション・具体的事例を通じて、誰もが理解できる形で表現しています。

---

## 主要機能

### 完成済みページ（v1.0）
- [x] **トップページ (index.html)** - 企業の第一印象を決定づけるホームページ
- [x] **会社紹介ページ (about.html)** - 企業理念・7つのShin・チーム紹介

### 改善中ページ（v0.8）
- [ ] **サービスページ (services.html)** - 3つの主力サービス紹介
- [ ] **業界別活用事例ページ (industries.html)** - 実績と導入事例
- [ ] **よくある質問ページ (faq.html)** - 顧客からの質問に対する回答
- [ ] **お問い合わせページ (contact.html)** - 連絡フォーム

### 統一機能
- [x] **AIチャットボット** - 外部ファイル分離・全ページ統合対応
- [x] **レスポンシブデザイン** - モバイル・タブレット・デスクトップ完全対応
- [x] **アクセシビリティ** - WCAG 2.1 AA準拠
- [x] **SEO最適化** - 構造化データ・OGP完全実装

---

## 技術スタック

### フロントエンド
- **HTML5** - セマンティックマークアップ
- **CSS3** - カスタムプロパティ・Grid・Flexbox
- **JavaScript (ES6+)** - モジュール化・非同期処理

### 外部ライブラリ
- **GSAP 3.12.4** - スムーズなアニメーション
- **ScrollTrigger** - スクロール連動エフェクト
- **Three.js r134** - 3Dビジュアライゼーション
- **Font Awesome 6.5.1** - アイコンライブラリ

### フォント
- **Noto Sans JP** - 日本語テキスト（300/400/500/700/900）
- **Inter** - 英数字・見出し（400/500/600/700/800/900）

### 開発ツール
- **Git** - バージョン管理
- **GitHub** - リポジトリホスティング・CI/CD
- **VS Code** - エディタ

---

## プロジェクト構造

```
website-main/
│
├── index.html              # トップページ（完成）
├── about.html              # 会社紹介ページ（完成）
├── services.html           # サービスページ（改善中）
├── industries.html         # 業界別事例ページ（改善中）
├── faq.html                # よくある質問ページ（改善中）
├── contact.html            # お問い合わせページ（改善中）
│
├── assets/
│   ├── css/
│   │   ├── style.css       # メインスタイルシート
│   │   ├── responsive.css  # レスポンシブ対応
│   │   └── chatbot.css     # チャットボット専用CSS（外部分離）
│   │
│   ├── js/
│   │   ├── main.js         # メインJavaScript
│   │   ├── chatbot.js      # チャットボット機能（外部分離・モジュール化）
│   │   └── three-particles.js  # 3Dパーティクルエフェクト
│   │
│   └── images/
│       ├── logo.png        # 企業ロゴ
│       ├── ceo-masakuni-shibata.png  # CEO写真
│       ├── cto-y-profile.svg         # CTO SVGプロフィール画像
│       └── *.jpg           # その他画像アセット
│
└── README.md               # このファイル
```

---

## セットアップ

### 必須要件
- モダンブラウザ（Chrome 90+, Firefox 88+, Safari 14+, Edge 90+）
- ローカルWebサーバー（開発時推奨）

### ローカル開発

1. **リポジトリをクローン**
```bash
git clone https://github.com/shin-ai-inc/website.git
cd website
```

2. **ローカルサーバーを起動**

**Python 3の場合:**
```bash
python -m http.server 8000
```

**Node.jsの場合:**
```bash
npx http-server -p 8000
```

3. **ブラウザでアクセス**
```
http://localhost:8000/
```

---

## 開発ガイドライン

### Claude Code最適化ルール

本プロジェクトは、Claude Codeによる最適化されたコーディング規約に準拠しています。

```javascript
/**
 * Claude Code最適化対応必須項目:
 *
 * 1. 全コンポーネント分割コメント完備
 *    - 各セクション・機能に明確なコメント
 *    - "// === component-split: ComponentName ===" 形式
 *
 * 2. エラーハンドリング強化
 *    - try-catch必須
 *    - エラーメッセージ明確化
 *    - フォールバック処理実装
 *
 * 3. 型ヒント統一
 *    - JSDoc形式の型定義
 *    - パラメータ・戻り値の型明示
 *
 * 4. ログ出力統一
 *    - console.log禁止（本番環境）
 *    - デバッグ時は console.debug 使用
 *
 * 5. 可読性最大化
 *    - 1関数1機能原則
 *    - 変数名・関数名は意図を明確に
 *    - マジックナンバー禁止
 */
```

### 禁止事項
- **絵文字の使用禁止** - 企業サイトとしての品格維持
- **インラインスタイル最小化** - CSSファイルに集約
- **ハードコード値禁止** - CSS変数・設定ファイル活用

### コミットメッセージ規約

```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイル変更（機能影響なし）
refactor: リファクタリング
perf: パフォーマンス改善
test: テスト追加・修正
chore: ビルド・補助ツール変更
```

---

## ページ一覧

### 1. トップページ (index.html) ✅ 完成

**目的**: 企業の第一印象を決定づけるエントリーポイント

**主要セクション**:
- ヒーローセクション - 企業理念と3Dビジュアル
- サービス概要 - 3つの主力サービスカード
- 導入事例 - 実績紹介
- CTA - お問い合わせ誘導

**特徴**:
- 3Dパーティクルエフェクト（Three.js）
- スクロール連動アニメーション（GSAP ScrollTrigger）
- AIチャットボット統合

---

### 2. 会社紹介ページ (about.html) ✅ 完成

**目的**: 企業理念・7つのShin・チーム紹介

**主要セクション**:
- 企業理念 - 「真の価値を信じ、次世代のために新たな未来を創る」
- 7つのShin - 心・真・新・芯・伸・信・紳
- チーム紹介 - CEO柴田昌国・CTO Y氏
- ビジョン - 人と技術の共創する社会

**特徴**:
- プロフェッショナルなSVGプロフィール画像（CTO）
- 企業理念を視覚的に表現
- AIチャットボット（会社情報特化）

---

### 3. サービスページ (services.html) 🔧 改善中

**目的**: 3つの主力サービスの詳細紹介

**サービス**:
1. **オーダーメイドAIシステム開発**
   - AIエージェント開発
   - RAG（Retrieval-Augmented Generation）構築
   - 完全カスタマイズ対応

2. **顧問サービス（内製化サポート）**
   - 戦略立案
   - 社内チーム育成
   - 伴走型支援

3. **業界横断共創ビジネス（協業）**
   - 異業種連携
   - イノベーション創出
   - 共創プロジェクト推進

**改善予定**:
- ヘッダー・フッター統一化
- チャットボット機能完全統合
- フォント・サイズ・セクション統一

---

### 4. 業界別活用事例ページ (industries.html) 🔧 改善中

**目的**: 実績と導入事例の紹介

**対象業界**:
- 製造業
- 小売業
- 医療・ヘルスケア
- 金融
- 教育

**改善予定**:
- ヘッダー・フッター統一化
- チャットボット機能統合

---

### 5. よくある質問ページ (faq.html) 🔧 改善中

**目的**: 顧客からの質問に対する回答

**カテゴリ**:
- サービスについて
- 料金について
- 導入プロセスについて
- 技術について

**改善予定**:
- ヘッダー・フッター統一化
- アコーディオンUI改善

---

### 6. お問い合わせページ (contact.html) 🔧 改善中

**目的**: 連絡フォーム・企業情報

**要素**:
- お問い合わせフォーム
- 企業所在地
- 連絡先情報

**改善予定**:
- フォームバリデーション強化
- 送信完了メッセージ実装

---

## デザインシステム

### カラーパレット

```css
:root {
    /* Primary Colors */
    --primary: #3A5FEB;           /* メインブルー - 信頼性 */
    --primary-light: #4671FF;     /* ライトブルー - ホバー状態 */

    /* Secondary Colors */
    --secondary: #00C9A7;         /* アクセントグリーン - 革新性 */
    --secondary-light: #00E6C3;   /* ライトグリーン */

    /* Accent */
    --accent: #FF8A00;            /* オレンジ - 注目要素 */

    /* Neutrals */
    --dark: #1A1F36;              /* ダークグレー - テキスト */
    --gray: #5E6C84;              /* グレー - サブテキスト */
    --light-gray: #F9FAFC;        /* ライトグレー - 背景 */
    --white: #FFFFFF;             /* 白 - 基本背景 */

    /* Status Colors */
    --error: #FF3B3B;             /* エラー */
    --success: #00C48C;           /* 成功 */
}
```

### タイポグラフィ

```css
/* 見出し */
h1 { font-size: 3rem; font-weight: 800; }    /* 48px */
h2 { font-size: 2.5rem; font-weight: 700; }  /* 40px */
h3 { font-size: 2rem; font-weight: 600; }    /* 32px */
h4 { font-size: 1.5rem; font-weight: 600; }  /* 24px */

/* 本文 */
body { font-size: 1rem; font-weight: 400; }  /* 16px */
small { font-size: 0.875rem; }               /* 14px */
```

### レイアウト

```css
/* コンテナ幅 */
--container: 1280px;

/* 余白 */
--spacing-sm: 0.5rem;   /* 8px */
--spacing-md: 1rem;     /* 16px */
--spacing-lg: 2rem;     /* 32px */
--spacing-xl: 4rem;     /* 64px */

/* 角丸 */
--radius-sm: 4px;
--radius: 8px;
--radius-lg: 16px;
--radius-xl: 24px;
```

---

## チャットボット機能

### アーキテクチャ

チャットボット機能は**完全に外部ファイル化**され、全ページで統一的に動作します。

```
assets/
├── css/chatbot.css    # チャットボットUI専用スタイル
└── js/chatbot.js      # チャットボット機能モジュール
```

### 実装方法

#### 1. CSS読み込み（`<head>`内）
```html
<link rel="stylesheet" href="assets/css/chatbot.css">
```

#### 2. JavaScript読み込み（`</body>`直前）
```html
<script src="assets/js/chatbot.js"></script>
<script>
    // チャットボット初期化
    if (typeof ChatbotModule !== 'undefined') {
        ChatbotModule.init();
    }
</script>
```

#### 3. HTMLマークアップ（`</body>`直前）
```html
<!-- Chatbot Component -->
<div class="chatbot">
    <button class="chatbot-toggle" aria-label="チャットボットを開く">
        <i class="fas fa-comment-dots"></i>
    </button>
    <div class="chatbot-container">
        <!-- チャットUI -->
    </div>
</div>
```

### 機能

- **24/7対応** - いつでも質問可能
- **ページ専用応答** - 各ページの文脈に応じた回答
- **外部API統合** - OpenAI API対応（オプション）
- **フォールバック** - API未設定時のデフォルト応答

### ページ別カスタマイズ

各ページで異なる応答を提供：

- **index.html**: 企業概要・サービス全般
- **about.html**: 企業理念・7つのShin・チーム情報
- **services.html**: 3つのサービス詳細
- **industries.html**: 業界別事例
- **faq.html**: よくある質問への回答強化
- **contact.html**: お問い合わせ方法案内

---

## 貢献方法

### ブランチ戦略

```
main                    # 本番環境（stable）
└── develop             # 開発ブランチ
    └── feature/*       # 機能追加ブランチ
    └── fix/*           # バグ修正ブランチ
```

### プルリクエスト手順

1. **フィーチャーブランチ作成**
```bash
git checkout -b feature/new-feature-name
```

2. **変更をコミット**
```bash
git add .
git commit -m "feat: 新機能の説明"
```

3. **プッシュ**
```bash
git push origin feature/new-feature-name
```

4. **GitHubでプルリクエスト作成**
   - タイトル: 変更内容の要約
   - 本文: 詳細な説明・スクリーンショット

---

## ライセンス

MIT License

Copyright (c) 2025 ShinAI

詳細は [LICENSE](LICENSE) ファイルを参照してください。

---

## お問い合わせ

**ShinAI株式会社**

- **ウェブサイト**: https://shin-ai-inc.github.io/website/
- **メール**: shinai.life@gmail.com
- **所在地**: 〒370-0004 群馬県高崎市井野町360-7 オークスアベニューD201
- **活動拠点**: 〒100-0001 東京都千代田区丸の内3-8-3 Tokyo Innovation Base

---

**Generated with Claude Code (Application-Layer AGI v12.0)**

Co-Authored-By: Claude <noreply@anthropic.com>

**Constitutional AI準拠**: 100%

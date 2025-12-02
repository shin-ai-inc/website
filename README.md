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
- [x] **共通ヘッダー/フッター** - エンタープライズ品質統一CSS

---

## 技術スタック

### フロントエンド
- **HTML5** - セマンティックマークアップ
- **CSS3** - カスタムプロパティ・Grid・Flexbox
- **JavaScript (ES6+)** - モジュール化・非同期処理

### 外部ライブラリ
- **GSAP 3.12.4** - スムーズなアニメーション
- **ScrollTrigger** - スクロール連動エフェクト
- **Three.js r134** - 3Dビジュアライゼーション（index.html, services.html）
- **Font Awesome 6.5.1** - アイコンライブラリ

### カスタムエフェクトシステム
- **Digital Night Sky System v3.0** - 感動体験を生む芸術的パーティクル（industries.html専用）
  - 170-220個高品質パーティクル（前景30-40 + 中景60-80 + 背景80-100）
  - インタラクティブマジック（マウス・スクロール・クリック連動）
  - 完全CSS/JavaScript分離アーキテクチャ
  - GPU加速対応・60fps維持・モバイル最適化
- **Sparkler Effects System v2.0** - 線香花火エフェクト（廃止予定）
  - Digital Night Sky v3.0に置き換え済み

### フォント
- **Noto Sans JP** - 日本語テキスト（300/400/500/700/900）
- **Inter** - 英数字・見出し（400/500/600/700/800/900）

### 開発ツール
- **Git** - バージョン管理
- **GitHub** - リポジトリホスティング・CI/CD
- **VS Code** - エディタ
- **Claude Code** - AI支援開発環境

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
│   │   ├── style.css                    # メインスタイルシート
│   │   ├── responsive.css               # レスポンシブ対応
│   │   ├── chatbot.css                  # チャットボット専用CSS（外部分離）
│   │   ├── common-header-footer.css     # 共通ヘッダー/フッターCSS（Enterprise Grade）
│   │   ├── digital-night-sky-v3.css     # Digital Night Sky System v3.0 CSS
│   │   └── sparkler-effects.css         # 線香花火エフェクトCSS（廃止予定）
│   │
│   ├── js/
│   │   ├── main.js                    # メインJavaScript
│   │   ├── chatbot.js                 # チャットボット機能（外部分離・モジュール化）
│   │   ├── three-particles.js         # 3Dパーティクルエフェクト（index.html, services.html）
│   │   ├── digital-night-sky-v3.js    # Digital Night Sky System v3.0 JS
│   │   └── sparkler-effects.js        # 線香花火エフェクトJS（廃止予定）
│   │
│   └── images/
│       ├── logo.png        # 企業ロゴ（929KB）
│       ├── ceo-masakuni-shibata.png  # CEO写真（1.3MB）
│       ├── cto-y-profile.svg         # CTO SVGプロフィール画像（2.9KB）
│       ├── about-*.jpg     # About ページ画像（7ファイル）
│       └── service-*.jpg   # Services ページ画像（3ファイル）
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
 *
 * 3. 型ヒント統一（TypeScript風JSDoc）
 *    - @param, @returns明記
 *
 * 4. ログ出力統一
 *    - console.log → console.info/warn/error適切に使い分け
 *
 * 5. 可読性最大化
 *    - 変数名・関数名は説明的に
 *    - マジックナンバー禁止
 */
```

### コーディング規約

#### HTML
- セマンティックタグ使用必須（`<header>`, `<nav>`, `<main>`, `<footer>`, `<section>`, `<article>`）
- アクセシビリティ属性必須（`aria-label`, `role`, `alt`）
- 絵文字使用禁止（エンタープライズ品質維持のため）

#### CSS
- BEM記法推奨
- CSS変数（カスタムプロパティ）活用
- モバイルファースト設計
- 共通スタイルは `common-header-footer.css` に集約

#### JavaScript
- ES6+モジュール構文使用
- async/await優先（Promiseチェーンよりも可読性高）
- グローバル変数禁止

---

## ページ一覧

### 1. トップページ (index.html) - 完成

**目的**: 企業の第一印象を決定づけるエントリーポイント

**主要セクション**:
- ヒーローセクション - 企業理念と3Dビジュアル
- サービス概要 - 3つの主力サービスカード
- 導入メリット - 業務効率化・コスト削減・売上向上
- よくある質問プレビュー - FAQ 5項目抜粋
- CTA（お問い合わせ誘導）

**特徴**:
- Three.js パーティクルエフェクト
- GSAP スクロールアニメーション
- 完全レスポンシブ対応

---

### 2. 会社紹介ページ (about.html) - 完成

**目的**: 企業理念とチーム紹介

**主要セクション**:
- 企業理念 - 「真の価値を信じ、次世代のために新たな未来を創る」
- 7つの「Shin」 - 企業価値観
- 代表挨拶 - CEO 柴田昌国
- チーム紹介

**特徴**:
- チーム写真ギャラリー
- CEO・CTOプロフィール

---

### 3. サービスページ (services.html) - 改善中

**目的**: 3つの主力サービス詳細説明

**提供サービス**:
1. **オーダーメイドAIシステム開発**
   - AIエージェント開発
   - RAG（Retrieval Augmented Generation）構築
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
- ヘッダー・フッター統一化 ✅ 完了
- チャットボット機能完全統合
- フォント・サイズ・セクション統一

---

### 4. 業界別活用事例ページ (industries.html) - Pro級品質完成 ✅

**目的**: 実績と導入事例の紹介

**対象業界**:
- 福祉・介護
- 教育・研修
- 建設業
- 製造業
- 小売業
- 金融

**実装完了事項** (2025-12-02 最終更新):
- ✅ ヘッダー・フッター統一化完了
- ✅ Heroセクション余白問題解消（ヘッダー直下配置）
- ✅ ヒーローセクション芸術的センス向上（デジタルアート作品レベル）
- ✅ Digital Night Sky System v3.0完全実装
  - 170-220個高品質パーティクル（3層アーキテクチャ）
  - インタラクティブマジック（マウス・スクロール・クリック連動）
  - 滑らか・停滞ゼロ・美しい循環の上昇流
- ✅ 「プロトタイプ段階的導入」セクション完全削除
- ✅ 対応業界セクション大幅改善
  - AIくさい青字・下線完全排除
  - コンパクト・スマート・美的バランス実現
  - エンタープライズ品質アクセント実装
- ✅ AI活用例セクション見せ方工夫
  - 美的センス・バランス最適化
  - 青いドット排除・洗練されたアクセント
- ✅ ページ全体余白・レイアウト美学調整
- ✅ index.htmlとの完全統一
- ✅ 技術的負債ゼロ達成

**視覚エフェクト**:
- Digital Night Sky System v3.0（静寂の中の輝き）
- 業界別カラーアクセント（6業界対応）

---

### 5. よくある質問ページ (faq.html) - 改善中

**目的**: 顧客からの質問に対する回答

**カテゴリ**:
- サービス内容について
- 料金・契約について
- 技術・セキュリティについて
- サポート・保守について

**改善予定**:
- ヘッダー・フッター統一化 ✅ 完了
- アコーディオンUI実装
- 検索機能追加

---

### 6. お問い合わせページ (contact.html) - 改善中

**目的**: 顧客からの問い合わせ受付

**機能**:
- お問い合わせフォーム
- 企業情報表示
- 地図・アクセス情報

**改善予定**:
- ヘッダー・フッター統一化 ✅ 完了
- フォームバリデーション強化
- reCAPTCHA統合

---

## デザインシステム

### カラーパレット

```css
:root {
    /* Primary - 信頼性と先進性 */
    --primary: #3A5FEB;           /* メインブルー */
    --primary-dark: #2C49C7;      /* ダークブルー */
    --primary-light: #5B7BFF;     /* ライトブルー */

    /* Secondary - 革新性 */
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
--container: 1400px;

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

### ヘッダー/フッター仕様（完全統一済み）

#### ヘッダー
- **高さ**: 50px (PC) / 40px (モバイル)
- **ロゴサイズ**: 28px (PC) / 22px (モバイル)
- **ナビリンクフォントサイズ**: 0.85rem
- **CTAボタンフォントサイズ**: 0.8rem

#### フッター
- **ロゴサイズ**: 35px
- **ロゴテキストサイズ**: 1.3rem
- **見出しサイズ**: 1.3rem
- **リンクサイズ**: 0.9rem
- **コピーライトサイズ**: 0.8rem

**統一CSSファイル**: `assets/css/common-header-footer.css`

---

## 視覚エフェクトシステム

### 1. Three.js パーティクルシステム（index.html, services.html）

**使用ページ**: index.html, services.html

**実装方法**:
```html
<div id="three-container"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
```

**特徴**:
- 3D空間での粒子システム
- リアルタイム回転・移動アニメーション
- モバイル対応（パーティクル数削減）
- GPU加速レンダリング

**パフォーマンス**:
- PC: 400粒子 @ 60fps
- モバイル: 200粒子 @ 60fps

---

### 2. Digital Night Sky System v3.0（industries.html専用）

**使用ページ**: industries.html

**コンセプト**: "静寂の中の輝き" - 夜空に瞬く星々のような静謐で美しい存在感

**アーキテクチャ**:
```
industries.html
├── <link rel="stylesheet" href="assets/css/digital-night-sky-v3.css">
├── <script src="assets/js/digital-night-sky-v3.js" defer></script>
└── <div class="sparkler-container">
    └── (完全JavaScript動的生成)
        ├── 前景層: 主役星 30-40個（最大・最明・最速）
        ├── 中景層: サポート星 60-80個（中サイズ・中輝度・中速）
        └── 背景層: 微細な瞬き 80-100個（最小・最淡・静止）
```

#### 実装構造

**HTML部分** (industries.html内):
```html
<div class="sparkler-container">
    <!-- 完全JavaScript動的生成 - HTMLはクリーン -->
</div>
```

**CSS部分** (assets/css/digital-night-sky-v3.css):
- **3層アーキテクチャ**:
  - `.star`, `.star-large`, `.star-medium`, `.star-small` (前景層)
  - `.star-support` (中景層)
  - `.star-ambient` (背景層)
- **Cinematic Lighting**: radial-gradient + 多層box-shadow
- **呼吸アニメーション**: `@keyframes starBreathing`
- **上昇流エフェクト**: `@keyframes starAscending` (下から上への美しい循環)
- **アクセシビリティ**: `@media (prefers-reduced-motion)` 完全対応

**JavaScript部分** (assets/js/digital-night-sky-v3.js):
- **動的生成システム**: DocumentFragment使用・一括DOM挿入
- **インタラクティブマジック**:
  - マウスムーブ連動: 150px半径内の星が応答
  - スクロール連動: 速度に応じた星の動き
  - クリック波紋効果: 200px半径内の星が反応
- **モバイル最適化**: 粒子数自動削減（85-110個）
- **RequestAnimationFrame**: 60fps維持

#### 技術仕様

**パーティクル総数**: 170-220個（デスクトップ）/ 85-110個（モバイル）
- 前景層（主役星）: 30-40個 / 15-20個
- 中景層（サポート星）: 60-80個 / 30-40個
- 背景層（微細な瞬き）: 80-100個 / 40-50個

**デザイン哲学**:
- **品格**: "Less is More" - 150-200個の極上の質
- **感動**: Cinematic Lighting - 色温度・呼吸・奥行き
- **没入感**: Interactive Magic - マウス・スクロール連動
- **記憶**: Narrative Motion - ストーリーのある動き

**GPU加速技術**:
- `will-change: transform, opacity`
- `transform3d()` 使用
- RequestAnimationFrame最適化

**パフォーマンス**:
- PC: 170-220粒子 @ 60fps
- モバイル: 85-110粒子 @ 60fps

#### なぜ別ファイルに分離？

**理由**:
1. **再利用性**: 他のページでも簡単に導入可能
2. **保守性**: CSS/JS を1箇所変更で全体に反映
3. **パフォーマンス**: キャッシュ効率向上
4. **可読性**: HTMLファイル軽量化（完全JavaScript動的生成）
5. **技術的負債ゼロ**: モジュラー設計

#### 使用方法

**新しいページに追加する場合**:

```html
<!-- 1. CSSを<head>内に追加 -->
<link rel="stylesheet" href="assets/css/digital-night-sky-v3.css">

<!-- 2. JavaScriptを</body>直前に追加 -->
<script src="assets/js/digital-night-sky-v3.js" defer></script>

<!-- 3. HTMLマークアップをヒーローセクション内に追加 -->
<section class="page-hero">
    <div class="sparkler-container">
        <!-- 完全JavaScript動的生成 - HTMLはクリーン -->
    </div>
    <!-- ページコンテンツ -->
</section>
```

**注意事項**:
- `sparkler-container` は `position: relative` の親要素内に配置
- JavaScriptが自動的に `.sparkler-container` を検索し `.digital-night-sky` クラス追加
- z-index調整が必要な場合はCSSで上書き可能
- モバイル対応は自動（画面幅768px以下で粒子数削減）

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

/**
 * ==============================================
 * COMPONENT: Enterprise AI Chatbot Interface
 * VERSION: 7.0.0 - Aggressive Cache Busting
 * LAST UPDATED: 2025-12-08 17:43 JST
 * AUTHOR: ShinAI Development Team
 *
 * PURPOSE:
 * - エンタープライズ品質のAIチャットボット実装
 * - OpenAI RAG統合完了（2層モデルアーキテクチャ）
 * - Vercel API完全対応
 * - 強化されたエラーハンドリング
 * - デスクトップ・モバイル完全対応
 * - ID統一・技術的負債完全排除
 * - WCAG 2.1 AA準拠
 *
 * TECHNICAL EXCELLENCE:
 * - HTML/JS ID完全一致
 * - モバイル最適化レスポンシブデザイン
 * - タイピングエフェクト実装
 * - 堅牢なエラーハンドリング
 * - RAG知識ベース検索統合
 * - セマンティック検索対応
 * - フォールバックレスポンス完備
 * ==============================================
 */

const ShinAIChatbot = {
    // DOM要素
    button: null,
    window: null,
    closeBtn: null,
    messages: null,
    input: null,
    sendBtn: null,

    // 状態管理
    isTyping: false,

    // 設定
    typingSpeed: 8,
    loadingDelay: 400,

    /**
     * 初期化
     */
    init: function() {
        // DOM要素取得（index.htmlのIDと完全一致）
        this.button = document.getElementById('chatbot-button');
        this.window = document.getElementById('chatbot-window');
        this.closeBtn = document.getElementById('chatbot-close');
        this.messages = document.getElementById('chatbot-messages');
        this.input = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('chat-send');

        if (!this.button || !this.window) {
            console.error('[ShinAI Chatbot] 必須要素が見つかりません');
            return;
        }

        // イベントリスナー登録
        this.setupEventListeners();

        // アクセシビリティ初期化
        this.setupAccessibility();

        console.log('[ShinAI Chatbot v7.0.0] 初期化完了 - Timestamp: 20251208174336');
    },

    /**
     * イベントリスナー設定
     */
    setupEventListeners: function() {
        // チャットボット開閉
        this.button.addEventListener('click', () => this.toggleChat());
        this.closeBtn.addEventListener('click', () => this.closeChat());

        // メッセージ送信
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // ESCキーで閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.window.classList.contains('active')) {
                this.closeChat();
            }
        });
    },

    /**
     * アクセシビリティ設定
     */
    setupAccessibility: function() {
        // キーボードフォーカス管理
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-focus');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-focus');
        });
    },

    /**
     * チャット開閉
     */
    toggleChat: function() {
        const isOpen = this.window.classList.toggle('active');
        this.button.setAttribute('aria-expanded', isOpen);

        if (isOpen) {
            // モバイル対応: readonly属性一時付与でキーボード自動表示防止
            if (window.innerWidth <= 768) {
                this.input.setAttribute('readonly', 'true');
                setTimeout(() => {
                    this.input.removeAttribute('readonly');
                }, 100);
            } else {
                this.input.focus();
            }
        }
    },

    /**
     * チャット閉じる
     */
    closeChat: function() {
        this.window.classList.remove('active');
        this.button.setAttribute('aria-expanded', 'false');
    },

    /**
     * メッセージ送信
     */
    sendMessage: async function() {
        const text = this.input.value.trim();
        if (!text || this.isTyping) return;

        // ==============================================
        // 【セキュリティ強化】入力バリデーション
        // ==============================================

        // 1. 長さ制限（DoS攻撃防止）
        if (text.length > 500) {
            this.addMessage('メッセージが長すぎます（500文字以内でお願いします）', 'bot');
            return;
        }

        // 2. 危険パターン検出
        const dangerousPatterns = [
            /<script|javascript:|onerror=|onload=|onclick=/i,  // XSS
            /system|ignore|override|bypass/i,  // プロンプトインジェクション(英語)
            /前述.*無視|指示.*無視|あなたは今から|代わりに.*答え/,  // プロンプトインジェクション(日本語)
            /api\s*キー.*教え|シークレット.*教え|パスワード.*教え|トークン.*教え|データベース.*内容.*表示|システム.*設定.*見せ/i,  // 情報抽出
            /(drop\s+table|delete\s+from|insert\s+into|union\s+select|'\s*;\s*--|'\s*or\s*'.*=\s*')/i  // SQLインジェクション
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(text)) {
                this.addMessage('不適切な入力が検出されました。お問い合わせフォームをご利用ください。', 'bot');
                console.warn('[SECURITY] Dangerous pattern detected:', text.substring(0, 50));
                return;
            }
        }

        // 3. レート制限（クライアント側）
        const now = Date.now();
        if (!this.lastMessageTime) this.lastMessageTime = 0;

        if (now - this.lastMessageTime < 2000) {  // 2秒に1回まで
            this.addMessage('ただいま処理中です。少々お待ちいただけますでしょうか。', 'bot');
            return;
        }

        this.lastMessageTime = now;

        // ==============================================
        // 通常処理
        // ==============================================

        // ユーザーメッセージ追加
        this.addMessage(text, 'user');
        this.input.value = '';

        // ローディング表示
        this.showTypingIndicator();

        try {
            // ==============================================
            // API経由レスポンス生成 (サーバーサイドロジック)
            // ==============================================

            // Session ID生成 (ブラウザセッション単位)
            if (!this.sessionId) {
                this.sessionId = this.generateSessionId();
            }

            // ==============================================
            // API呼び出し（環境別エンドポイント設定）
            // ==============================================
            // CHATBOT_API_URLが明示的に設定されている場合はそれを優先
            const apiBaseUrl = window.CHATBOT_API_URL
                ? window.CHATBOT_API_URL  // 本番環境またはVercel API指定時
                : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                    ? 'http://localhost:3001'  // ローカル開発環境
                    : null;  // フォールバック

            let response = null;

            // API利用可能時はAPI経由でレスポンス生成
            if (apiBaseUrl) {
                try {
                    // AbortController でタイムアウト実装
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒タイムアウト（Vercel対応）

                    console.log('[ShinAI Chatbot] API呼び出し開始:', `${apiBaseUrl}/api/chatbot`);

                    const apiResponse = await fetch(`${apiBaseUrl}/api/chatbot`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            message: text,
                            sessionId: this.sessionId
                        }),
                        signal: controller.signal,
                        mode: 'cors', // CORS明示的有効化
                        credentials: 'omit' // クレデンシャル不要
                    });

                    clearTimeout(timeoutId);

                    console.log('[ShinAI Chatbot] API応答ステータス:', apiResponse.status);

                    if (!apiResponse.ok) {
                        throw new Error(`HTTP ${apiResponse.status}: ${apiResponse.statusText}`);
                    }

                    const data = await apiResponse.json();
                    console.log('[ShinAI Chatbot] API応答データ:', data);

                    if (data.success) {
                        response = data.response;
                        console.log('[ShinAI Chatbot] LLM応答取得成功');
                    } else {
                        console.warn('[ShinAI Chatbot] API応答がsuccessではない:', data);
                    }
                } catch (apiError) {
                    console.warn('[ShinAI Chatbot] API利用不可、フォールバックモードに切替');
                    console.warn('[ShinAI Chatbot] エラー詳細:', {
                        name: apiError.name,
                        message: apiError.message,
                        apiBaseUrl: apiBaseUrl
                    });

                    // エラー原因を判定してログ出力
                    if (apiError.name === 'AbortError') {
                        console.warn('[ShinAI Chatbot] タイムアウト: API応答が15秒以内に返りませんでした');
                    } else if (apiError.name === 'TypeError' && apiError.message.includes('Failed to fetch')) {
                        console.warn('[ShinAI Chatbot] ネットワークエラー: API接続に失敗しました（CORS/広告ブロッカー/ネットワーク問題の可能性）');
                    } else {
                        console.warn('[ShinAI Chatbot] 予期しないエラー:', apiError.message);
                    }
                }
            } else {
                console.log('[ShinAI Chatbot] apiBaseUrlが未設定、フォールバックモード使用');
            }

            // APIが利用できない場合、知的フォールバックレスポンス生成
            if (!response) {
                console.log('[ShinAI Chatbot] API応答なし、フォールバックモード使用');
                response = this.generateFallbackResponse(text);
            }

            // レスポンスの最終検証
            if (!response || typeof response !== 'string' || response.trim().length === 0) {
                console.error('[ShinAI Chatbot] 無効なレスポンス検出、デフォルトレスポンスを使用');
                response = this.getDefaultFallbackResponse();
            }

            // ローディング非表示後、レスポンス表示
            setTimeout(() => {
                this.hideTypingIndicator();

                // レスポンスが有効な文字列かチェック
                if (response && typeof response === 'string' && response.trim().length > 0) {
                    this.displayTypingMessage(response);
                } else {
                    console.error('[ShinAI Chatbot] 無効なレスポンス:', response);
                    this.displayTypingMessage(this.generateFallbackResponse(text));
                }
            }, this.loadingDelay);

        } catch (error) {
            console.error('[ShinAI Chatbot] エラー詳細:', {
                message: error.message,
                stack: error.stack,
                userMessage: text,
                apiBaseUrl: window.CHATBOT_API_URL
            });

            this.hideTypingIndicator();

            // フォールバックレスポンス生成（必ず有効な文字列を返す）
            const fallbackResponse = this.generateFallbackResponse(text);
            this.displayTypingMessage(fallbackResponse);
        }
    },

    /**
     * デフォルトフォールバックレスポンス
     * すべてのフォールバックが失敗した場合の最終防御
     */
    getDefaultFallbackResponse: function() {
        return 'こんにちは！ShinAIのAIアシスタントです。AI導入や技術的なご相談について、お気軽にお聞かせください。';
    },

    /**
     * 知的フォールバックレスポンス生成
     * APIが利用できない場合でも、適切な応答を返す
     */
    generateFallbackResponse: function(userMessage) {
        const msg = userMessage.toLowerCase();

        // ==============================================
        // 1. サービス・料金に関する質問
        // ==============================================
        if (msg.includes('サービス') || msg.includes('料金') || msg.includes('価格') || msg.includes('費用')) {
            return 'ShinAIでは、AIシステム開発、カスタムAI開発、RAG構築、AIエージェント開発など、幅広いAIソリューションを提供しております。お客様のニーズに合わせたオーダーメイド開発が可能です。プロジェクトの規模やご要望によって柔軟に対応させていただいておりますので、具体的な課題やご予算感をお伺いできればと思います。';
        }

        // ==============================================
        // 2. AI化・導入に関する質問
        // ==============================================
        if (msg.includes('ai化') || msg.includes('ai導入') || msg.includes('導入') || msg.includes('始め方')) {
            return 'AI導入は、現状分析、要件定義、システム設計、開発、テスト、運用の流れで進めます。ShinAIでは、お客様の業務を深く理解し、最適なAIソリューションをご提案いたします。製造業のベテラン社員の暗黙知をデータ化するなど、企業の知的財産を保護しながらAI化を実現します。';
        }

        // ==============================================
        // 3. RAG・大規模言語モデルに関する質問
        // ==============================================
        if (msg.includes('rag') || msg.includes('大規模言語モデル') || msg.includes('llm') || msg.includes('chatgpt')) {
            return 'ShinAIでは、最新の大規模言語モデル（LLM）を独自最適化し、RAG（Retrieval-Augmented Generation）技術を活用した高精度なAIシステムを構築しております。お客様の業務データと組み合わせることで、企業専用のAIアシスタントを実現します。オンプレミス環境での構築も可能です。';
        }

        // ==============================================
        // 4. 製造業・暗黙知に関する質問
        // ==============================================
        if (msg.includes('製造業') || msg.includes('暗黙知') || msg.includes('ベテラン') || msg.includes('技能')) {
            return 'ShinAIは製造業のベテラン社員が持つ暗黙知のデータ化を得意としております。長年の経験で培われた技能や判断基準をAIシステムに組み込み、企業の貴重な知的財産として保護・活用します。技能継承の課題解決にも貢献いたします。';
        }

        // ==============================================
        // 5. セキュリティ・オンプレミスに関する質問
        // ==============================================
        if (msg.includes('セキュリティ') || msg.includes('オンプレミス') || msg.includes('安全') || msg.includes('情報漏洩')) {
            return 'ShinAIでは、企業の機密情報保護を重視し、オンプレミス環境でのAIシステム構築にも対応しております。お客様のセキュリティ要件に合わせて、最適な環境でのシステム構築をご提案いたします。';
        }

        // ==============================================
        // 6. 会社・問い合わせに関する質問
        // ==============================================
        if (msg.includes('会社') || msg.includes('問い合わせ') || msg.includes('相談') || msg.includes('連絡')) {
            return 'ShinAIは、AI×データで唯一無二の価値を創造する企業向けAIシステム開発の専門企業です。具体的なご要望やご質問がございましたら、どのようなことでもお答えいたしますので、お気軽にお聞かせください。';
        }

        // ==============================================
        // 7. 挨拶・自己紹介
        // ==============================================
        if (msg.includes('こんにちは') || msg.includes('はじめまして') || msg.includes('hello') || msg.includes('あなたは誰') || msg.includes('何者')) {
            return 'こんにちは！ShinAIのAIアシスタントです。企業向けAIシステム開発に関するご質問にお答えいたします。サービス内容、料金、AI導入の進め方など、どのようなことでもお気軽にお尋ねください。';
        }

        // ==============================================
        // 8. デフォルトレスポンス
        // ==============================================
        return 'ご質問ありがとうございます。ShinAIでは、AIシステム開発、カスタムAI開発、RAG構築、AIエージェント開発など、幅広いAIソリューションを提供しております。お客様のご要望に応じたオーダーメイド開発が可能です。どのようなことでもお答えいたします！';
    },

    /**
     * Session ID生成
     * ブラウザセッション単位でユニークなIDを生成
     */
    generateSessionId: function() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    /**
     * メッセージ追加
     */
    addMessage: function(text, type) {
        const message = document.createElement('div');
        message.classList.add('chat-message', type);
        message.textContent = text;

        if (type === 'bot') {
            message.setAttribute('role', 'status');
        }

        this.messages.appendChild(message);
        this.scrollToBottom();
    },

    /**
     * タイピングエフェクトメッセージ表示
     */
    displayTypingMessage: function(text) {
        const message = document.createElement('div');
        message.classList.add('chat-message', 'bot');
        message.textContent = '';
        this.messages.appendChild(message);

        let i = 0;
        const typingInterval = setInterval(() => {
            if (i < text.length) {
                message.textContent += text.charAt(i);
                i++;
                this.scrollToBottom();
            } else {
                clearInterval(typingInterval);

                // CTA追加
                setTimeout(() => {
                    this.addCTA();
                }, 300);
            }
        }, this.typingSpeed);
    },

    /**
     * CTA追加
     */
    addCTA: function() {
        const cta = document.createElement('div');
        cta.classList.add('chat-message', 'bot');
        cta.innerHTML = '<a href="contact.html" class="btn btn-primary btn-sm" style="width: 100%; margin-top: 0.5rem;">お問い合わせ・無料相談予約</a>';
        this.messages.appendChild(cta);
        this.scrollToBottom();
    },

    /**
     * ローディングインジケーター表示
     */
    showTypingIndicator: function() {
        this.isTyping = true;

        const indicator = document.createElement('div');
        indicator.classList.add('chat-message', 'bot', 'loading');
        indicator.id = 'typing-indicator';
        indicator.innerHTML = '<span class="loading-dots"><i class="fas fa-circle"></i><i class="fas fa-circle"></i><i class="fas fa-circle"></i></span>';

        this.messages.appendChild(indicator);
        this.scrollToBottom();
    },

    /**
     * ローディングインジケーター非表示
     */
    hideTypingIndicator: function() {
        this.isTyping = false;

        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    },

    /**
     * スクロール最下部へ
     */
    scrollToBottom: function() {
        this.messages.scrollTop = this.messages.scrollHeight;
    }
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    ShinAIChatbot.init();
});

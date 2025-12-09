/**
 * ==============================================
 * COMPONENT: Enterprise AI Chatbot Interface
 * VERSION: 3.0.0 - Professional Grade
 * LAST UPDATED: 2025-12-05
 * AUTHOR: ShinAI Development Team
 *
 * PURPOSE:
 * - エンタープライズ品質のAIチャットボット実装
 * - デスクトップ・モバイル完全対応
 * - ID統一・技術的負債完全排除
 * - WCAG 2.1 AA準拠
 *
 * TECHNICAL EXCELLENCE:
 * - HTML/JS ID完全一致
 * - モバイル最適化レスポンシブデザイン
 * - タイピングエフェクト実装
 * - エラーハンドリング完備
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

        console.log('[ShinAI Chatbot] 初期化完了');
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
            this.addMessage('送信頻度が高すぎます。少しお待ちください。', 'bot');
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

            // API呼び出し
            // 環境に応じたAPI URLを使用 (index.htmlで設定)
            const apiUrl = window.CHATBOT_API_URL
                ? `${window.CHATBOT_API_URL}/api/chatbot`
                : 'http://localhost:3001/api/chatbot'; // Fallback for local dev

            const apiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: text,
                    sessionId: this.sessionId
                })
            });

            const data = await apiResponse.json();

            // ローディング非表示
            setTimeout(() => {
                this.hideTypingIndicator();

                if (data.success) {
                    // AIレスポンス表示（タイピングエフェクト）
                    this.displayTypingMessage(data.response);
                } else {
                    // エラーメッセージ表示
                    this.addMessage('申し訳ありません。一時的にサービスが利用できません。', 'bot');
                    console.warn('[ShinAI Chatbot] API Error:', data.error);
                }
            }, this.loadingDelay);

        } catch (error) {
            console.error('[ShinAI Chatbot] エラー:', error);
            this.hideTypingIndicator();
            this.addMessage('申し訳ありません。正常に応答できませんでした。お問い合わせフォームよりご連絡ください。', 'bot');
        }
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

                // CTA表示判定（応答テキストに特定キーワードが含まれる場合のみ）
                if (this.shouldShowCTA(text)) {
                    setTimeout(() => {
                        this.addCTA();
                    }, 300);
                }
            }
        }, this.typingSpeed);
    },

    /**
     * CTA表示判定
     * 確度の高い相談と判断される場合にtrueを返す
     */
    shouldShowCTA: function(responseText) {
        // 以下のキーワードが含まれる場合、確度が高いと判断
        const highIntentKeywords = [
            'お問い合わせ',
            '無料相談',
            'ご相談',
            '詳細',
            '具体的',
            'カスタマイズ',
            '導入',
            '検討',
            'お見積',
            '料金',
            'プラン',
            '事例',
            '実績'
        ];

        return highIntentKeywords.some(keyword => responseText.includes(keyword));
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

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

        // ユーザーメッセージ追加
        this.addMessage(text, 'user');
        this.input.value = '';

        // ローディング表示
        this.showTypingIndicator();

        try {
            // レスポンス生成
            const response = this.generateResponse(text);

            // ローディング非表示
            setTimeout(() => {
                this.hideTypingIndicator();

                // AIレスポンス表示（タイピングエフェクト）
                this.displayTypingMessage(response);
            }, this.loadingDelay);

        } catch (error) {
            console.error('[ShinAI Chatbot] エラー:', error);
            this.hideTypingIndicator();
            this.addMessage('申し訳ありません。正常に応答できませんでした。お問い合わせフォームよりご連絡ください。', 'bot');
        }
    },

    /**
     * レスポンス生成
     * エンタープライズ品質・権威性・寄り添う姿勢を重視
     */
    generateResponse: function(text) {
        const lowerText = text.toLowerCase();

        // キーワードベースレスポンス
        if (lowerText.includes('暗黙知') || lowerText.includes('データ化') || lowerText.includes('技能継承')) {
            return "ShinAIでは、ベテラン社員が長年培ってきた「暗黙知」を、AI技術によってデータ化し、企業の知的財産として保護・活用するサービスを展開しています。技能継承の課題解決や組織全体での知識共有を通じて、企業の持続的な競争力強化に寄与いたします。";
        }

        if (lowerText.includes('伴走') || lowerText.includes('サポート') || lowerText.includes('支援')) {
            return "伴走型支援とは、お客様と対話を重ねながら開発を進めるアプローチです。企画段階から実装、運用、そして自走化に至るまで、一貫してサポートいたします。「導入して終わり」ではなく、社内チームの育成を含めた長期的な成功を共に目指します。";
        }

        if (lowerText.includes('料金') || lowerText.includes('費用') || lowerText.includes('価格') || lowerText.includes('投資')) {
            return "プロジェクトの規模や内容に応じて、最適なプランをご提案いたします。オーダーメイドAIシステム開発、顧問サービス、業界横断共創ビジネスなど、お客様の課題とご予算に合わせた柔軟な対応が可能です。詳細についてはお問い合わせフォームよりご相談ください。";
        }

        if (lowerText.includes('期間') || lowerText.includes('納期') || lowerText.includes('スケジュール')) {
            return "プロジェクトの複雑さにより開発期間は異なりますが、小規模なAIエージェントで1ヶ月程度、大規模なRAGシステムで2〜3ヶ月程度を目安としています。段階的な開発アプローチにより、リスクを最小化しながら着実に成果を積み上げてまいります。";
        }

        if (lowerText.includes('共創') || lowerText.includes('パートナー') || lowerText.includes('協業')) {
            return "ShinAIでは、業界を横断した共創ビジネスを推進しています。パートナーシップを通じて、AI×データによる独自の価値を創造し、持続可能な社会の実現を目指しています。お客様と共に、新たな可能性を切り拓いてまいります。";
        }

        if (lowerText.includes('実績') || lowerText.includes('事例') || lowerText.includes('導入例')) {
            return "製造業、医療・福祉、金融、小売・EC、建設業など、幅広い業界でのAIシステム導入実績がございます。貴社の業界や課題に即した具体的な事例については、お問い合わせいただければ詳しくご説明いたします。守秘義務の範囲内で、参考となる情報を提供させていただきます。";
        }

        if (lowerText.includes('技術') || lowerText.includes('rag') || lowerText.includes('エージェント')) {
            return "ShinAIでは、大規模言語モデルの独自最適化、RAG（Retrieval Augmented Generation）システム、AIエージェント開発など、最新のAI技術を企業課題に適応させています。技術的な詳細や御社への適用可能性については、専門スタッフが丁寧にご説明いたします。";
        }

        // デフォルトレスポンス（押し付けない、寄り添う表現）
        const defaultResponses = [
            "ShinAIは、大規模言語モデルの独自最適化を強みとする企業向けAIシステム開発企業です。オーダーメイドAIシステム開発から顧問サービス、業界横断共創ビジネスまで、お客様の課題に合わせたサービスを展開しています。どのようなことでもお気軽にご相談ください。",
            "ベテラン社員の暗黙知をデータ化し、企業の知的財産として保護・活用。伴走型支援により、「導入して終わり」ではないAIシステム構築を実現します。具体的な課題やご要望がございましたら、お聞かせいただけますでしょうか。",
            "AI×データで独自の価値を創造し、お客様と共に持続可能な未来を築く。それがShinAIの目指す姿です。自走化まで寄り添う開発スタイルで、長期的な成功をサポートいたします。"
        ];

        return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
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

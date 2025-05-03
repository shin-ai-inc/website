// chatbot.js - placeholder JS
/**
 * ==============================================
 * // === component-split: ChatbotModule ===
 * COMPONENT: インタラクティブAIチャットボット
 * ==============================================
 */
const ChatbotModule = {
    toggle: null,
    container: null,
    closeBtn: null,
    messages: null,
    input: null,
    submitBtn: null,
    isTyping: false,
    defaultResponses: [
        "AIチャットボットについての詳細は、お問い合わせフォームよりお気軽にご連絡ください。",
        "AI導入についてのご相談は、専門のコンサルタントが対応いたします。無料相談フォームからお問い合わせください。",
        "AIソリューションについて詳しく知りたい場合は、資料をご用意しております。お気軽にお問い合わせください。",
        "ご質問ありがとうございます。より詳細なご提案をご希望の場合は、お問い合わせフォームよりご連絡ください。",
        "ShinAIのAIチャットボットは多言語対応、24時間稼働、カスタマイズ可能です。詳細はお問い合わせください。",
        "AI議事録ツール「カイロク」は、会議効率を高め、情報共有を強化します。ぜひ実際のデモをご覧ください。"
    ],
    
    init: function() {
        this.toggle = document.getElementById('chatbot-toggle');
        this.container = document.getElementById('chatbot-container');
        this.closeBtn = document.getElementById('chatbot-close');
        this.messages = document.getElementById('chatbot-messages');
        this.input = document.getElementById('chatbot-input-text');
        this.submitBtn = document.getElementById('chatbot-submit');
        
        if (!this.toggle || !this.container) return;
        
        this.toggle.addEventListener('click', this.toggleChat.bind(this));
        this.closeBtn.addEventListener('click', this.closeChat.bind(this));
        this.submitBtn.addEventListener('click', this.sendMessage.bind(this));
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        // トグルボタンをアニメーション
        this.animateToggleButton();
        
        // 初期のウェルカムメッセージが既にHTMLにある前提
        
        // 30秒後にプロアクティブメッセージを表示（ユーザーがまだ開いていない場合）
        setTimeout(() => {
            if (!this.container.classList.contains('active')) {
                this.showProactivePrompt();
            }
        }, 30000);
    },
    
    toggleChat: function() {
        const isOpen = this.container.classList.toggle('active');
        this.toggle.setAttribute('aria-expanded', isOpen);
        
        if (isOpen) {
            this.input.focus();
            this.announceToScreenReaders('チャットボットが開きました');
            
            // 既存のプロアクティブプロンプトを削除
            const proactivePrompt = document.querySelector('.chatbot-proactive');
            if (proactivePrompt) {
                proactivePrompt.remove();
            }
        }
    },
    
    closeChat: function() {
        this.container.classList.remove('active');
        this.toggle.setAttribute('aria-expanded', false);
        this.announceToScreenReaders('チャットボットが閉じました');
    },
    
    sendMessage: function() {
        const text = this.input.value.trim();
        if (!text || this.isTyping) return;
        
        // ユーザーメッセージを追加
        this.addMessage(text, 'user');
        this.input.value = '';
        
        // 入力中表示
        this.showTypingIndicator();
        
        // AIレスポンス（模擬）
        setTimeout(() => {
            this.hideTypingIndicator();
            
            // キーワードに基づく応答
            let response = this.getResponseBasedOnKeywords(text);
            this.addMessage(response, 'bot');
            
            // スクロールを最下部へ
            this.scrollToBottom();
        }, 1500);
    },
    
    getResponseBasedOnKeywords: function(text) {
        const lowerText = text.toLowerCase();
        
        // 基本的なキーワード検出
        if (lowerText.includes('チャットボット') || lowerText.includes('bot')) {
            return "当社のAIチャットボットは、24時間対応でお客様のお問い合わせに対応します。多言語対応、レスポンス最適化、柔軟なカスタマイズが可能で、導入にあたっては、お客様のサービスに合わせた設計をご提案させていただきます。";
        } else if (lowerText.includes('議事録') || lowerText.includes('会議') || lowerText.includes('カイロク')) {
            return "AI議事録作成サービス「カイロク」は、オンライン会議の内容を自動で文字起こしし、要点をまとめます。時間と手間を大幅に削減し、情報共有を効率化。重要な決定事項や行動項目を自動抽出し、的確なフォローアップを実現します。";
        } else if (lowerText.includes('コンサル') || lowerText.includes('戦略') || lowerText.includes('導入支援')) {
            return "AI戦略コンサルティングでは、お客様のビジネスに最適なAI導入計画を策定し、実装から運用までをサポートします。「やりっぱなしにしないAI導入」をモットーに、成果の定着と内製化の両立を目指します。まずは無料相談からお気軽にどうぞ。";
        } else if (lowerText.includes('料金') || lowerText.includes('価格') || lowerText.includes('費用')) {
            return "各サービスの料金は、導入規模や要件により異なります。業務自動化ソリューションは初期費用30万円〜、月額10万円〜、意思決定支援AIは初期費用45万円〜、月額15万円〜が目安となります。詳細はお問い合わせフォームよりご連絡いただくか、無料相談にてご案内させていただきます。";
        } else if (lowerText.includes('導入事例') || lowerText.includes('実績')) {
            return "これまで多くの企業様にAIソリューションを提供してきました。介護施設での記録業務効率化（作業時間35%減）、製造業での技能伝承支援（教育期間30%短縮）、自治体での市民対応チャットボット（問い合わせ応答率98%）など、業種別の導入事例について詳細な資料をご提供いたします。";
        } else if (lowerText.includes('会社') || lowerText.includes('企業')) {
            return "ShinAIは「真の価値を信じ、次世代のために新たな未来を創る」という理念のもと、最先端のAI技術で企業の課題解決を支援しています。技術だけでなく、人の感性や社会との調和を重視した「信じられるAI」の実現に取り組んでいます。";
        } else if (lowerText.includes('こんにちは') || lowerText.includes('はじめまして')) {
            return "こんにちは！ShinAIアシスタントです。AI導入や業務効率化についてのご質問があれば、お気軽にお聞きください。初回相談は無料で承っております。";
        } else if (lowerText.includes('いくら') || lowerText.includes('安く')) {
            return "ShinAIでは、お客様の規模や要件に合わせた柔軟な料金プランをご用意しています。小規模導入向けのスターターパッケージ（月額8万円〜）もございますので、ぜひお問い合わせフォームよりご相談ください。";
        } else if (lowerText.includes('デモ') || lowerText.includes('体験')) {
            return "サービスのデモをご希望ですね。各種AIソリューションのデモンストレーションをオンラインまたは貴社訪問にて行っております。まずはお問い合わせフォームより「デモ希望」とご記入の上、ご連絡ください。担当者が詳細をご案内いたします。";
        } else if (lowerText.includes('問い合わせ') || lowerText.includes('連絡')) {
            return "お問い合わせは、ページ上部のメニューにある「お問い合わせ」からフォームにアクセスいただくか、お電話（03-1234-5678、平日9:00〜18:00）、またはメール（shinai.life@gmail.com）にてお気軽にご連絡ください。";
        } else if (lowerText.includes('ありがとう')) {
            return "こちらこそありがとうございます。他にご質問やご不明点がございましたら、いつでもお気軽にお聞きください。ShinAIは御社のAI導入と業務効率化を全力でサポートいたします。";
        } else {
            // デフォルトレスポンス（ランダム）
            return this.defaultResponses[Math.floor(Math.random() * this.defaultResponses.length)];
        }
    },
    
    addMessage: function(text, type) {
        const message = document.createElement('div');
        message.classList.add('message', `${type}-message`);
        message.textContent = text;
        
        if (type === 'bot') {
            message.setAttribute('role', 'status');
        }
        
        this.messages.appendChild(message);
        this.scrollToBottom();
    },
    
    scrollToBottom: function() {
        this.messages.scrollTop = this.messages.scrollHeight;
    },
    
    showTypingIndicator: function() {
        this.isTyping = true;
        
        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('bot-typing');
        typingIndicator.id = 'bot-typing';
        
        // 3つのドットを追加
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            dot.classList.add('typing-dot');
            typingIndicator.appendChild(dot);
        }
        
        this.messages.appendChild(typingIndicator);
        this.scrollToBottom();
    },
    
    hideTypingIndicator: function() {
        this.isTyping = false;
        
        const typingIndicator = document.getElementById('bot-typing');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    },
    
    showProactivePrompt: function() {
        // 既に表示されている場合は何もしない
        if (document.querySelector('.chatbot-proactive')) return;
        
        const promptDiv = document.createElement('div');
        promptDiv.classList.add('chatbot-proactive');
        promptDiv.innerHTML = 'AIについてご質問がありますか？<br>お気軽にお問い合わせください！';
        
        // スタイル設定
        promptDiv.style.position = 'absolute';
        promptDiv.style.bottom = '80px';
        promptDiv.style.right = '10px';
        promptDiv.style.background = '#fff';
        promptDiv.style.padding = '10px 15px';
        promptDiv.style.borderRadius = '10px';
        promptDiv.style.boxShadow = '0 5px 20px rgba(142, 51, 255, 0.2)';
        promptDiv.style.fontSize = '0.9rem';
        promptDiv.style.maxWidth = '220px';
        promptDiv.style.animation = 'fadeInUp 0.5s ease forwards';
        promptDiv.style.cursor = 'pointer';
        promptDiv.style.zIndex = '1';
        
        // 吹き出しの尖った部分
        const arrow = document.createElement('div');
        arrow.style.position = 'absolute';
        arrow.style.bottom = '-8px';
        arrow.style.right = '20px';
        arrow.style.width = '0';
        arrow.style.height = '0';
        arrow.style.borderLeft = '8px solid transparent';
        arrow.style.borderRight = '8px solid transparent';
        arrow.style.borderTop = '8px solid #fff';
        
        promptDiv.appendChild(arrow);
        
        // クリックイベント
        promptDiv.addEventListener('click', () => {
            this.toggleChat();
            promptDiv.remove();
        });
        
        // チャットボットコンテナの親要素に追加
        this.toggle.parentNode.appendChild(promptDiv);
        
        // 30秒後に自動的に消える
        setTimeout(() => {
            if (promptDiv.parentNode) {
                promptDiv.style.animation = 'fadeInUp 0.5s ease reverse forwards';
                setTimeout(() => {
                    if (promptDiv.parentNode) {
                        promptDiv.remove();
                    }
                }, 500);
            }
        }, 30000);
    },
    
    animateToggleButton: function() {
        // 定期的に注目を集めるアニメーション
        setInterval(() => {
            if (!this.container.classList.contains('active')) {
                this.toggle.classList.add('attention');
                
                setTimeout(() => {
                    this.toggle.classList.remove('attention');
                }, 1000);
            }
        }, 20000); // 20秒ごと
    },
    
    announceToScreenReaders: function(message) {
        let ariaLive = document.querySelector('.sr-announcer');
        
        if (!ariaLive) {
            ariaLive = document.createElement('div');
            ariaLive.className = 'sr-announcer visually-hidden';
            ariaLive.setAttribute('aria-live', 'polite');
            document.body.appendChild(ariaLive);
        }
        
        ariaLive.textContent = message;
    }
};

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', function() {
    ChatbotModule.init();
});
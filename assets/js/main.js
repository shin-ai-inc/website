/**
 * @module Main
 * @description サイト全体の初期化と設定
 */
document.addEventListener('DOMContentLoaded', function() {
    // 現在年の自動更新
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // モジュールの初期化
    NavModule.init();
    ChatbotModule.init();
    FormModule.init();
    FAQModule.init();
    AnimationModule.init();
    BackToTopModule.init();
    
    // ヘッダースクロール検知
    window.addEventListener('scroll', function() {
        const header = document.getElementById('header');
        if (window.scrollY > 50) {
            header.classList.add('header-scrolled');
        } else {
            header.classList.remove('header-scrolled');
        }
    });
});

/**
 * @module NavModule
 * @description ナビゲーション関連の機能
 */
const NavModule = {
    init: function() {
        const menuToggle = document.getElementById('menu-toggle');
        const nav = document.getElementById('nav');
        
        if (menuToggle && nav) {
            menuToggle.addEventListener('click', function() {
                const isExpanded = nav.classList.toggle('active');
                menuToggle.setAttribute('aria-expanded', isExpanded);
                menuToggle.classList.toggle('active');
                
                if (isExpanded) {
                    menuToggle.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
                    menuToggle.setAttribute('aria-label', 'メニューを閉じる');
                } else {
                    menuToggle.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
                    menuToggle.setAttribute('aria-label', 'メニューを開く');
                }
            });
        }
        
        // スムーススクロール
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                
                // セクションへのリンク
                if (targetId.startsWith('#') && targetId !== '#') {
                    e.preventDefault();
                    
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        const headerOffset = document.getElementById('header').offsetHeight;
                        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                        
                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                    }
                    
                    // モバイルメニューを閉じる
                    if (nav.classList.contains('active') && menuToggle) {
                        menuToggle.click();
                    }
                }
            });
        });
        
        // PC版でのハンバーガーメニュー表示制御
        function checkWindowSize() {
            if (window.innerWidth >= 1024) {
                if (menuToggle) menuToggle.style.display = 'none';
                if (nav) nav.style.display = 'flex';
                if (nav) nav.classList.remove('active');
            } else {
                if (menuToggle) menuToggle.style.display = 'flex';
                if (nav) nav.style.display = nav.classList.contains('active') ? 'flex' : 'none';
            }
        }
        
        // 初期ロード時とリサイズ時にチェック
        checkWindowSize();
        window.addEventListener('resize', checkWindowSize);
    }
};

/**
 * @module FormModule
 * @description お問い合わせフォーム機能
 */
const FormModule = {
    form: null,
    
    init: function() {
        this.form = document.getElementById('contact-form');
        if (!this.form) return;
        
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // 入力フィールドのマイクロインタラクション
        const formControls = this.form.querySelectorAll('.form-control');
        formControls.forEach(control => {
            control.addEventListener('focus', () => this.handleFocus(control));
            control.addEventListener('blur', () => this.handleBlur(control));
        });
    },
    
    handleFocus: function(control) {
        const formGroup = control.closest('.form-group');
        if (formGroup) {
            const label = formGroup.querySelector('.form-label');
            if (label) {
                label.style.color = 'var(--purple-main)';
            }
            
            const icon = formGroup.querySelector('.input-icon');
            if (icon) {
                icon.style.color = 'var(--purple-main)';
            }
        }
    },
    
    handleBlur: function(control) {
        const formGroup = control.closest('.form-group');
        if (formGroup) {
            const label = formGroup.querySelector('.form-label');
            if (label) {
                label.style.color = '';
            }
            
            const icon = formGroup.querySelector('.input-icon');
            if (icon) {
                icon.style.color = '';
            }
        }
    },
    
    handleSubmit: function(e) {
        e.preventDefault();
        
        // バリデーション
        if (!this.validateForm()) return;
        
        // reCAPTCHA検証
        // 実際の実装では、以下のようにreCAPTCHAのトークンを取得してサーバーに送信します
        if (typeof grecaptcha !== 'undefined') {
            grecaptcha.ready(() => {
                grecaptcha.execute('your-recaptcha-site-key', {action: 'contact'})
                .then(token => {
                    // トークンをサーバーに送信する処理
                    // ここではデモとしてそのまま成功処理に進みます
                    this.submitFormSuccess();
                });
            });
        } else {
            // reCAPTCHAが読み込まれていない場合も、デモとして成功処理
            this.submitFormSuccess();
        }
    },
    
    submitFormSuccess: function() {
        // 送信ボタンを変更し、送信中状態に
        const submitBtn = this.form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> <span>送信中...</span>';
        submitBtn.disabled = true;
        
        // 送信成功の模擬（実際にはAPIを呼び出し）
        setTimeout(() => {
            submitBtn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> <span>送信完了</span>';
            submitBtn.style.backgroundImage = 'linear-gradient(135deg, #10B981, #4264DF)';
            
            this.showFormMessage();
            this.form.reset();
            
            // ボタンを元に戻す
            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.style.backgroundImage = '';
                submitBtn.disabled = false;
            }, 3000);
        }, 2000);
    },
    
    validateForm: function() {
        const requiredFields = this.form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                this.showFieldError(field, 'この項目は必須です');
                isValid = false;
            } else if (field.type === 'email' && !this.isValidEmail(field.value)) {
                this.showFieldError(field, '有効なメールアドレスを入力してください');
                isValid = false;
            } else {
                this.clearFieldError(field);
            }
        });
        
        return isValid;
    },
    
    isValidEmail: function(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },
    
    showFieldError: function(field, message) {
        // 既存のエラーを削除
        this.clearFieldError(field);
        
        field.classList.add('error');
        
        const errorId = field.id + '-error';
        const errorElement = document.getElementById(errorId);
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('active');
        }
        
        field.setAttribute('aria-invalid', 'true');
        
        // 最初のエラーフィールドにフォーカス
        if (!document.querySelector('.form-control.error:focus')) {
            field.focus();
        }
    },
    
    clearFieldError: function(field) {
        field.classList.remove('error');
        
        const errorId = field.id + '-error';
        const errorElement = document.getElementById(errorId);
        
        if (errorElement) {
            errorElement.classList.remove('active');
        }
        
        field.removeAttribute('aria-invalid');
    },
    
    showFormMessage: function() {
        const messageSuccess = document.getElementById('message-success');
        if (messageSuccess) {
            messageSuccess.classList.add('active');
            
            // スクロールして成功メッセージを表示
            messageSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // 一定時間後に消える
            setTimeout(() => {
                messageSuccess.classList.remove('active');
            }, 5000);
        }
    }
};

/**
 * @module FAQModule
 * @description よくある質問機能
 */
const FAQModule = {
    init: function() {
        const faqItems = document.querySelectorAll('.faq-item');
        
        if (!faqItems.length) return;
        
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            
            question.addEventListener('click', () => {
                // 他のアイテムを閉じる
                faqItems.forEach(otherItem => {
                    if (otherItem !== item && otherItem.classList.contains('active')) {
                        otherItem.classList.remove('active');
                        otherItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                    }
                });
                
                // 現在のアイテムのアクティブ状態を切り替え
                const isExpanded = item.classList.toggle('active');
                question.setAttribute('aria-expanded', isExpanded);
                
                // GSAP がある場合はアニメーション
                if (typeof gsap !== 'undefined') {
                    const answer = item.querySelector('.faq-answer');
                    
                    if (isExpanded) {
                        gsap.fromTo(answer, 
                            { height: 0, opacity: 0 }, 
                            { height: 'auto', opacity: 1, duration: 0.3, ease: 'power2.out' }
                        );
                    } else {
                        gsap.to(answer, { height: 0, opacity: 0, duration: 0.3, ease: 'power2.in' });
                    }
                }
            });
        });
    }
};

/**
 * @module ChatbotModule
 * @description インタラクティブAIチャットボット
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
        "AI導入についての詳細は、お問い合わせフォームよりお気軽にご連絡ください。",
        "AI導入についてのご相談は、専門のコンサルタントが対応いたします。無料相談フォームからお問い合わせください。",
        "AIソリューションについて詳しく知りたい場合は、資料をご用意しております。お気軽にお問い合わせください。",
        "ご質問ありがとうございます。より詳細なご提案をご希望の場合は、お問い合わせフォームよりご連絡ください。",
        "ShinAIのAIソリューションは、お客様のビジネスに合わせてカスタマイズ可能です。詳細はお問い合わせください。",
        "無料相談では、お客様の課題をヒアリングした上で、最適なAIソリューションをご提案いたします。ぜひお問い合わせください。"
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
    },
    
    toggleChat: function() {
        const isOpen = this.container.classList.toggle('active');
        this.toggle.setAttribute('aria-expanded', isOpen);
        
        if (isOpen) {
            this.input.focus();
        }
    },
    
    closeChat: function() {
        this.container.classList.remove('active');
        this.toggle.setAttribute('aria-expanded', false);
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
        }, 1500);
    },
    
    getResponseBasedOnKeywords: function(text) {
        const lowerText = text.toLowerCase();
        
        // 基本的なキーワード検出
        if (lowerText.includes('無料相談') || lowerText.includes('相談')) {
            return "無料相談は、お問い合わせフォームからお申し込みいただけます。AI導入に関するお悩みやご質問をお聞かせください。専門のコンサルタントが対応いたします。";
        } else if (lowerText.includes('費用') || lowerText.includes('料金')) {
            return "AIソリューションの費用は、導入規模や要件により異なります。基本的なプランは初期費用30万円〜、月額10万円〜となります。お客様のビジネスに最適なプランをご提案いたしますので、まずは無料相談からお気軽にお問い合わせください。";
        } else if (lowerText.includes('導入期間') || lowerText.includes('どのくらいかかる')) {
            return "AI導入の期間は、一般的なチャットボット導入なら1〜2ヶ月程度、業務プロセス全体に関わる大規模なシステムなら3〜6ヶ月程度が目安です。詳細は無料相談でお気軽にお問い合わせください。";
        } else if (lowerText.includes('メリット') || lowerText.includes('効果')) {
            return "AI導入の主なメリットには、業務効率化（作業の自動化による人的リソースの最適化）、コスト削減（24時間稼働による人件費削減）、データ分析による高度な意思決定支援、顧客体験の向上などがあります。貴社に最適なAI活用方法をご提案いたします。";
        } else if (lowerText.includes('会社概要') || lowerText.includes('shinai')) {
            return "ShinAIは「真の価値を信じ、次世代のために新たな未来を創る」という理念のもと、最先端のAI技術で企業の課題解決と成長支援を行っています。技術だけでなく使う人の視点を大切にした「人間中心AI設計」に力を入れているのが特徴です。";
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
        this.messages.scrollTop = this.messages.scrollHeight;
    },
    
    hideTypingIndicator: function() {
        this.isTyping = false;
        
        const typingIndicator = document.getElementById('bot-typing');
        if (typingIndicator) {
            typingIndicator.remove();
        }
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
    }
};

/**
 * @module AnimationModule
 * @description GSAPを使用した高度なアニメーション
 */
const AnimationModule = {
    init: function() {
        if (typeof gsap === 'undefined') return;
        
        if (typeof ScrollTrigger !== 'undefined') {
            gsap.registerPlugin(ScrollTrigger);
            
            // フォームの入場アニメーション
            gsap.from('.contact-form', {
                y: 50,
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: '.contact-grid',
                    start: 'top bottom-=100'
                }
            });
            
            // お問い合わせ情報の入場アニメーション
            gsap.from('.contact-info', {
                y: 50,
                opacity: 0,
                duration: 0.8,
                delay: 0.2,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: '.contact-grid',
                    start: 'top bottom-=100'
                }
            });
            
            // 地図の入場アニメーション
            gsap.from('.contact-map', {
                y: 30,
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: '.contact-map',
                    start: 'top bottom-=100'
                }
            });
            
            // FAQアイテムの連続アニメーション
            gsap.from('.faq-item', {
                y: 30,
                opacity: 0,
                duration: 0.6,
                stagger: 0.2,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: '.faq-container',
                    start: 'top bottom-=100'
                }
            });
            
            // CTAセクションのアニメーション
            gsap.from('.cta-title', {
                y: 30,
                opacity: 0,
                duration: 0.6,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: '.section-cta',
                    start: 'top bottom-=100'
                }
            });
            
            gsap.from('.cta-description', {
                y: 30,
                opacity: 0,
                duration: 0.6,
                delay: 0.2,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: '.section-cta',
                    start: 'top bottom-=100'
                }
            });
            
            gsap.from('.cta-buttons', {
                y: 30,
                opacity: 0,
                duration: 0.6,
                delay: 0.4,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: '.section-cta',
                    start: 'top bottom-=100'
                }
            });
        }
    }
};

/**
 * @module BackToTopModule
 * @description トップへ戻るボタン機能
 */
const BackToTopModule = {
    init: function() {
        const backToTop = document.getElementById('back-to-top');
        if (!backToTop) return;
        
        // スクロール時の表示制御
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                backToTop.classList.add('active');
            } else {
                backToTop.classList.remove('active');
            }
        });
        
        // クリックイベント
        backToTop.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
};

/**
 * reCAPTCHA検証コールバック
 */
function onRecaptchaVerified(token) {
    console.log('reCAPTCHA token:', token);
    // 実際にはこのトークンをサーバーサイドで検証します
}
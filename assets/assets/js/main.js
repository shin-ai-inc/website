// main.js - placeholder JS
/**
 * ==============================================
 * // === component-split: Main ===
 * COMPONENT: メインJavaScriptモジュール
 * ==============================================
 */
document.addEventListener('DOMContentLoaded', function() {
    // 現在年の自動更新
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // モジュールの初期化
    NavModule.init();
    HeroSlideshow.init();
    AnimationModule.init();
    FormModule.init();
    
    // 初期ロード時のアニメーション
    setTimeout(function() {
        document.body.classList.add('loaded');
    }, 500);
});

/**
 * ==============================================
 * // === component-split: Nav ===
 * COMPONENT: ナビゲーション関連の機能
 * ==============================================
 */
const NavModule = {
    header: null,
    menuToggle: null,
    nav: null,
    
    init: function() {
        this.header = document.getElementById('header');
        this.menuToggle = document.getElementById('menu-toggle');
        this.nav = document.getElementById('nav');
        
        // メニュートグル機能
        if (this.menuToggle && this.nav) {
            this.menuToggle.addEventListener('click', this.toggleMenu.bind(this));
        }
        
        // スクロール検知
        window.addEventListener('scroll', this.handleScroll.bind(this));
        
        // スムーススクロール
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', this.smoothScroll.bind(this));
        });
        
        // 現在のページをアクティブに
        this.setActivePage();
    },
    
    toggleMenu: function() {
        const isExpanded = this.nav.classList.toggle('active');
        this.menuToggle.setAttribute('aria-expanded', isExpanded);
        this.menuToggle.classList.toggle('active');
        
        if (isExpanded) {
            this.menuToggle.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
            this.menuToggle.setAttribute('aria-label', 'メニューを閉じる');
        } else {
            this.menuToggle.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
            this.menuToggle.setAttribute('aria-label', 'メニューを開く');
        }
    },
    
    handleScroll: function() {
        if (window.scrollY > 50) {
            this.header.classList.add('header-scrolled');
        } else {
            this.header.classList.remove('header-scrolled');
        }
    },
    
    smoothScroll: function(e) {
        const targetId = e.currentTarget.getAttribute('href');
        
        // セクションへのリンク
        if (targetId.startsWith('#')) {
            e.preventDefault();
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerOffset = this.header.offsetHeight;
                const targetPosition = targetElement.offsetTop - headerOffset;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
            
            // モバイルメニューを閉じる
            if (this.nav.classList.contains('active')) {
                this.toggleMenu();
            }
        }
    },
    
    setActivePage: function() {
        // 現在のページパスを取得
        const currentPath = window.location.pathname;
        
        // ナビゲーションリンクをループして現在のページを確認
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            
            // インデックスページ（ホーム）の場合
            if (currentPath === '/' || currentPath === '/index.html') {
                if (href === 'index.html' || href === './index.html' || href === '/') {
                    link.classList.add('active');
                    link.setAttribute('aria-current', 'page');
                }
            } 
            // 他のページの場合
            else if (href.includes(currentPath) || currentPath.includes(href)) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            }
        });
    }
};

/**
 * ==============================================
 * // === component-split: HeroSlideshow ===
 * COMPONENT: ヒーロー背景画像の自動切り替え
 * ==============================================
 */
const HeroSlideshow = {
    images: [],
    currentIndex: 0,
    
    init: function() {
        this.images = document.querySelectorAll('.hero-bg');
        if (!this.images.length) return;
        
        // 初期表示は最初の画像のみ
        this.images[0].classList.add('active');
        
        // 5秒ごとに画像を切り替え
        setInterval(() => {
            this.nextImage();
        }, 5000);
    },
    
    nextImage: function() {
        // 現在の画像を非表示
        this.images[this.currentIndex].classList.remove('active');
        
        // 次の画像インデックスを計算
        this.currentIndex = (this.currentIndex + 1) % this.images.length;
        
        // 次の画像を表示
        this.images[this.currentIndex].classList.add('active');
    }
};

/**
 * ==============================================
 * // === component-split: Animation ===
 * COMPONENT: GSAPを使用した高度なアニメーション
 * ==============================================
 */
const AnimationModule = {
    init: function() {
        if (typeof gsap === 'undefined') return;
        
        // スクロールトリガーの設定
        if (typeof ScrollTrigger !== 'undefined') {
            gsap.registerPlugin(ScrollTrigger);
        }
        
        // ヘッダーフェードイン
        gsap.from('.header', {
            opacity: 0,
            y: -50,
            duration: 1,
            ease: 'power3.out'
        });
        
        // ヒーローセクションのアニメーション
        this.animateHero();
        
        // セクションのアニメーション
        this.animateSections();
        
        // カードのアニメーション
        this.animateCards();
    },
    
    animateHero: function() {
        const hero = document.querySelector('.hero');
        if (!hero) return;
        
        // テキスト要素のアニメーション
        gsap.from('.hero-label', {
            opacity: 0,
            y: 30,
            duration: 1,
            delay: 0.2,
            ease: 'power3.out'
        });
        
        gsap.from('.hero-title', {
            opacity: 0,
            y: 30,
            duration: 1,
            delay: 0.4,
            ease: 'power3.out'
        });
        
        gsap.from('.hero-description', {
            opacity: 0,
            y: 30,
            duration: 1,
            delay: 0.6,
            ease: 'power3.out'
        });
        
        gsap.from('.hero-quote', {
            opacity: 0,
            y: 30,
            duration: 1,
            delay: 0.8,
            ease: 'power3.out'
        });
        
        gsap.from('.hero-cta', {
            opacity: 0,
            y: 30,
            duration: 1,
            delay: 1,
            ease: 'power3.out'
        });
    },
    
    animateSections: function() {
        // セクションタイトルのアニメーション
        gsap.utils.toArray('.section-title').forEach(title => {
            gsap.from(title, {
                opacity: 0,
                y: 50,
                duration: 1,
                scrollTrigger: {
                    trigger: title,
                    start: 'top bottom-=100',
                    toggleActions: 'play none none none'
                }
            });
        });
        
        // サブタイトルのアニメーション
        gsap.utils.toArray('.subtitle, .section-description').forEach(subtitle => {
            gsap.from(subtitle, {
                opacity: 0,
                y: 30,
                duration: 1,
                delay: 0.3,
                scrollTrigger: {
                    trigger: subtitle,
                    start: 'top bottom-=100',
                    toggleActions: 'play none none none'
                }
            });
        });
    },
    
    animateCards: function() {
        // 3Dカードのアニメーション
        gsap.utils.toArray('.card-3d').forEach((card, index) => {
            gsap.from(card, {
                opacity: 0,
                y: 50,
                duration: 0.8,
                delay: index * 0.2,
                scrollTrigger: {
                    trigger: card,
                    start: 'top bottom-=50',
                    toggleActions: 'play none none none'
                }
            });
        });
        
        // フィーチャーブロックのアニメーション
        gsap.utils.toArray('.feature').forEach((feature, index) => {
            gsap.from(feature, {
                opacity: 0,
                y: 50,
                duration: 0.8,
                delay: index * 0.2,
                scrollTrigger: {
                    trigger: feature,
                    start: 'top bottom-=50',
                    toggleActions: 'play none none none'
                }
            });
        });
        
        // 業界カードのアニメーション
        gsap.utils.toArray('.industry-card').forEach((card, index) => {
            gsap.from(card, {
                opacity: 0,
                y: 50,
                duration: 0.8,
                delay: index * 0.15,
                scrollTrigger: {
                    trigger: card,
                    start: 'top bottom-=50',
                    toggleActions: 'play none none none'
                }
            });
        });
    }
};

/**
 * ==============================================
 * // === component-split: FormModule ===
 * COMPONENT: お問い合わせフォーム機能
 * ==============================================
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
        }
    },
    
    handleBlur: function(control) {
        const formGroup = control.closest('.form-group');
        if (formGroup) {
            const label = formGroup.querySelector('.form-label');
            if (label) {
                label.style.color = '';
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
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> 送信中...';
        submitBtn.disabled = true;
        
        // 送信成功の模擬（実際にはAPIを呼び出し）
        setTimeout(() => {
            submitBtn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> 送信完了';
            submitBtn.style.backgroundColor = '#10B981';
            
            this.showFormMessage();
            this.form.reset();
            
            // ボタンを元に戻す
            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.style.backgroundColor = '';
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
        
        const errorMessage = document.createElement('div');
        errorMessage.className = 'field-error';
        errorMessage.style.color = '#EF4444';
        errorMessage.style.fontSize = '0.85rem';
        errorMessage.style.marginTop = '0.25rem';
        errorMessage.textContent = message;
        
        field.parentNode.appendChild(errorMessage);
        field.setAttribute('aria-invalid', 'true');
        
        // エラー時の視覚的フィードバック
        field.style.borderColor = '#EF4444';
        
        // 最初のエラーフィールドにフォーカス
        if (document.querySelectorAll('.field-error').length === 1) {
            field.focus();
        }
    },
    
    clearFieldError: function(field) {
        const errorMessage = field.parentNode.querySelector('.field-error');
        if (errorMessage) {
            errorMessage.remove();
        }
        
        field.removeAttribute('aria-invalid');
        field.style.borderColor = '';
    },
    
    showFormMessage: function() {
        const messageSuccess = document.getElementById('message-success');
        if (messageSuccess) {
            messageSuccess.classList.add('active');
            
            // 一定時間後に消える
            setTimeout(() => {
                messageSuccess.classList.remove('active');
            }, 5000);
        }
    }
};

/**
 * ==============================================
 * // === component-split: Card3D ===
 * COMPONENT: 3Dカードのチルトエフェクト
 * ==============================================
 */
const Card3DModule = {
    cards: null,
    
    init: function() {
        this.cards = document.querySelectorAll('.card-3d');
        
        if (!this.cards.length) return;
        
        this.cards.forEach(card => {
            const content = card.querySelector('.card-3d-content');
            
            // マウス移動イベント
            card.addEventListener('mousemove', e => this.handleMouseMove(e, card, content));
            
            // マウスが離れた時のリセット
            card.addEventListener('mouseleave', () => this.resetTilt(content));
            
            // タッチデバイス対応
            card.addEventListener('touchmove', e => this.handleTouchMove(e, card, content));
            card.addEventListener('touchend', () => this.resetTilt(content));
        });
    },
    
    handleMouseMove: function(e, card, content) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // カードの中心からの距離を計算
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (centerY - y) / 20;
        const rotateY = (x - centerX) / 20;
        
        content.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    },
    
    handleTouchMove: function(e, card, content) {
        // シングルタッチのみ
        if (e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        const rect = card.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // カードの中心からの距離を計算
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (centerY - y) / 30; // タッチ用に感度調整
        const rotateY = (x - centerX) / 30;
        
        content.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    },
    
    resetTilt: function(content) {
        content.style.transform = 'rotateX(0deg) rotateY(0deg)';
    }
};

// reCAPTCHA検証コールバック
function onRecaptchaVerified(token) {
    // トークンを使用して検証処理を実行
    console.log('reCAPTCHA verified with token:', token);
    // 実際の実装では、このトークンをサーバーに送信して検証します
}
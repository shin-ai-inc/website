/**
 * ==============================================
 * ShinAI - メインJavaScriptモジュール
 * 目的: ウェブサイト全体の機能を制御する中枢モジュール
 * バージョン: 2.0.0
 * 最終更新: 2025-01-15
 * ==============================================
 */

// グローバル名前空間を汚染しないため即時関数で囲む
(function() {
    'use strict';

    // ドキュメント読み込み完了時に実行
    document.addEventListener('DOMContentLoaded', function() {
        // 現在年の自動更新
        updateCurrentYear();
        
        // 各モジュールの初期化
        AppCore.init();
        
        // ページ特有の機能を初期化
        initPageSpecificFeatures();
        
        // プリローダーを非表示
        hidePreloader();
    });

    // ウィンドウ読み込み完了時に実行
    window.addEventListener('load', function() {
        // 遅延ロード画像の処理
        handleLazyImages();
        
        // モバイルデバイスの特別な処理
        if (window.innerWidth <= 768) {
            initMobileSpecificFeatures();
        }
    });

    /**
     * 現在の年をフッターに設定
     */
    function updateCurrentYear() {
        const yearElement = document.getElementById('current-year');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }

    /**
     * プリローダーのフェードアウト
     */
    function hidePreloader() {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            setTimeout(function() {
                preloader.classList.add('loaded');
                
                // アクセシビリティのために完全に削除
                setTimeout(function() {
                    preloader.style.display = 'none';
                    document.body.classList.add('loaded');
                }, 500);
            }, 500);
        }
    }

    /**
     * 画像の遅延読み込み処理
     */
    function handleLazyImages() {
        if ('loading' in HTMLImageElement.prototype) {
            // ネイティブの遅延読み込みをサポートしているブラウザ
            const lazyImages = document.querySelectorAll('img[loading="lazy"]');
            lazyImages.forEach(img => {
                // データ属性から実際のソースに切り替え
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                }
                if (img.dataset.srcset) {
                    img.srcset = img.dataset.srcset;
                }
            });
        } else {
            // ネイティブサポートのないブラウザのためのフォールバック
            const lazyImageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const lazyImage = entry.target;
                        if (lazyImage.dataset.src) {
                            lazyImage.src = lazyImage.dataset.src;
                        }
                        if (lazyImage.dataset.srcset) {
                            lazyImage.srcset = lazyImage.dataset.srcset;
                        }
                        lazyImage.classList.remove('lazy');
                        observer.unobserve(lazyImage);
                    }
                });
            });

            const lazyImages = document.querySelectorAll('.lazy');
            lazyImages.forEach(lazyImage => {
                lazyImageObserver.observe(lazyImage);
            });
        }
    }

    /**
     * ページ特有の機能を初期化
     */
    function initPageSpecificFeatures() {
        // 現在のページパスを取得
        const currentPath = window.location.pathname;
        
        // ホームページ特有の機能
        if (currentPath === '/' || currentPath.includes('index.html')) {
            // ヒーロースライドショーの初期化
            if (typeof HeroSlideshow !== 'undefined') {
                HeroSlideshow.init();
            }
            
            // Swiperスライダーの初期化 (業界別AIセクション)
            initSwiper();
        }
        
        // サービスページ特有の機能
        if (currentPath.includes('services.html')) {
            // サービスタブの初期化など
            if (typeof ServiceTabsModule !== 'undefined') {
                ServiceTabsModule.init();
            }
        }
        
        // お問い合わせページ特有の機能
        if (currentPath.includes('contact.html')) {
            // フォームバリデーションの初期化
            if (typeof FormModule !== 'undefined') {
                FormModule.init();
            }
        }
    }

    /**
     * Swiperスライダーの初期化
     */
    function initSwiper() {
        if (typeof Swiper !== 'undefined') {
            new Swiper(".mySwiper", {
                slidesPerView: 1,
                spaceBetween: 20,
                loop: true,
                autoplay: {
                    delay: 5000,
                    disableOnInteraction: false,
                },
                pagination: {
                    el: ".swiper-pagination",
                    clickable: true,
                },
                navigation: {
                    nextEl: ".swiper-button-next",
                    prevEl: ".swiper-button-prev",
                },
                breakpoints: {
                    640: {
                        slidesPerView: 1,
                        spaceBetween: 20,
                    },
                    768: {
                        slidesPerView: 2,
                        spaceBetween: 30,
                    },
                    1024: {
                        slidesPerView: 3,
                        spaceBetween: 30,
                    },
                },
                a11y: {
                    prevSlideMessage: '前のスライド',
                    nextSlideMessage: '次のスライド',
                    firstSlideMessage: '最初のスライド',
                    lastSlideMessage: '最後のスライド',
                    paginationBulletMessage: 'スライド {{index}}へ移動',
                }
            });
        }
    }

    /**
     * モバイルデバイス特有の機能
     */
    function initMobileSpecificFeatures() {
        // スワイプナビゲーションの初期化
        const swipeContainer = document.querySelector('.swipe-container');
        if (swipeContainer) {
            initSwipeNavigation();
        }
        
        // サファリ対応のビューポート高さ修正
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        window.addEventListener('resize', () => {
            document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        });
    }

    /**
     * スワイプナビゲーションの初期化
     */
    function initSwipeNavigation() {
        const swipeWrapper = document.getElementById('swipe-wrapper');
        const slides = document.querySelectorAll('.swipe-slide');
        const pagination = document.querySelectorAll('.swipe-pagination-bullet');
        
        if (!swipeWrapper || !slides.length || !pagination.length) return;
        
        let currentSlide = 0;
        let isTransitioning = false;
        let touchStartY = 0;
        let touchEndY = 0;
        
        // タッチスタートイベント
        document.addEventListener('touchstart', function(e) {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        // タッチムーブイベント - デフォルトイベントをキャンセル
        document.addEventListener('touchmove', function(e) {
            if (isTransitioning) return;
            if (e.cancelable) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // タッチエンドイベント
        document.addEventListener('touchend', function(e) {
            if (isTransitioning) return;
            
            touchEndY = e.changedTouches[0].clientY;
            const swipeDistance = touchStartY - touchEndY;
            const swipeThreshold = 50;
            
            if (Math.abs(swipeDistance) > swipeThreshold) {
                if (swipeDistance > 0 && currentSlide < slides.length - 1) {
                    // スワイプアップ（次のスライドへ）
                    goToSlide(currentSlide + 1);
                } else if (swipeDistance < 0 && currentSlide > 0) {
                    // スワイプダウン（前のスライドへ）
                    goToSlide(currentSlide - 1);
                }
            }
        }, { passive: true });
        
        // マウスホイールイベント
        document.addEventListener('wheel', function(e) {
            if (isTransitioning) return;
            if (e.cancelable) {
                e.preventDefault();
            }
            
            if (e.deltaY > 0 && currentSlide < slides.length - 1) {
                // 下方向へのスクロール
                goToSlide(currentSlide + 1);
            } else if (e.deltaY < 0 && currentSlide > 0) {
                // 上方向へのスクロール
                goToSlide(currentSlide - 1);
            }
        }, { passive: false });
        
        // ページネーションのクリックイベント
        pagination.forEach((bullet, index) => {
            bullet.addEventListener('click', () => {
                goToSlide(index);
            });
            
            // アクセシビリティ対応
            bullet.setAttribute('role', 'button');
            bullet.setAttribute('aria-label', `スライド ${index + 1}へ移動`);
            bullet.setAttribute('tabindex', '0');
            
            // キーボード操作対応
            bullet.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    goToSlide(index);
                }
            });
        });
        
        // スライド移動関数
        function goToSlide(index) {
            if (isTransitioning || index === currentSlide) return;
            
            isTransitioning = true;
            currentSlide = index;
            
            // 全ページネーションボタンのアクティブ状態を解除
            pagination.forEach(bullet => {
                bullet.classList.remove('active');
                bullet.setAttribute('aria-current', 'false');
            });
            
            // 対象のページネーションボタンをアクティブに
            pagination[index].classList.add('active');
            pagination[index].setAttribute('aria-current', 'true');
            
            // スライドの移動
            swipeWrapper.style.transform = `translateY(${-100 * index}vh)`;
            
            // ヒーローセクションの特殊処理
            if (index === 0) {
                document.body.classList.add('hero-in-view');
            } else {
                document.body.classList.remove('hero-in-view');
            }
            
            // トランジション完了後の処理
            setTimeout(() => {
                isTransitioning = false;
            }, 500);
        }
    }

    /**
     * アプリケーションコアモジュール
     * 全ページで共通の機能を管理
     */
    const AppCore = {
        init: function() {
            // 共通コンポーネントの初期化
            this.initNav();
            this.initScrollAnimations();
            this.initBackToTop();
            
            // リサイズイベントの最適化
            this.setupResizeHandler();
            
            // アクセシビリティ機能の強化
            this.enhanceAccessibility();
        },
        
        /**
         * ナビゲーション関連の初期化
         */
        initNav: function() {
            const header = document.getElementById('header');
            const menuToggle = document.getElementById('menu-toggle');
            const nav = document.getElementById('nav');
            
            if (!header || !menuToggle || !nav) return;
            
            // メニュー開閉ハンドラー
            menuToggle.addEventListener('click', function() {
                const expanded = this.getAttribute('aria-expanded') === 'true';
                this.setAttribute('aria-expanded', !expanded);
                nav.classList.toggle('active');
                
                // アイコン切り替え
                if (!expanded) {
                    this.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
                    this.setAttribute('aria-label', 'メニューを閉じる');
                } else {
                    this.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
                    this.setAttribute('aria-label', 'メニューを開く');
                }
                
                // スクロール制御
                document.body.classList.toggle('menu-open');
            });
            
            // スクロールによるヘッダー変更
            window.addEventListener('scroll', function() {
                if (window.scrollY > 50) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
            });
            
            // 現在のページをナビゲーションで強調表示
            this.setActivePage();
            
            // スムーススクロール
            this.initSmoothScroll();
        },
        
        /**
         * 現在のページをナビゲーションで強調表示
         */
        setActivePage: function() {
            const currentPath = window.location.pathname;
            const navLinks = document.querySelectorAll('.nav-link');
            
            navLinks.forEach(link => {
                const href = link.getAttribute('href');
                
                // ホームページ対応
                if (currentPath === '/' || currentPath === '/index.html') {
                    if (href === 'index.html' || href === './index.html' || href === '/') {
                        link.classList.add('active');
                        link.setAttribute('aria-current', 'page');
                    }
                } 
                // その他のページ対応
                else if (href && (href.includes(currentPath) || currentPath.includes(href))) {
                    link.classList.add('active');
                    link.setAttribute('aria-current', 'page');
                }
            });
        },
        
        /**
         * スムーススクロール機能の初期化
         */
        initSmoothScroll: function() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function(e) {
                    const targetId = this.getAttribute('href');
                    
                    // 実際のアンカーへのリンクのみ処理
                    if (targetId === '#') return;
                    
                    e.preventDefault();
                    
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        const headerHeight = document.querySelector('.header').offsetHeight;
                        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                        
                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                        
                        // スクロール後にフォーカスを移動（アクセシビリティ対応）
                        targetElement.setAttribute('tabindex', '-1');
                        targetElement.focus({ preventScroll: true });
                        
                        // モバイルメニューを閉じる
                        const nav = document.getElementById('nav');
                        const menuToggle = document.getElementById('menu-toggle');
                        if (nav && nav.classList.contains('active')) {
                            nav.classList.remove('active');
                            menuToggle.setAttribute('aria-expanded', 'false');
                            menuToggle.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
                            menuToggle.setAttribute('aria-label', 'メニューを開く');
                            document.body.classList.remove('menu-open');
                        }
                    }
                });
            });
        },
        
        /**
         * スクロールアニメーションの初期化
         */
        initScrollAnimations: function() {
            const animatedElements = document.querySelectorAll('.animate-on-scroll');
            
            if (animatedElements.length === 0) return;
            
            // IntersectionObserverの設定
            const observerOptions = {
                threshold: 0.15,
                rootMargin: '0px 0px -100px 0px'
            };
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                        
                        // パフォーマンス向上のため、アニメーション完了後に監視を停止
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);
            
            // 各要素の監視を開始
            animatedElements.forEach(el => {
                observer.observe(el);
            });
        },
        
        /**
         * トップに戻るボタンの初期化
         */
        initBackToTop: function() {
            const backToTopButton = document.getElementById('back-to-top');
            
            if (!backToTopButton) return;
            
            // スクロール位置に応じてボタン表示/非表示
            window.addEventListener('scroll', function() {
                if (window.scrollY > 300) {
                    backToTopButton.classList.add('active');
                } else {
                    backToTopButton.classList.remove('active');
                }
            });
            
            // ボタンクリック処理
            backToTopButton.addEventListener('click', function() {
                // モバイルのスワイプナビゲーション対応
                if (window.innerWidth <= 768 && document.querySelector('.swipe-container')) {
                    const pagination = document.querySelectorAll('.swipe-pagination-bullet');
                    if (pagination.length > 0) {
                        pagination[0].click();
                    }
                } else {
                    // 通常のスクロールトップ
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                }
            });
            
            // アクセシビリティ強化
            backToTopButton.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
            });
        },
        
        /**
         * アクセシビリティの強化
         */
        enhanceAccessibility: function() {
            // Escキーでモーダル・ドロップダウンの閉じる処理
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    // チャットボットを閉じる
                    const chatbotContainer = document.getElementById('chatbot-container');
                    const chatbotToggle = document.getElementById('chatbot-toggle');
                    if (chatbotContainer && chatbotContainer.classList.contains('active')) {
                        chatbotContainer.classList.remove('active');
                        chatbotToggle.classList.remove('hidden');
                        chatbotToggle.setAttribute('aria-expanded', 'false');
                    }
                    
                    // ナビゲーションメニューを閉じる
                    const nav = document.getElementById('nav');
                    const menuToggle = document.getElementById('menu-toggle');
                    if (nav && nav.classList.contains('active')) {
                        nav.classList.remove('active');
                        menuToggle.setAttribute('aria-expanded', 'false');
                        menuToggle.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
                        menuToggle.setAttribute('aria-label', 'メニューを開く');
                        document.body.classList.remove('menu-open');
                    }
                }
            });
            
            // フォーカストラップの実装（モーダル用）
            this.setupFocusTraps();
        },
        
        /**
         * フォーカストラップの設定
         */
        setupFocusTraps: function() {
            // チャットボットコンテナのフォーカストラップ
            const chatbotContainer = document.getElementById('chatbot-container');
            if (chatbotContainer) {
                this.createFocusTrap(chatbotContainer);
            }
            
            // ナビゲーションメニューのフォーカストラップ
            const nav = document.getElementById('nav');
            if (nav) {
                this.createFocusTrap(nav);
            }
        },
        
        /**
         * フォーカストラップの作成
         * @param {HTMLElement} element - フォーカスをトラップする要素
         */
        createFocusTrap: function(element) {
            element.addEventListener('keydown', function(e) {
                // Tab キーが押された場合
                if (e.key === 'Tab') {
                    const focusableElements = element.querySelectorAll(
                        'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
                    );
                    
                    if (focusableElements.length === 0) return;
                    
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];
                    
                    // Shift + Tab がフォーカス可能な最初の要素で押された場合
                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                    // Tab が最後の要素で押された場合
                    else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            });
        },
        
        /**
         * リサイズイベントハンドラの設定（デバウンス処理）
         */
        setupResizeHandler: function() {
            let resizeTimer;
            
            window.addEventListener('resize', function() {
                clearTimeout(resizeTimer);
                
                resizeTimer = setTimeout(function() {
                    // ビューポート変更時の処理
                    handleViewportChange();
                }, 250);
            });
            
            function handleViewportChange() {
                const isMobileView = window.innerWidth <= 768;
                
                // モバイルビューの処理
                if (isMobileView) {
                    // モバイル特有の処理
                    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
                } else {
                    // デスクトップビューに戻った時の処理
                    const swipeWrapper = document.getElementById('swipe-wrapper');
                    if (swipeWrapper) {
                        swipeWrapper.style.transform = '';
                    }
                    
                    // ナビゲーションメニューのリセット
                    const nav = document.getElementById('nav');
                    const menuToggle = document.getElementById('menu-toggle');
                    
                    if (nav && nav.classList.contains('active')) {
                        nav.classList.remove('active');
                        if (menuToggle) {
                            menuToggle.setAttribute('aria-expanded', 'false');
                            menuToggle.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
                        }
                    }
                }
                
                // Swiperの更新
                if (typeof Swiper !== 'undefined' && window.swiper) {
                    window.swiper.update();
                }
            }
        }
    };

    // GSAP アニメーションモジュール - メイン読み込み後に初期化される
    window.AnimationModule = {
        init: function() {
            if (typeof gsap === 'undefined') return;
            
            // スクロールトリガーの設定
            if (typeof ScrollTrigger !== 'undefined') {
                gsap.registerPlugin(ScrollTrigger);
                this.initScrollTrigger();
            }
            
            // ヒーローセクションのアニメーション
            this.animateHero();
            
            // その他のセクションアニメーション
            this.animateSections();
        },
        
        initScrollTrigger: function() {
            // スクロールトリガーの共通設定
            ScrollTrigger.config({
                autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load,resize'
            });
            
            // スクロール位置をURLハッシュと同期
            ScrollTrigger.addEventListener('scrollEnd', () => {
                const sections = document.querySelectorAll('section[id]');
                
                for (let i = 0; i < sections.length; i++) {
                    const section = sections[i];
                    const rect = section.getBoundingClientRect();
                    
                    // ビューポートの上部付近に表示されているセクションを検出
                    if (rect.top > -100 && rect.top < 200) {
                        const id = section.getAttribute('id');
                        if (id) {
                            history.replaceState(null, null, `#${id}`);
                            break;
                        }
                    }
                }
            });
        },
        
        animateHero: function() {
            const hero = document.querySelector('.hero');
            if (!hero) return;
            
            // ヒーローセクションの各要素をアニメーション
            gsap.from('.hero-label', {
                opacity: 0,
                y: 30,
                duration: 0.8,
                delay: 0.3,
                ease: 'power3.out'
            });
            
            gsap.from('.hero-title', {
                opacity: 0,
                y: 30,
                duration: 0.8,
                delay: 0.5,
                ease: 'power3.out'
            });
            
            gsap.from('.hero-description', {
                opacity: 0,
                y: 30,
                duration: 0.8,
                delay: 0.7,
                ease: 'power3.out'
            });
            
            gsap.from('.hero-cta', {
                opacity: 0,
                y: 30,
                duration: 0.8,
                delay: 0.9,
                ease: 'power3.out'
            });
            
            gsap.from('.hero-tagline', {
                opacity: 0,
                y: 20,
                duration: 0.8,
                delay: 1.1,
                ease: 'power3.out'
            });
            
            // 浮遊エレメントのアニメーション
            gsap.to('.floating-element', {
                y: 'random(-20, 20)',
                x: 'random(-20, 20)',
                rotation: 'random(-5, 5)',
                duration: 'random(5, 8)',
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                stagger: 0.2
            });
        },
        
        animateSections: function() {
            // セクションヘッダーのアニメーション
            gsap.utils.toArray('.section-header').forEach(header => {
                gsap.from(header, {
                    opacity: 0,
                    y: 50,
                    duration: 0.8,
                    scrollTrigger: {
                        trigger: header,
                        start: 'top bottom-=100',
                        toggleActions: 'play none none none'
                    }
                });
            });
            
            // カードのアニメーション（遅延をつけて順番に表示）
            const cardSelector = '.service-preview-card, .industry-card, .vision-card, .benefit-card';
            gsap.utils.toArray(cardSelector).forEach((card, index) => {
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
            
            // フィーチャーのアニメーション
            gsap.utils.toArray('.ai-escort-feature').forEach((feature, index) => {
                gsap.from(feature, {
                    opacity: 0,
                    x: -30,
                    duration: 0.6,
                    delay: index * 0.2,
                    scrollTrigger: {
                        trigger: feature,
                        start: 'top bottom-=50',
                        toggleActions: 'play none none none'
                    }
                });
            });
        }
    };

    // ヒーロースライドショーモジュール
    window.HeroSlideshow = {
        images: [],
        currentIndex: 0,
        interval: null,
        
        init: function() {
            this.images = document.querySelectorAll('.hero-bg');
            if (!this.images.length) return;
            
            // 初期表示は最初の画像
            this.images[0].classList.add('active');
            
            // 画像の自動切り替え開始
            this.startSlideshow();
            
            // アクセシビリティ対応
            this.enhanceAccessibility();
        },
        
        startSlideshow: function() {
            // 前回の実行があれば解除
            if (this.interval) {
                clearInterval(this.interval);
            }
            
            // 5秒ごとに画像を切り替え
            this.interval = setInterval(() => {
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
        },
        
        enhanceAccessibility: function() {
            // スライドショー用のARIA属性
            const container = document.querySelector('.hero-bg-container');
            if (container) {
                container.setAttribute('aria-label', 'ヒーロースライドショー');
                container.setAttribute('role', 'region');
            }
            
            // 各画像にARIA属性を追加
            this.images.forEach((image, index) => {
                image.setAttribute('aria-hidden', index === 0 ? 'false' : 'true');
                
                // 画像が切り替わる際にaria-hidden属性を更新する
                image.addEventListener('transitionstart', () => {
                    const isActive = image.classList.contains('active');
                    image.setAttribute('aria-hidden', isActive ? 'false' : 'true');
                });
            });
        }
    };
})();

/**
 * ==============================================
 * イベントスケジュール
 * - DOMContentLoaded: AppCore.init()
 * - load: ビジュアル表示完了後の処理
 * - scroll: スクロール検知処理
 * - resize: リサイズ対応（デバウンス処理付き）
 * ==============================================
 */
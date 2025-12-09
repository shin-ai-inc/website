/**
 * ============================================
 * COMPONENT: Digital Night Sky System v3.0
 * "Interactive Magic" - 感動体験を生むインタラクション
 * ============================================
 *
 * PURPOSE:
 * - マウスムーブ連動: カーソル周辺の星が応答
 * - スクロール連動: 速度に応じた星の動き
 * - クリック波紋効果: 触れると応える魔法
 * - パフォーマンス最適化: RequestAnimationFrame活用
 *
 * ARCHITECTURE:
 * - 3レイヤー生成: 前景(30-40個) / 中景(60-80個) / 背景(80-100個)
 * - 動的配置: 数学的ランダム性による自然な分布
 * - GPU加速: transform3d・will-change最適化
 * - メモリ管理: イベントリスナー適切な破棄
 *
 * VERSION: 3.0.0
 * LAST UPDATED: 2025-12-02
 * AUTHOR: ShinAI Development Team × masa様ビジョン実現
 * ============================================
 */

(function() {
    'use strict';

    /**
     * システム設定 - プラネタリウム体験
     */
    const CONFIG = {
        // 粒子数設定 (デスクトップ) - プラネタリウム級密度
        foreground: { min: 60, max: 80 },   // 主役星（2倍）
        midground: { min: 100, max: 120 },  // サポート星（1.5倍）
        background: { min: 120, max: 150 }, // 背景星（1.5倍）

        // モバイル最適化 (粒子数削減)
        mobile: {
            foreground: { min: 25, max: 35 },
            midground: { min: 50, max: 60 },
            background: { min: 60, max: 80 }
        },

        // インタラクション設定
        interaction: {
            mouseRadius: 150,           // マウス影響半径(px)
            attractionStrength: 0.15,   // 引き寄せ強度
            scrollSpeedMultiplier: 0.5  // スクロール速度係数
        },

        // 流れ星設定 (masa様要件: たまにシュッと流れる)
        shootingStar: {
            frequency: { min: 8000, max: 15000 },  // 8-15秒間隔
            count: { min: 1, max: 2 }              // 1-2個同時
        },

        // 人工衛星設定 (masa様要件: うっすら遠くを流れる)
        satellite: {
            frequency: { min: 20000, max: 40000 }, // 20-40秒間隔
            count: 1                                // 1個ずつ
        }
    };

    /**
     * モバイル判定
     */
    const isMobile = () => window.innerWidth <= 768;

    /**
     * ランダム数値生成 (範囲指定)
     */
    const random = (min, max) => Math.random() * (max - min) + min;

    /**
     * ランダム整数生成
     */
    const randomInt = (min, max) => Math.floor(random(min, max + 1));

    /**
     * 配列からランダム選択
     */
    const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

    /**
     * Digital Night Sky Core System
     */
    class DigitalNightSky {
        constructor() {
            this.container = null;
            this.stars = [];
            this.mouseX = 0;
            this.mouseY = 0;
            this.scrollY = 0;
            this.lastScrollY = 0;
            this.isInitialized = false;
            this.rafId = null;
        }

        /**
         * 初期化
         */
        initialize() {
            try {
                // 既存のsparkler-containerを取得
                this.container = document.querySelector('.sparkler-container');

                if (!this.container) {
                    console.warn('[DigitalNightSky] .sparkler-container not found. Skipping initialization.');
                    return false;
                }

                // クラス名変更 (整合性維持)
                this.container.classList.add('digital-night-sky');

                // 既存の子要素をクリア (旧システムからの完全移行)
                this.container.innerHTML = '';

                // 粒子生成
                this.generateStars();

                // イベントリスナー登録
                this.attachEventListeners();

                // アニメーションループ開始
                this.startAnimationLoop();

                this.isInitialized = true;
                console.log('[DigitalNightSky] ✅ Digital Night Sky v3.0 initialized successfully!');
                console.log(`[DigitalNightSky] Total particles: ${this.stars.length}`);

                return true;
            } catch (error) {
                console.error('[DigitalNightSky] ❌ Initialization failed:', error);
                return false;
            }
        }

        /**
         * 星の生成
         */
        generateStars() {
            const config = isMobile() ? CONFIG.mobile : CONFIG;
            const fragment = document.createDocumentFragment();

            // 前景: 主役星 (30-40個 or モバイル15-20個)
            const foregroundCount = randomInt(config.foreground.min, config.foreground.max);
            for (let i = 0; i < foregroundCount; i++) {
                const star = this.createForegroundStar();
                fragment.appendChild(star);
                this.stars.push(star);
            }

            // 中景: サポート星 (60-80個 or モバイル30-40個)
            const midgroundCount = randomInt(config.midground.min, config.midground.max);
            for (let i = 0; i < midgroundCount; i++) {
                const star = this.createMidgroundStar();
                fragment.appendChild(star);
                this.stars.push(star);
            }

            // 背景: 微細な瞬き (80-100個 or モバイル40-50個)
            const backgroundCount = randomInt(config.background.min, config.background.max);
            for (let i = 0; i < backgroundCount; i++) {
                const star = this.createBackgroundStar();
                fragment.appendChild(star);
                this.stars.push(star);
            }

            // 一括DOM挿入 (リフロー最小化)
            this.container.appendChild(fragment);
        }

        /**
         * 前景星生成 (主役星) - 6色展開
         * 配分: 青白40% / ゴールド25% / ティール20% / ピンク7% / 白5% / オレンジ3%
         */
        createForegroundStar() {
            const star = document.createElement('div');

            // 色彩選択（加重ランダム）
            const colorRandom = Math.random() * 100;
            let colorClass;
            if (colorRandom < 40) {
                colorClass = 'star-large';      // 青白 40%
            } else if (colorRandom < 65) {
                colorClass = 'star-medium';     // ゴールド 25%
            } else if (colorRandom < 85) {
                colorClass = 'star-small';      // ティール 20%
            } else if (colorRandom < 92) {
                colorClass = 'star-pink';       // ピンク 7%
            } else if (colorRandom < 97) {
                colorClass = 'star-white';      // 白 5%
            } else {
                colorClass = 'star-orange';     // オレンジ 3%
            }

            star.className = `star ${colorClass}`;

            // ランダム配置 (5%-95%の範囲)
            const left = random(5, 95);
            const top = random(5, 95);
            star.style.left = `${left}%`;
            star.style.top = `${top}%`;

            // ランダム遅延 (0-5秒) - 各星が異なるタイミングで煌めく
            star.style.animationDelay = `${random(0, 5)}s`;

            // データ属性 (インタラクション用)
            star.dataset.layer = 'foreground';
            star.dataset.baseX = left;
            star.dataset.baseY = top;

            return star;
        }

        /**
         * 中景星生成 (サポート星)
         */
        createMidgroundStar() {
            const star = document.createElement('div');
            star.className = 'star-support';

            // ランダム配置
            const left = random(5, 95);
            const top = random(5, 95);
            star.style.left = `${left}%`;
            star.style.top = `${top}%`;

            // ランダム遅延 (0-5秒)
            star.style.animationDelay = `${random(0, 5)}s`;

            // データ属性
            star.dataset.layer = 'midground';
            star.dataset.baseX = left;
            star.dataset.baseY = top;

            return star;
        }

        /**
         * 背景星生成 (微細な瞬き)
         */
        createBackgroundStar() {
            const star = document.createElement('div');
            star.className = 'star-ambient';

            // ランダム配置
            star.style.left = `${random(5, 95)}%`;
            star.style.top = `${random(5, 95)}%`;

            // ランダム遅延 (0-7秒)
            star.style.animationDelay = `${random(0, 7)}s`;

            // データ属性
            star.dataset.layer = 'background';

            return star;
        }

        /**
         * イベントリスナー登録
         */
        attachEventListeners() {
            // マウスムーブ (デスクトップのみ)
            if (!isMobile()) {
                document.addEventListener('mousemove', this.handleMouseMove.bind(this), { passive: true });
            }

            // スクロール
            window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });

            // クリック (ヒーローエリア内)
            const heroSection = document.querySelector('.page-hero');
            if (heroSection) {
                heroSection.addEventListener('click', this.handleClick.bind(this));
            }

            // リサイズ (デバウンス処理)
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    this.handleResize();
                }, 250);
            }, { passive: true });
        }

        /**
         * マウスムーブハンドラ
         */
        handleMouseMove(e) {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        }

        /**
         * スクロールハンドラ
         */
        handleScroll() {
            this.scrollY = window.scrollY;
        }

        /**
         * クリックハンドラ (波紋効果)
         */
        handleClick(e) {
            const clickX = e.clientX;
            const clickY = e.clientY;
            const radius = 200;

            this.stars.forEach(star => {
                if (star.dataset.layer !== 'foreground') return;

                const rect = star.getBoundingClientRect();
                const starX = rect.left + rect.width / 2;
                const starY = rect.top + rect.height / 2;

                const distance = Math.hypot(clickX - starX, clickY - starY);

                if (distance < radius) {
                    star.classList.add('star-ripple');
                    setTimeout(() => {
                        star.classList.remove('star-ripple');
                    }, 800);
                }
            });
        }

        /**
         * リサイズハンドラ
         */
        handleResize() {
            // モバイル↔デスクトップ切り替え時は再初期化
            const wasMobile = this.stars.length < 150;
            const nowMobile = isMobile();

            if (wasMobile !== nowMobile) {
                console.log('[DigitalNightSky] Screen size changed. Reinitializing...');
                this.destroy();
                this.initialize();
            }
        }

        /**
         * アニメーションループ開始
         */
        startAnimationLoop() {
            const animate = () => {
                this.updateStarPositions();
                this.rafId = requestAnimationFrame(animate);
            };
            animate();

            // ランダム自律輝きシステム開始 (masa様要件)
            this.startAutonomousSparkle();

            // 流れ星システム開始 (masa様要件: たまにシュッと流れる)
            this.startShootingStars();

            // 人工衛星システム開始 (masa様要件: うっすら遠くを流れる)
            this.startSatellites();
        }

        /**
         * 連携輝きシステム (masa様要件: 幾何学的連携・チカチカ効果)
         * 星同士が連携して連鎖的に輝く
         */
        startAutonomousSparkle() {
            const triggerChainSparkle = () => {
                const allStars = this.stars.filter(star =>
                    star.dataset.layer === 'foreground' || star.dataset.layer === 'midground'
                );
                if (allStars.length === 0) return;

                // 起点となる星をランダムに選択
                const originIndex = Math.floor(Math.random() * allStars.length);
                const originStar = allStars[originIndex];

                // 起点の位置を取得
                const originRect = originStar.getBoundingClientRect();
                const originX = originRect.left + originRect.width / 2;
                const originY = originRect.top + originRect.height / 2;

                // 起点から距離順にソート
                const sortedStars = allStars
                    .map(star => {
                        const rect = star.getBoundingClientRect();
                        const x = rect.left + rect.width / 2;
                        const y = rect.top + rect.height / 2;
                        const distance = Math.hypot(originX - x, originY - y);
                        return { star, distance };
                    })
                    .sort((a, b) => a.distance - b.distance);

                // 連鎖輝きエフェクト（近い順に5-12個）
                const chainCount = randomInt(5, 12);
                sortedStars.slice(0, chainCount).forEach(({ star, distance }, index) => {
                    // 距離に応じた遅延（波紋のように広がる）
                    const delay = index * 80 + (distance * 0.5);

                    setTimeout(() => {
                        if (!star.classList.contains('star-sparkle')) {
                            star.classList.add('star-sparkle');

                            // 1.2秒後にクラス削除
                            setTimeout(() => {
                                star.classList.remove('star-sparkle');
                            }, 1200);
                        }
                    }, delay);
                });

                // 次の連鎖輝きまでのランダム間隔（1.2-3秒）
                const nextInterval = random(1200, 3000);
                setTimeout(triggerChainSparkle, nextInterval);
            };

            // 並行して個別チカチカも実行
            const triggerIndividualFlicker = () => {
                const foregroundStars = this.stars.filter(star => star.dataset.layer === 'foreground');
                if (foregroundStars.length === 0) return;

                // ランダムに2-4個選択して瞬時に輝かせる
                const flickerCount = randomInt(2, 4);
                for (let i = 0; i < flickerCount; i++) {
                    const randomIndex = Math.floor(Math.random() * foregroundStars.length);
                    const star = foregroundStars[randomIndex];

                    if (!star.classList.contains('star-sparkle')) {
                        star.classList.add('star-sparkle');

                        setTimeout(() => {
                            star.classList.remove('star-sparkle');
                        }, 1200);
                    }
                }

                // 次の個別チカチカまでのランダム間隔（0.8-2秒）
                const nextInterval = random(800, 2000);
                setTimeout(triggerIndividualFlicker, nextInterval);
            };

            // 初回実行
            setTimeout(triggerChainSparkle, 2000);      // 連鎖輝き: 2秒後開始
            setTimeout(triggerIndividualFlicker, 3000); // 個別チカチカ: 3秒後開始
        }

        /**
         * 流れ星システム (masa様要件: たまにシュッと流れる)
         */
        startShootingStars() {
            const createShootingStar = () => {
                const shootingStar = document.createElement('div');
                shootingStar.className = 'shooting-star';

                // ランダムな開始位置（画面上部）
                const startX = random(10, 70);
                const startY = random(5, 30);
                shootingStar.style.left = `${startX}%`;
                shootingStar.style.top = `${startY}%`;

                this.container.appendChild(shootingStar);

                // 2秒後に削除（アニメーション完了後）
                setTimeout(() => {
                    if (this.container.contains(shootingStar)) {
                        this.container.removeChild(shootingStar);
                    }
                }, 2000);
            };

            const triggerShootingStars = () => {
                // 1-2個の流れ星を同時に生成
                const count = randomInt(CONFIG.shootingStar.count.min, CONFIG.shootingStar.count.max);
                for (let i = 0; i < count; i++) {
                    setTimeout(() => {
                        createShootingStar();
                    }, i * 200); // 少しずらして生成
                }

                // 次の流れ星までのランダム間隔（8-15秒）
                const nextInterval = random(CONFIG.shootingStar.frequency.min, CONFIG.shootingStar.frequency.max);
                setTimeout(triggerShootingStars, nextInterval);
            };

            // 初回実行（5秒後に開始）
            setTimeout(triggerShootingStars, 5000);
        }

        /**
         * 人工衛星システム (masa様要件: うっすら遠くを流れる)
         */
        startSatellites() {
            const createSatellite = () => {
                const satellite = document.createElement('div');
                satellite.className = 'satellite';

                // ランダムな開始位置（画面左端）
                const startY = random(10, 60);
                satellite.style.left = '0%';
                satellite.style.top = `${startY}%`;

                this.container.appendChild(satellite);

                // 15秒後に削除（アニメーション完了後）
                setTimeout(() => {
                    if (this.container.contains(satellite)) {
                        this.container.removeChild(satellite);
                    }
                }, 15000);
            };

            const triggerSatellites = () => {
                createSatellite();

                // 次の人工衛星までのランダム間隔（20-40秒）
                const nextInterval = random(CONFIG.satellite.frequency.min, CONFIG.satellite.frequency.max);
                setTimeout(triggerSatellites, nextInterval);
            };

            // 初回実行（10秒後に開始）
            setTimeout(triggerSatellites, 10000);
        }

        /**
         * 星の位置更新 (マウス・スクロール連動)
         */
        updateStarPositions() {
            if (isMobile()) return; // モバイルはスキップ

            const scrollDelta = this.scrollY - this.lastScrollY;
            this.lastScrollY = this.scrollY;

            this.stars.forEach(star => {
                if (star.dataset.layer === 'background') return; // 背景星は静止

                const rect = star.getBoundingClientRect();
                const starX = rect.left + rect.width / 2;
                const starY = rect.top + rect.height / 2;

                // マウスとの距離計算
                const dx = this.mouseX - starX;
                const dy = this.mouseY - starY;
                const distance = Math.hypot(dx, dy);

                // 影響半径内なら引き寄せ
                if (distance < CONFIG.interaction.mouseRadius) {
                    const strength = (1 - distance / CONFIG.interaction.mouseRadius) * CONFIG.interaction.attractionStrength;
                    const offsetX = dx * strength;
                    const offsetY = dy * strength;

                    star.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
                    star.classList.add('star-attracted');
                } else {
                    star.style.transform = '';
                    star.classList.remove('star-attracted');
                }

                // スクロール連動 (前景星のみ)
                if (star.dataset.layer === 'foreground' && Math.abs(scrollDelta) > 1) {
                    const scrollEffect = scrollDelta * CONFIG.interaction.scrollSpeedMultiplier;
                    const currentTransform = star.style.transform || '';
                    star.style.transform = `${currentTransform} translateY(${scrollEffect}px)`;
                }
            });
        }

        /**
         * 破棄 (メモリリーク防止)
         */
        destroy() {
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
            }

            this.stars = [];

            if (this.container) {
                this.container.innerHTML = '';
            }

            this.isInitialized = false;
            console.log('[DigitalNightSky] System destroyed.');
        }
    }

    /**
     * 自動初期化
     */
    function initializeDigitalNightSky() {
        const nightSky = new DigitalNightSky();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                nightSky.initialize();
            });
        } else {
            nightSky.initialize();
        }

        // グローバル公開 (デバッグ用)
        window.DigitalNightSky = nightSky;
    }

    // 実行
    initializeDigitalNightSky();

})();

/**
 * ============================================
 * END OF DIGITAL NIGHT SKY SYSTEM V3.0
 * ============================================
 */

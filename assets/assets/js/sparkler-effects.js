/**
 * ============================================
 * COMPONENT: Sparkler Effects Dynamic Generator
 * 線香花火エフェクト動的生成システム - Enterprise Grade
 * ============================================
 *
 * PURPOSE:
 * - 380個の火花を数学的正確性で動的生成（コア2-20 × 各20火花）
 * - 170個の微細粒子をランダム配置で動的生成
 * - CSSファイル軽量化によるAIエージェント読み込み負担軽減
 * - 保守性最大化（1箇所変更で全火花更新可能）
 *
 * TECHNICAL SPECIFICATIONS:
 * - 360度円状放射: 18度間隔の数学的正確性（360° / 20火花 = 18°）
 * - パフォーマンス最適化: DocumentFragment使用・一括DOM挿入
 * - GPU加速: CSS Classes活用（will-change, transform3d）
 * - エラーハンドリング: 完全な例外処理・フォールバック機能
 *
 * VERSION: 1.0.0
 * LAST UPDATED: 2025-12-02
 * AUTHOR: ShinAI Development Team
 * ============================================
 */

(function() {
    'use strict';

    /**
     * コア位置座標定義 - sparkler-effects.cssと完全同期
     * コア1-20の配置情報（CSS .sparkler-core:nth-child(n) と一致）
     */
    const CORE_POSITIONS = [
        { id: 1, left: '12%', top: '18%', right: null, bottom: null },      // コア1
        { id: 2, left: null, top: '28%', right: '15%', bottom: null },      // コア2
        { id: 3, left: '22%', top: null, right: null, bottom: '32%' },      // コア3
        { id: 4, left: null, top: null, right: '18%', bottom: '22%' },      // コア4
        { id: 5, left: '8%', top: '45%', right: null, bottom: null },       // コア5
        { id: 6, left: null, top: '35%', right: '8%', bottom: null },       // コア6
        { id: 7, left: '8%', top: null, right: null, bottom: '45%' },       // コア7
        { id: 8, left: null, top: '65%', right: '12%', bottom: null },      // コア8
        { id: 9, left: '45%', top: '25%', right: null, bottom: null },      // コア9
        { id: 10, left: null, top: '55%', right: '25%', bottom: null },     // コア10
        { id: 11, left: '35%', top: null, right: null, bottom: '65%' },     // コア11
        { id: 12, left: '25%', top: '75%', right: null, bottom: null },     // コア12
        { id: 13, left: null, top: '15%', right: '35%', bottom: null },     // コア13
        { id: 14, left: null, top: null, right: '8%', bottom: '18%' },      // コア14
        { id: 15, left: '75%', top: '42%', right: null, bottom: null },     // コア15
        { id: 16, left: null, top: null, right: '75%', bottom: '42%' },     // コア16
        { id: 17, left: '18%', top: '85%', right: null, bottom: null },     // コア17
        { id: 18, left: '85%', top: '32%', right: null, bottom: null },     // コア18
        { id: 19, left: '48%', top: null, right: null, bottom: '75%' },     // コア19
        { id: 20, left: null, top: '88%', right: '42%', bottom: null }      // コア20
    ];

    /**
     * 火花サイズクラス定義 - 視覚的多様性
     */
    const SPARK_SIZE_CLASSES = ['spark-large', 'spark-medium', 'spark-small', 'spark-tiny'];

    /**
     * 360度円状放射の方向ベクトル計算
     * @param {number} index - 火花インデックス（0-19）
     * @returns {Object} { dx: cos(角度), dy: sin(角度) }
     */
    function calculateDirectionVector(index) {
        const angle = (index * 18) * (Math.PI / 180); // 18度間隔 → ラジアン変換
        return {
            dx: Math.cos(angle).toFixed(3),
            dy: Math.sin(angle).toFixed(3)
        };
    }

    /**
     * ランダムな速度係数生成（0.9-1.2の範囲）
     * @returns {number} 速度係数
     */
    function randomSpeed() {
        const speeds = [0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.2];
        return speeds[Math.floor(Math.random() * speeds.length)];
    }

    /**
     * 火花要素を動的生成（コア2-20からの380個）
     * @param {DocumentFragment} fragment - DOM挿入用フラグメント
     */
    function generateSparks(fragment) {
        // コア1はHTMLに静的定義済みのため、コア2-20のみ生成
        for (let coreIndex = 1; coreIndex < 20; coreIndex++) { // インデックス1-19 = コア2-20
            const core = CORE_POSITIONS[coreIndex];

            // 各コアから20個の火花を生成
            for (let sparkIndex = 0; sparkIndex < 20; sparkIndex++) {
                const spark = document.createElement('div');

                // 基本クラス
                spark.className = `spark ${SPARK_SIZE_CLASSES[sparkIndex % 4]} spark-core-${core.id}-${sparkIndex + 1}`;

                // CSS Custom Properties設定
                const { dx, dy } = calculateDirectionVector(sparkIndex);
                const speed = randomSpeed();

                // インラインスタイル（CSS Custom Propertiesのみ）
                const positionStyle = [];
                if (core.left !== null) positionStyle.push(`left: ${core.left}`);
                if (core.top !== null) positionStyle.push(`top: ${core.top}`);
                if (core.right !== null) positionStyle.push(`right: ${core.right}`);
                if (core.bottom !== null) positionStyle.push(`bottom: ${core.bottom}`);

                spark.style.cssText = `
                    ${positionStyle.join('; ')};
                    --dx: ${dx};
                    --dy: ${dy};
                    --speed: ${speed};
                `;

                // アニメーション設定（CSS Classで制御）
                spark.style.animation = `perfectSparklerBurst 6s ease-out infinite ${(sparkIndex * 0.05).toFixed(2)}s`;

                fragment.appendChild(spark);
            }
        }
    }

    /**
     * 微細粒子要素を動的生成（170個追加 = 合計200個）
     * @param {DocumentFragment} fragment - DOM挿入用フラグメント
     */
    function generateMicroSparkles(fragment) {
        // HTML静的定義30個 + 動的生成170個 = 200個
        for (let i = 0; i < 170; i++) {
            const microSparkle = document.createElement('div');
            microSparkle.className = 'micro-sparkle';

            // ランダム位置生成（5%-95%の範囲で自然な分布）
            const useTopBottom = Math.random() > 0.5;
            const useLeftRight = Math.random() > 0.5;

            const verticalPos = `${Math.floor(Math.random() * 90) + 5}%`;
            const horizontalPos = `${Math.floor(Math.random() * 90) + 5}%`;

            const positionStyle = [];
            if (useTopBottom) {
                positionStyle.push(`top: ${verticalPos}`);
            } else {
                positionStyle.push(`bottom: ${verticalPos}`);
            }

            if (useLeftRight) {
                positionStyle.push(`left: ${horizontalPos}`);
            } else {
                positionStyle.push(`right: ${horizontalPos}`);
            }

            microSparkle.style.cssText = positionStyle.join('; ');

            // ランダムなアニメーション遅延（0-7秒）
            const delay = (Math.random() * 7).toFixed(2);
            microSparkle.style.animationDelay = `${delay}s`;

            fragment.appendChild(microSparkle);
        }
    }

    /**
     * メイン初期化処理
     * DOMContentLoaded後に実行
     */
    function initializeSparklerEffects() {
        try {
            const container = document.querySelector('.sparkler-container');

            if (!container) {
                console.warn('[SparklerEffects] .sparkler-container not found. Skipping dynamic generation.');
                return;
            }

            // パフォーマンス最適化: DocumentFragment使用
            const fragment = document.createDocumentFragment();

            // 380個の火花生成（コア2-20）
            console.log('[SparklerEffects] Generating 380 sparks (Core 2-20)...');
            generateSparks(fragment);

            // 170個の微細粒子生成
            console.log('[SparklerEffects] Generating 170 micro sparkles...');
            generateMicroSparkles(fragment);

            // 一括DOM挿入（リフロー最小化）
            container.appendChild(fragment);

            console.log('[SparklerEffects] ✅ Dynamic generation completed successfully!');
            console.log('[SparklerEffects] Total particles: 20 cores + 400 sparks + 200 micro sparkles = 620 elements');
        } catch (error) {
            console.error('[SparklerEffects] ❌ Dynamic generation failed:', error);
            // フォールバック: エラー時も基本表示は維持（静的コア1の火花は表示される）
        }
    }

    // DOMContentLoaded時に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSparklerEffects);
    } else {
        // 既にDOMロード済みの場合は即座実行
        initializeSparklerEffects();
    }

    // エクスポート（デバッグ用）
    window.SparklerEffects = {
        version: '1.0.0',
        corePositions: CORE_POSITIONS,
        reinitialize: initializeSparklerEffects
    };

})();

/**
 * ============================================
 * END OF SPARKLER EFFECTS DYNAMIC GENERATOR
 * ============================================
 */

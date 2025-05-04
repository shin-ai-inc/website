/**
 * Three.js パーティクルアニメーション
 * ================================================
 * 
 * 概要:
 * Three.jsを使用して、高品質な3Dパーティクルアニメーションを実現します。
 * 幾何学的なパターンでAIビジネスの先進性と技術力を表現します。
 * 
 * 機能:
 * - WebGLを利用した高パフォーマンスな3Dレンダリング
 * - マウス操作による視点操作
 * - スクロールに応じたアニメーション調整
 * - モバイルデバイスでの最適化とフォールバック
 */

// モジュールスコープを作成して変数の衝突を防止
const ThreeParticles = (function() {
    // プライベート変数
    let camera, scene, renderer;
    let particles, positions, colors;
    let particleSystem;
    let raycaster, intersects;
    let windowHalfX, windowHalfY;
    let mouseX = 0, mouseY = 0;
    let targetMouseX = 0, targetMouseY = 0;
    
    // 設定パラメータ
    const params = {
        particleCount: 6000,
        particleSize: 3.5,
        defaultAnimationSpeed: 0.02,
        mouseInfluenceDistance: 150,
        mouseInfluenceStrength: 0.6,
        connectionDistance: 140,
        connectionOpacity: 0.15,
        colorPalette: [
            { r: 142/255, g: 51/255, b: 255/255 }, // purple-main
            { r: 66/255, g: 100/255, b: 223/255 }, // blue-mid
            { r: 38/255, g: 216/255, b: 222/255 }, // cyan-light
            { r: 183/255, g: 35/255, b: 239/255 }  // purple-bright
        ],
        active: true,
        mobile: {
            particleCount: 2000,
            particleSize: 2.5,
            connectionDistance: 100
        }
    };
    
    // 初期化関数
    function init() {
        // パーティクルコンテナの取得
        const container = document.getElementById('particles');
        
        // コンテナがなければ何もしない（他のページでも呼び出せるようにするため）
        if (!container) return;
        
        // モバイルデバイスかどうかを判定し、パラメータを調整
        if (window.innerWidth < 768) {
            adjustForMobile();
        }
        
        // 画面サイズの設定
        windowHalfX = window.innerWidth / 2;
        windowHalfY = window.innerHeight / 2;
        
        // Three.jsの基本セットアップ
        setupThreeJs(container);
        
        // パーティクルシステムの作成
        createParticleSystem();
        
        // イベントリスナーの設定
        setupEventListeners();
        
        // アニメーションスタート
        animate();
    }
    
    // モバイルデバイス用に設定を調整
    function adjustForMobile() {
        params.particleCount = params.mobile.particleCount;
        params.particleSize = params.mobile.particleSize;
        params.connectionDistance = params.mobile.connectionDistance;
    }
    
    // Three.jsの基本セットアップ
    function setupThreeJs(container) {
        // カメラの作成
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 5000);
        camera.position.z = 1000;
        
        // シーンの作成
        scene = new THREE.Scene();
        
        // レンダラーの作成
        renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);
        
        // レイキャスター（マウスピッキング用）
        raycaster = new THREE.Raycaster();
        intersects = [];
    }
    
    // パーティクルシステムの作成
    function createParticleSystem() {
        // ジオメトリの作成
        const geometry = new THREE.BufferGeometry();
        
        // 位置と色の配列を初期化
        positions = new Float32Array(params.particleCount * 3);
        colors = new Float32Array(params.particleCount * 3);
        
        // パーティクルの位置と色を設定
        for (let i = 0; i < params.particleCount; i++) {
            const i3 = i * 3;
            
            // 分布はやや平らな円柱状に
            const radius = 700 + Math.random() * 300;
            const theta = Math.random() * Math.PI * 2;
            const y = (Math.random() - 0.5) * 2000;
            
            positions[i3] = radius * Math.cos(theta);     // x
            positions[i3 + 1] = y;                        // y
            positions[i3 + 2] = radius * Math.sin(theta); // z
            
            // 色をランダムに設定
            const colorIndex = Math.floor(Math.random() * params.colorPalette.length);
            const color = params.colorPalette[colorIndex];
            
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }
        
        // バッファ属性を設定
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        // マテリアルの作成
        const material = new THREE.PointsMaterial({
            size: params.particleSize,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        // テクスチャの作成
        const textureLoader = new THREE.TextureLoader();
        material.map = textureLoader.load('/assets/images/particle.png', () => {
            material.needsUpdate = true;
        });
        
        // パーティクルシステムの作成
        particleSystem = new THREE.Points(geometry, material);
        scene.add(particleSystem);
    }
    
    // イベントリスナーの設定
    function setupEventListeners() {
        document.addEventListener('mousemove', onDocumentMouseMove);
        document.addEventListener('touchstart', onDocumentTouchStart);
        document.addEventListener('touchmove', onDocumentTouchMove);
        window.addEventListener('resize', onWindowResize);
    }
    
    // マウス移動イベントのハンドラー
    function onDocumentMouseMove(event) {
        mouseX = event.clientX - windowHalfX;
        mouseY = event.clientY - windowHalfY;
    }
    
    // タッチ開始イベントのハンドラー
    function onDocumentTouchStart(event) {
        if (event.touches.length === 1) {
            event.preventDefault();
            mouseX = event.touches[0].pageX - windowHalfX;
            mouseY = event.touches[0].pageY - windowHalfY;
        }
    }
    
    // タッチ移動イベントのハンドラー
    function onDocumentTouchMove(event) {
        if (event.touches.length === 1) {
            event.preventDefault();
            mouseX = event.touches[0].pageX - windowHalfX;
            mouseY = event.touches[0].pageY - windowHalfY;
        }
    }
    
    // ウィンドウリサイズイベントのハンドラー
    function onWindowResize() {
        windowHalfX = window.innerWidth / 2;
        windowHalfY = window.innerHeight / 2;
        
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // モバイルデバイスかどうかを再判定
        if (window.innerWidth < 768) {
            // すでに作成されているパーティクルシステムは変更しない
            // （リサイズのたびに再作成すると処理が重くなるため）
        }
    }
    
    // アニメーションループ
    function animate() {
        requestAnimationFrame(animate);
        render();
    }
    
    // レンダリング処理
    function render() {
        if (!params.active) return;
        
        // マウス位置へ緩やかに追従
        targetMouseX = mouseX * 0.001;
        targetMouseY = -mouseY * 0.001;
        
        // カメラを回転させる（非常に弱い回転）
        camera.rotation.x += (targetMouseY - camera.rotation.x) * 0.01;
        camera.rotation.y += (targetMouseX - camera.rotation.y) * 0.01;
        
        // スクロール位置に基づいてパーティクルシステムの回転を調整
        const scrollY = window.scrollY || window.pageYOffset;
        const scrollFactor = scrollY / 5000; // スクロール変化係数
        
        // パーティクルシステムをゆっくり回転
        particleSystem.rotation.y += params.defaultAnimationSpeed * 0.1;
        
        // スクロールに応じて回転を変更
        particleSystem.rotation.x = scrollFactor * Math.PI * 0.2;
        
        // マウス位置の影響を計算
        const positionAttribute = particleSystem.geometry.getAttribute('position');
        const positions = positionAttribute.array;
        
        // 各パーティクルを更新
        for (let i = 0; i < params.particleCount; i++) {
            const i3 = i * 3;
            
            // マウスとの距離に基づく影響を計算
            const x = positions[i3];
            const y = positions[i3 + 1];
            const z = positions[i3 + 2];
            
            // 距離を計算
            const mouseOffset = new THREE.Vector3(mouseX - x, mouseY - y, 0);
            const distance = mouseOffset.length();
            
            // マウスの影響範囲内なら位置を変更
            if (distance < params.mouseInfluenceDistance) {
                const influence = (1 - distance / params.mouseInfluenceDistance) * params.mouseInfluenceStrength;
                positions[i3] += mouseOffset.x * influence * 0.02;
                positions[i3 + 1] += mouseOffset.y * influence * 0.02;
                
                // 少しだけ震えを追加して生き生きとした動きに
                positions[i3] += (Math.random() - 0.5) * 0.2;
                positions[i3 + 1] += (Math.random() - 0.5) * 0.2;
                positions[i3 + 2] += (Math.random() - 0.5) * 0.2;
            }
            
            // 時間経過で徐々に元の位置に戻る（減衰効果）
            const originalRadius = 700 + (i / params.particleCount) * 300;
            const originalTheta = (i / params.particleCount) * Math.PI * 2;
            const originalY = (Math.random() - 0.5) * 2000;
            
            const originalX = originalRadius * Math.cos(originalTheta);
            const originalZ = originalRadius * Math.sin(originalTheta);
            
            positions[i3] += (originalX - positions[i3]) * 0.01;
            positions[i3 + 1] += (originalY - positions[i3 + 1]) * 0.01;
            positions[i3 + 2] += (originalZ - positions[i3 + 2]) * 0.01;
        }
        
        // 更新フラグを設定
        positionAttribute.needsUpdate = true;
        
        // レンダリング実行
        renderer.render(scene, camera);
    }
    
    // パーティクルアニメーションの一時停止/再開
    function toggleActive(isActive) {
        params.active = isActive;
    }
    
    // インターフェースを公開
    return {
        init: init,
        toggleActive: toggleActive
    };
})();

// DOMコンテンツ読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', function() {
    // WebGLがサポートされているか確認
    if (window.WebGLRenderingContext) {
        try {
            ThreeParticles.init();
        } catch (e) {
            console.warn('WebGLの初期化に失敗しました: ', e);
            // フォールバック処理
            const fallback = document.querySelector('.particles-fallback');
            if (fallback) fallback.style.display = 'block';
        }
    } else {
        console.warn('WebGLがサポートされていません');
        // フォールバック処理
        const fallback = document.querySelector('.particles-fallback');
        if (fallback) fallback.style.display = 'block';
    }
});

// パフォーマンスを考慮して、ページが非表示のときはアニメーションを一時停止
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        ThreeParticles.toggleActive(false);
    } else {
        ThreeParticles.toggleActive(true);
    }
});
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
    let windowHalfX, windowHalfY;
    let mouseX = 0, mouseY = 0;
    let targetMouseX = 0, targetMouseY = 0;
    let isMobileDevice = false;
    let connectionLines = [];
    
    // 設定パラメータ
    const params = {
        particleCount: 400,
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
            particleCount: 200,
            particleSize: 2.5,
            connectionDistance: 100
        }
    };
    
    // 初期化関数
    function init() {
        // モバイル端末のチェック
        checkMobileDevice();
        
        // パーティクルコンテナの取得
        const container = document.getElementById('particles');
        
        // コンテナがなければ何もしない（他のページでも呼び出せるようにするため）
        if (!container) {
            console.warn('パーティクルコンテナが見つかりません (#particles)');
            return;
        }
        
        // THREE.jsが読み込まれているか確認
        if (typeof THREE === 'undefined') {
            console.warn('THREE.jsが読み込まれていません');
            showFallback();
            return;
        }
        
        // モバイルデバイスの場合はフォールバック表示
        if (isMobileDevice) {
            showFallback();
            return;
        }
        
        try {
            // 画面サイズの設定
            windowHalfX = window.innerWidth / 2;
            windowHalfY = window.innerHeight / 2;
            
            // Three.jsの基本セットアップ
            setupThreeJs(container);
            
            // パーティクルシステムの作成
            createParticleSystem();
            
            // 接続線の追加
            addConnectionLines();
            
            // 背景グローブオブジェクト追加
            addGlowingSpheres();
            
            // イベントリスナーの設定
            setupEventListeners();
            
            // アニメーションスタート
            animate();
        } catch (error) {
            console.error('Three.js初期化エラー:', error);
            showFallback();
        }
    }
    
    // モバイルデバイスかどうかをチェック
    function checkMobileDevice() {
        isMobileDevice = window.innerWidth <= 768 || 
                         /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // モバイル向けにパラメータを調整
        if (isMobileDevice) {
            params.particleCount = params.mobile.particleCount;
            params.particleSize = params.mobile.particleSize;
            params.connectionDistance = params.mobile.connectionDistance;
        }
    }
    
    // フォールバック表示（静的背景）
    function showFallback() {
        const fallback = document.querySelector('.particles-fallback');
        if (fallback) {
            fallback.style.display = 'block';
        }
        
        // Three.jsのレンダラーが存在すれば非表示に
        if (renderer && renderer.domElement) {
            renderer.domElement.style.display = 'none';
        }
    }
    
    // Three.jsの基本セットアップ
    function setupThreeJs(container) {
        // シーンの作成
        scene = new THREE.Scene();
        
        // カメラの作成
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 30;
        
        // レンダラーの作成
        renderer = new THREE.WebGLRenderer({ 
            alpha: true, 
            antialias: true 
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);
    }
    
    // パーティクルシステムの作成
    function createParticleSystem() {
        const particleCount = params.particleCount;
        const particles = new THREE.BufferGeometry();
        positions = new Float32Array(particleCount * 3);
        colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        // パーティクル位置・色・サイズをランダム設定
        for (let i = 0; i < particleCount; i++) {
            // 位置 - より広い範囲に分散
            positions[i * 3] = (Math.random() - 0.5) * 120;      // x
            positions[i * 3 + 1] = (Math.random() - 0.5) * 120;  // y
            positions[i * 3 + 2] = (Math.random() - 0.5) * 120;  // z
            
            // 色（ShinAIのカラーパレット）
            const colorIndex = Math.floor(Math.random() * params.colorPalette.length);
            const color = params.colorPalette[colorIndex];
            
            colors[i * 3] = color.r;     // 赤
            colors[i * 3 + 1] = color.g; // 緑
            colors[i * 3 + 2] = color.b; // 青
            
            // サイズ - よりバリエーションを持たせる
            sizes[i] = Math.random() * 3 + 0.5;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // 高度なシェーダーマテリアルを試みる
        let material;
        
        try {
            // 高度なシェーダーマテリアル
            const vertexShader = `
                attribute float size;
                varying vec3 vColor;
                
                void main() {
                    vColor = color;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `;
            
            const fragmentShader = `
                varying vec3 vColor;
                
                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5, 0.5));
                    if (dist > 0.475) discard;
                    
                    float smoothedAlpha = smoothstep(0.475, 0.0, dist);
                    gl_FragColor = vec4(vColor, smoothedAlpha);
                }
            `;
            
            material = new THREE.ShaderMaterial({
                uniforms: {},
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                transparent: true,
                vertexColors: true,
                blending: THREE.AdditiveBlending
            });
            
            // WebGLの拡張機能をチェック
            const gl = renderer.getContext();
            const extension = gl.getExtension('OES_standard_derivatives');
            
            if (!extension) {
                throw new Error('OES_standard_derivatives not supported');
            }
        } catch (e) {
            // フォールバック: 標準ポイントマテリアル
            console.warn('シェーダーマテリアルの作成に失敗しました。標準マテリアルを使用します:', e);
            material = new THREE.PointsMaterial({
                size: params.particleSize,
                vertexColors: true,
                transparent: true,
                opacity: 0.7,
                sizeAttenuation: true,
                blending: THREE.AdditiveBlending
            });
            
            // カスタムテクスチャを適用
            const textureLoader = new THREE.TextureLoader();
            material.map = textureLoader.load('/assets/images/particle.png', () => {
                material.needsUpdate = true;
            });
        }
        
        // パーティクルシステムの作成
        particleSystem = new THREE.Points(particles, material);
        scene.add(particleSystem);
    }
    
    // 接続線の追加
    function addConnectionLines() {
        // 古い接続線を削除
        connectionLines.forEach(line => {
            scene.remove(line);
        });
        connectionLines = [];
        
        // パーティクルの位置を取得
        const positions = particleSystem.geometry.attributes.position.array;
        
        // 接続線の作成
        const maxConnections = 150; // パフォーマンスを考慮して制限
        let connectionCount = 0;
        
        // 近いパーティクル同士を線で接続
        for (let i = 0; i < params.particleCount && connectionCount < maxConnections; i++) {
            const ix = positions[i * 3];
            const iy = positions[i * 3 + 1];
            const iz = positions[i * 3 + 2];
            
            for (let j = i + 1; j < params.particleCount && connectionCount < maxConnections; j++) {
                const jx = positions[j * 3];
                const jy = positions[j * 3 + 1];
                const jz = positions[j * 3 + 2];
                
                // パーティクル間の距離を計算
                const dx = ix - jx;
                const dy = iy - jy;
                const dz = iz - jz;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                // 一定距離以内のパーティクルを接続
                if (distance < params.connectionDistance) {
                    // 線の材質（距離に応じて透明度を調整）
                    const lineOpacity = (1 - distance / params.connectionDistance) * params.connectionOpacity;
                    
                    // 線のジオメトリとマテリアル
                    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(ix, iy, iz),
                        new THREE.Vector3(jx, jy, jz)
                    ]);
                    
                    const lineMaterial = new THREE.LineBasicMaterial({
                        color: 0x8e33ff,
                        transparent: true,
                        opacity: lineOpacity,
                        blending: THREE.AdditiveBlending
                    });
                    
                    // 線の作成とシーンへの追加
                    const line = new THREE.Line(lineGeometry, lineMaterial);
                    scene.add(line);
                    connectionLines.push(line);
                    connectionCount++;
                }
            }
        }
    }
    
    // 背景グローブオブジェクトの追加
    function addGlowingSpheres() {
        // 大きな半透明の球体
        const sphereGeometry = new THREE.SphereGeometry(40, 32, 32);
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x8e33ff,
            transparent: true,
            opacity: 0.05,
            side: THREE.BackSide
        });
        
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        scene.add(sphere);
        
        // 2つ目の球体
        const sphere2Geometry = new THREE.SphereGeometry(25, 32, 32);
        const sphere2Material = new THREE.MeshBasicMaterial({
            color: 0x4264df,
            transparent: true,
            opacity: 0.03,
            side: THREE.BackSide
        });
        
        const sphere2 = new THREE.Mesh(sphere2Geometry, sphere2Material);
        scene.add(sphere2);
        
        // 3つ目の小さな球体
        const sphere3Geometry = new THREE.SphereGeometry(15, 32, 32);
        const sphere3Material = new THREE.MeshBasicMaterial({
            color: 0x26d8de,
            transparent: true,
            opacity: 0.04,
            side: THREE.BackSide
        });
        
        const sphere3 = new THREE.Mesh(sphere3Geometry, sphere3Material);
        scene.add(sphere3);
    }
    
    // イベントリスナーの設定
    function setupEventListeners() {
        document.addEventListener('mousemove', onDocumentMouseMove);
        document.addEventListener('touchstart', onDocumentTouchStart);
        document.addEventListener('touchmove', onDocumentTouchMove);
        window.addEventListener('resize', onWindowResize);
        
        // タブ切り替え時のパフォーマンス最適化
        document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    
    // タブ切り替え時の処理
    function handleVisibilityChange() {
        params.active = !document.hidden;
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
        // 画面サイズの再計算
        windowHalfX = window.innerWidth / 2;
        windowHalfY = window.innerHeight / 2;
        
        // モバイル端末の再チェック
        const wasMobile = isMobileDevice;
        checkMobileDevice();
        
        // モバイル端末状態が変わった場合の処理
        if (wasMobile !== isMobileDevice) {
            if (isMobileDevice) {
                showFallback();
            } else {
                const fallback = document.querySelector('.particles-fallback');
                if (fallback) {
                    fallback.style.display = 'none';
                }
                
                if (renderer && renderer.domElement) {
                    renderer.domElement.style.display = 'block';
                }
            }
        }
        
        // カメラとレンダラーのサイズ更新
        if (camera && renderer) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
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
        targetMouseX = mouseX * 0.0005;
        targetMouseY = -mouseY * 0.0005;
        
        // スクロール位置に基づいてパーティクルシステムの回転を調整
        const scrollY = window.scrollY || window.pageYOffset;
        const scrollFactor = scrollY / 5000; // スクロール変化係数
        
        // パーティクルシステムの回転
        if (particleSystem) {
            particleSystem.rotation.y += params.defaultAnimationSpeed * 0.1;
            particleSystem.rotation.x = scrollFactor * Math.PI * 0.2;
            
            // パーティクルサイズの変更 - 時間に応じて変化
            const sizes = particleSystem.geometry.attributes.size;
            const time = Date.now() * 0.0005;
            
            if (sizes && sizes.array) {
                for (let i = 0; i < sizes.count; i++) {
                    sizes.array[i] = (Math.sin(i + time) * 0.3 + 1) * (Math.random() * 2 + 0.5);
                }
                
                sizes.needsUpdate = true;
            }
        }
        
        // カメラの位置を少し動かして浮遊感を出す
        if (camera) {
            camera.position.x += (targetMouseX - camera.position.x) * 0.05;
            camera.position.y += (targetMouseY - camera.position.y) * 0.05;
            camera.lookAt(scene.position);
        }
        
        // 接続線の更新 (5秒ごとに更新)
        if (Date.now() % 5000 < 20) {
            addConnectionLines();
        }
        
        // レンダリング実行
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }
    
    // パブリックメソッド
    return {
        init: init,
        toggleActive: function(isActive) {
            params.active = isActive;
        }
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
    if (ThreeParticles) {
        ThreeParticles.toggleActive(!document.hidden);
    }
});
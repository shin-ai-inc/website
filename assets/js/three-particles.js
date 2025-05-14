/**
 * ==============================================
 * // === component-split: ThreeJSParticles ===
 * COMPONENT: Three.jsパーティクルアニメーション
 * ==============================================
 */
const ThreeJSParticlesModule = {
    scene: null,
    camera: null,
    renderer: null,
    particles: null,
    container: null,
    isMobileDevice: false,
    particleCount: 400, // より繊細なアニメーションのために粒子数を増加
    connectionLines: [], // 接続線を保持する配列を追加
    isActive: true,     // アニメーション制御用フラグ
    
    init: function() {
        this.container = document.getElementById('particles');
        if (!this.container || typeof THREE === 'undefined') {
            console.warn('Three.jsの初期化に失敗しました: コンテナが見つからないか、THREE.jsが読み込まれていません');
            return;
        }
        
        // モバイル端末のチェック
        this.isMobileDevice = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // モバイル端末の場合は静的画像を表示
        if (this.isMobileDevice) {
            // フォールバック要素を表示
            const fallback = document.querySelector('.particles-fallback');
            if (fallback) {
                fallback.style.display = 'block';
            }
            return;
        }
        
        try {
            // シーン、カメラ、レンダラーの設定
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.camera.position.z = 30;
            
            this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.container.appendChild(this.renderer.domElement);
            
            // パーティクルの生成
            this.createParticles();
            
            // イベントリスナーを設定
            this.setupEventListeners();
            
            // アニメーション開始
            this.animate();
        } catch (error) {
            console.error('Three.jsの初期化エラー:', error);
            this.showFallback();
        }
    },
    
    setupEventListeners: function() {
        // リサイズイベント
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // タブ切り替え時のパフォーマンス最適化
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    },
    
    handleVisibilityChange: function() {
        // タブがバックグラウンドの場合はアニメーションを停止
        this.isActive = !document.hidden;
    },
    
    showFallback: function() {
        // フォールバック要素を表示
        const fallback = document.querySelector('.particles-fallback');
        if (fallback) {
            fallback.style.display = 'block';
        }
        
        // レンダラーが存在すれば非表示に
        if (this.renderer && this.renderer.domElement) {
            this.renderer.domElement.style.display = 'none';
        }
    },
    
    createParticles: function() {
        const particleCount = this.particleCount;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const opacities = new Float32Array(particleCount);
        
        // パーティクル位置・色・サイズをランダム設定
        for (let i = 0; i < particleCount; i++) {
            // 位置 - より広い範囲に分散
            positions[i * 3] = (Math.random() - 0.5) * 120;      // x
            positions[i * 3 + 1] = (Math.random() - 0.5) * 120;  // y
            positions[i * 3 + 2] = (Math.random() - 0.5) * 120;  // z
            
            // 色（紫から青へのグラデーション）
            const ratio = Math.random();
            colors[i * 3] = 0.5 + ratio * 0.3;     // 赤 (紫~青)
            colors[i * 3 + 1] = 0.2 + ratio * 0.4; // 緑
            colors[i * 3 + 2] = 0.8 + ratio * 0.2; // 青
            
            // サイズ - よりバリエーションを持たせる
            sizes[i] = Math.random() * 3 + 0.5;
            
            // 透明度 - 繊細さを増す
            opacities[i] = 0.2 + Math.random() * 0.8;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        particles.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
        
        // 高度なシェーダーマテリアル
        const vertexShader = `
            attribute float size;
            attribute float opacity;
            varying vec3 vColor;
            varying float vOpacity;
            
            void main() {
                vColor = color;
                vOpacity = opacity;
                
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;
        
        const fragmentShader = `
            varying vec3 vColor;
            varying float vOpacity;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5, 0.5));
                if (dist > 0.475) discard;
                
                float smoothedAlpha = smoothstep(0.475, 0.0, dist);
                gl_FragColor = vec4(vColor, vOpacity * smoothedAlpha);
            }
        `;
        
        // 高度なシェーダーマテリアル
        const shaderMaterial = new THREE.ShaderMaterial({
            uniforms: {},
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        });
        
        // 通常のポイントマテリアル（フォールバック）
        const particleMaterial = new THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        // WebGLの機能をチェックしてマテリアルを選択
        let material;
        try {
            const gl = this.renderer.getContext();
            const extension = gl.getExtension('OES_standard_derivatives');
            material = extension ? shaderMaterial : particleMaterial;
        } catch (e) {
            console.warn('シェーダー拡張機能のチェックに失敗しました:', e);
            material = particleMaterial;
        }
        
        // メッシュ作成
        this.particles = new THREE.Points(particles, material);
        this.scene.add(this.particles);
        
        // 背景グローブオブジェクト追加
        this.addGlowingSpheres();
        
        // 接続線の追加
        this.addConnectionLines();
    },
    
    addGlowingSpheres: function() {
        // パーティクルの周りに大きな半透明球体を追加
        const sphereGeometry = new THREE.SphereGeometry(40, 32, 32);
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x8e33ff,
            transparent: true,
            opacity: 0.05,
            side: THREE.BackSide
        });
        
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.scene.add(sphere);
        
        // 2つ目の球体
        const sphere2Geometry = new THREE.SphereGeometry(25, 32, 32);
        const sphere2Material = new THREE.MeshBasicMaterial({
            color: 0x4264df,
            transparent: true,
            opacity: 0.03,
            side: THREE.BackSide
        });
        
        const sphere2 = new THREE.Mesh(sphere2Geometry, sphere2Material);
        this.scene.add(sphere2);
        
        // 3つ目の小さな球体 - より繊細なエフェクト
        const sphere3Geometry = new THREE.SphereGeometry(15, 32, 32);
        const sphere3Material = new THREE.MeshBasicMaterial({
            color: 0x26d8de,
            transparent: true,
            opacity: 0.04,
            side: THREE.BackSide
        });
        
        const sphere3 = new THREE.Mesh(sphere3Geometry, sphere3Material);
        this.scene.add(sphere3);
    },
    
    // 新しく追加した接続線機能
    addConnectionLines: function() {
        try {
            // すでに存在する接続線を削除
            for (let i = 0; i < this.connectionLines.length; i++) {
                this.scene.remove(this.connectionLines[i]);
            }
            this.connectionLines = [];
            
            // パーティクルの位置を取得
            if (!this.particles || !this.particles.geometry) return;
            
            const positions = this.particles.geometry.attributes.position.array;
            const maxConnections = 100; // パフォーマンスのために制限
            let connectionCount = 0;
            const connectionDistance = 30; // 接続する距離の閾値
            
            // 近いパーティクル同士を接続
            for (let i = 0; i < this.particleCount && connectionCount < maxConnections; i++) {
                const ix = positions[i * 3];
                const iy = positions[i * 3 + 1];
                const iz = positions[i * 3 + 2];
                
                for (let j = i + 1; j < this.particleCount && connectionCount < maxConnections; j++) {
                    const jx = positions[j * 3];
                    const jy = positions[j * 3 + 1];
                    const jz = positions[j * 3 + 2];
                    
                    // 距離計算
                    const dx = ix - jx;
                    const dy = iy - jy;
                    const dz = iz - jz;
                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    
                    // 一定距離以内なら接続
                    if (distance < connectionDistance) {
                        // 距離に応じて透明度を調整（遠いほど透明に）
                        const opacity = (1 - distance / connectionDistance) * 0.15;
                        
                        // 線のジオメトリとマテリアル
                        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                            new THREE.Vector3(ix, iy, iz),
                            new THREE.Vector3(jx, jy, jz)
                        ]);
                        
                        const lineMaterial = new THREE.LineBasicMaterial({
                            color: 0x8e33ff,
                            transparent: true,
                            opacity: opacity,
                            blending: THREE.AdditiveBlending
                        });
                        
                        // 線の作成とシーンへの追加
                        const line = new THREE.Line(lineGeometry, lineMaterial);
                        this.scene.add(line);
                        this.connectionLines.push(line);
                        connectionCount++;
                    }
                }
            }
        } catch (error) {
            console.warn('接続線の生成に失敗しました:', error);
        }
    },
    
    onWindowResize: function() {
        // モバイル端末の再チェック
        const wasMobile = this.isMobileDevice;
        this.isMobileDevice = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // モバイル状態が変わった場合の処理
        if (wasMobile !== this.isMobileDevice) {
            if (this.isMobileDevice) {
                // モバイル端末の場合はThree.jsを無効化
                if (this.renderer && this.renderer.domElement) {
                    this.renderer.domElement.style.display = 'none';
                }
                
                // フォールバック要素を表示
                const fallback = document.querySelector('.particles-fallback');
                if (fallback) {
                    fallback.style.display = 'block';
                }
            } else {
                // デスクトップの場合はThree.jsを表示
                if (this.renderer && this.renderer.domElement) {
                    this.renderer.domElement.style.display = 'block';
                }
                
                // フォールバック要素を非表示
                const fallback = document.querySelector('.particles-fallback');
                if (fallback) {
                    fallback.style.display = 'none';
                }
            }
        }
        
        // カメラのアスペクト比を更新
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    },
    
    animate: function() {
        // アニメーションループをリクエスト
        requestAnimationFrame(this.animate.bind(this));
        
        // アクティブでない場合や、モバイル端末の場合はレンダリングをスキップ
        if (!this.isActive || this.isMobileDevice) return;
        
        // パーティクルのアニメーション - より繊細な動き
        if (this.particles) {
            this.particles.rotation.x += 0.0003;
            this.particles.rotation.y += 0.0005;
            
            // パーティクルのサイズを時間に応じて変化させる
            const sizes = this.particles.geometry.attributes.size;
            const time = Date.now() * 0.0005;
            
            for (let i = 0; i < sizes.count; i++) {
                sizes.array[i] = (Math.sin(i + time) * 0.3 + 1) * (Math.random() * 2 + 0.5);
            }
            
            sizes.needsUpdate = true;
        }
        
        // カメラの位置を少し動かして浮遊感を出す
        if (this.camera) {
            this.camera.position.x = Math.sin(Date.now() * 0.0001) * 3;
            this.camera.position.y = Math.cos(Date.now() * 0.0001) * 3;
            this.camera.lookAt(this.scene.position);
        }
        
        // 一定間隔で接続線を更新（視覚効果を向上）
        if (Date.now() % 7000 < 20) {
            this.addConnectionLines();
        }
        
        // レンダリング実行
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
};

// DOMがロードされたら初期化
document.addEventListener('DOMContentLoaded', function() {
    ThreeJSParticlesModule.init();
});

// パフォーマンスを考慮して、タブ切り替え時にアニメーションを制御
document.addEventListener('visibilitychange', function() {
    if (ThreeJSParticlesModule) {
        ThreeJSParticlesModule.isActive = !document.hidden;
    }
});
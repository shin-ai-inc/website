// three-particles.js - placeholder JS
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
    
    init: function() {
        this.container = document.getElementById('particles');
        if (!this.container || typeof THREE === 'undefined') return;
        
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
        
        // リサイズイベント
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // アニメーション開始
        this.animate();
    },
    
    createParticles: function() {
        const particleCount = 200;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        // パーティクル位置・色・サイズをランダム設定
        for (let i = 0; i < particleCount; i++) {
            // 位置
            positions[i * 3] = (Math.random() - 0.5) * 100;      // x
            positions[i * 3 + 1] = (Math.random() - 0.5) * 100;  // y
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;  // z
            
            // 色（紫から青へのグラデーション）
            const ratio = Math.random();
            colors[i * 3] = 0.5 + ratio * 0.2;     // 赤 (紫~青)
            colors[i * 3 + 1] = 0.2 + ratio * 0.3; // 緑
            colors[i * 3 + 2] = 0.8 + ratio * 0.2; // 青
            
            // サイズ
            sizes[i] = Math.random() * 2 + 0.5;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // シェーダーマテリアル
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
                if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.475) discard;
                gl_FragColor = vec4(vColor, 1.0);
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
            material = particleMaterial;
        }
        
        // メッシュ作成
        this.particles = new THREE.Points(particles, material);
        this.scene.add(this.particles);
        
        // 背景グローブオブジェクト追加
        this.addGlowingSpheres();
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
    },
    
    onWindowResize: function() {
        // モバイル端末の再チェック
        this.isMobileDevice = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
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
            
            return;
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
        
        // カメラのアスペクト比を更新
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    },
    
    animate: function() {
        // モバイル端末の場合はアニメーションを中止
        if (this.isMobileDevice) return;
        
        requestAnimationFrame(this.animate.bind(this));
        
        // パーティクルのアニメーション
        if (this.particles) {
            this.particles.rotation.x += 0.0005;
            this.particles.rotation.y += 0.0008;
        }
        
        // カメラの位置を少し動かして浮遊感を出す
        if (this.camera) {
            this.camera.position.x = Math.sin(Date.now() * 0.0001) * 2;
            this.camera.position.y = Math.cos(Date.now() * 0.0001) * 2;
            this.camera.lookAt(this.scene.position);
        }
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
};

// DOMがロードされたら初期化
document.addEventListener('DOMContentLoaded', function() {
    ThreeJSParticlesModule.init();
});
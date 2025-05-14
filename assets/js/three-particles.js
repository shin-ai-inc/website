/**
 * ==============================================
 * ShinAI - Three.jsパーティクルエフェクトモジュール
 * 目的: ビジュアルエフェクトによるブランディング強化
 * バージョン: 2.0.0
 * 最終更新: 2025-01-15
 * ==============================================
 */

(function() {
    'use strict';
    
    // ドキュメント読み込み完了時に初期化
    document.addEventListener('DOMContentLoaded', function() {
        const container = document.getElementById('three-container');
        
        if (container && typeof THREE !== 'undefined') {
            initThreeJsParticles();
        }
    });
    
    /**
     * Three.jsパーティクルエフェクト初期化
     */
    function initThreeJsParticles() {
        const container = document.getElementById('three-container');
        let width = window.innerWidth;
        let height = window.innerHeight;
        
        // パフォーマンス最適化: モバイルデバイスでパーティクル数を削減
        const isMobile = window.innerWidth <= 768;
        const particleCount = isMobile ? 50 : 100;
        
        // シーン、カメラ、レンダラーの設定
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 30;
        
        const renderer = new THREE.WebGLRenderer({ 
            alpha: true, 
            antialias: true,
            powerPreference: 'high-performance' 
        });
        renderer.setSize(width, height);
        renderer.setClearColor(0xffffff, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);
        
        // パーティクルの設定
        const particles = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const sizes = [];
        
        // ピンク色のパーティクル（ヒーローセクション以外）
        const pink1 = new THREE.Color(0xffc0cb); // ライトピンク
        const pink2 = new THREE.Color(0xffdae0); // さらに淡いピンク
        
        // 水色のパーティクル（ヒーローセクション用）
        const lightBlue1 = new THREE.Color(0xade8f4);
        const lightBlue2 = new THREE.Color(0xb8e0f9);
        
        for (let i = 0; i < particleCount; i++) {
            // ランダムな位置
            const x = Math.random() * 100 - 50;
            const y = Math.random() * 100 - 50;
            const z = Math.random() * 100 - 50;
            
            positions.push(x, y, z);
            
            // 色の設定（初期状態は淡いピンク）
            const mixRatio = Math.random();
            const mixedColor = new THREE.Color().lerpColors(pink1, pink2, mixRatio);
            
            colors.push(mixedColor.r, mixedColor.g, mixedColor.b);
            sizes.push(Math.random() * 2 + 0.5);
        }
        
        particles.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        particles.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        // シェーダーマテリアルの設定
        const material = new THREE.PointsMaterial({
            size: 0.8,
            vertexColors: true,
            transparent: true,
            opacity: 0.5,
            sizeAttenuation: true
        });
        
        const particleSystem = new THREE.Points(particles, material);
        scene.add(particleSystem);
        
        // マウス操作のための変数
        let mouseX = 0;
        let mouseY = 0;
        let windowHalfX = width / 2;
        let windowHalfY = height / 2;
        
        // マウス移動イベント
        document.addEventListener('mousemove', function(event) {
            mouseX = (event.clientX - windowHalfX) * 0.05;
            mouseY = (event.clientY - windowHalfY) * 0.05;
        }, { passive: true });
        
        // リサイズ処理
        window.addEventListener('resize', function() {
            width = window.innerWidth;
            height = window.innerHeight;
            windowHalfX = width / 2;
            windowHalfY = height / 2;
            
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            
            // モバイルデバイスの場合、パフォーマンスを最適化
            if (width <= 768) {
                renderer.setPixelRatio(1);
            } else {
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            }
        }, { passive: true });
        
        // パーティクルの色更新関数
        function updateParticleColors() {
            const isHeroInView = document.body.classList.contains('hero-in-view');
            const colors = particles.getAttribute('color');
            
            for (let i = 0; i < particleCount; i++) {
                if (isHeroInView) {
                    // ヒーローセクション: パーティクルをほぼ透明に
                    material.opacity = 0.1;
                } else {
                    // その他のセクション: 淡いピンク色
                    material.opacity = 0.5;
                    const mixRatio = Math.random();
                    const mixedColor = new THREE.Color().lerpColors(pink1, pink2, mixRatio);
                    colors.array[i * 3] = mixedColor.r;
                    colors.array[i * 3 + 1] = mixedColor.g;
                    colors.array[i * 3 + 2] = mixedColor.b;
                }
            }
            
            colors.needsUpdate = true;
        }
        
        // セクション変更時の監視
        const bodyObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    updateParticleColors();
                }
            });
        });
        
        bodyObserver.observe(document.body, { attributes: true });
        
        // アニメーションループ
        function animate() {
            requestAnimationFrame(animate);
            
            // パーティクルの回転
            particleSystem.rotation.x += 0.0005;
            particleSystem.rotation.y += 0.001;
            
            // カメラの微妙な動き
            camera.position.x += (mouseX - camera.position.x) * 0.05;
            camera.position.y += (-mouseY - camera.position.y) * 0.05;
            camera.lookAt(scene.position);
            
            renderer.render(scene, camera);
        }
        
        // アニメーション開始
        animate();
        
        // 初期色設定
        updateParticleColors();
        
        // 低パフォーマンスデバイス用の設定
        if (isMobile) {
            optimizeForLowPerformance();
        }
        
        /**
         * 低パフォーマンスデバイス用の最適化
         */
        function optimizeForLowPerformance() {
            // フレームレートの制限
            let lastTime = 0;
            const interval = 1000 / 30; // 30fps制限
            
            function animateLowPerformance(currentTime) {
                requestAnimationFrame(animateLowPerformance);
                
                const delta = currentTime - lastTime;
                
                if (delta > interval) {
                    lastTime = currentTime - (delta % interval);
                    
                    particleSystem.rotation.x += 0.0005;
                    particleSystem.rotation.y += 0.001;
                    
                    camera.position.x += (mouseX - camera.position.x) * 0.05;
                    camera.position.y += (-mouseY - camera.position.y) * 0.05;
                    camera.lookAt(scene.position);
                    
                    renderer.render(scene, camera);
                }
            }
            
            // 通常のアニメーションループを停止し、低パフォーマンス版を開始
            cancelAnimationFrame(animate);
            requestAnimationFrame(animateLowPerformance);
        }
    }
})();
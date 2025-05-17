/**
 * ShinAI - Three.jsパーティクルエフェクト
 * AIの可能性を表現するデジタル空間を描画
 */

// デバイスパフォーマンスに基づいたパーティクル数調整
function getOptimalParticleCount() {
    // モバイルデバイスの検出
    const isMobile = window.innerWidth < 768 || 
                     /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 低スペックデバイスの検出（簡易的なヒューリスティック）
    const isLowSpec = window.navigator.hardwareConcurrency 
                    ? window.navigator.hardwareConcurrency <= 4
                    : isMobile;
    
    // デバイス性能に応じてパーティクル数を最適化
    if (isLowSpec) {
        return 300; // 低スペックデバイス
    } else if (isMobile) {
        return 500; // 通常のモバイルデバイス
    } else {
        return 1000; // デスクトップ
    }
}

// Three.jsパーティクルエフェクト初期化
function initThreeJSParticles() {
    const container = document.getElementById('three-container');
    if (!container) return;

    // パフォーマンスを監視するためのStats.jsを初期化（開発時のみ）
    // let stats;
    // if (process.env.NODE_ENV === 'development') {
    //     stats = new Stats();
    //     document.body.appendChild(stats.dom);
    // }
    
    // シーン設定
    const scene = new THREE.Scene();
    
    // カメラ設定
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;
    
    // レンダラー設定 - パフォーマンス最適化
    const renderer = new THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: window.innerWidth > 768, // モバイルではアンチエイリアスを無効化
        powerPreference: 'high-performance',
        precision: window.innerWidth < 768 ? 'mediump' : 'highp' // モバイルでは精度を下げる
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // ピクセル比は最大2に制限
    container.appendChild(renderer.domElement);
    
    // 中心の球体（デジタルコア）
    const coreGeometry = new THREE.IcosahedronGeometry(6, 2);
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0x4A8FFF,
        transparent: true,
        opacity: 0.15,
        wireframe: true
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(core);
    
    // 装飾用の内側コア - 球体を維持
    const innerCoreGeometry = new THREE.IcosahedronGeometry(3, 1);
    const innerCoreMaterial = new THREE.MeshBasicMaterial({
        color: 0x00C9A7,
        transparent: true,
        opacity: 0.2,
        wireframe: true
    });
    const innerCore = new THREE.Mesh(innerCoreGeometry, innerCoreMaterial);
    scene.add(innerCore);
    
    // パーティクル設定（最適化版）
    const particlesCount = getOptimalParticleCount();
    const particles = [];
    
    // オブジェクトプール
    const geometryPool = [
        new THREE.BoxGeometry(0.12, 0.12, 0.12),
        new THREE.SphereGeometry(0.06, 8, 8),
        new THREE.TetrahedronGeometry(0.1, 0)
    ];
    
    // カラーパレット
    const colors = [
        0x4A8FFF, // 明るい青
        0x3A5FEB, // 青
        0x00C9A7, // 青緑
        0x20E7C4, // 明るい青緑
        0xFFFFFF, // 白
        0xB4F2FF  // 水色
    ];
    
    // パーティクル作成（最適化版）
    for (let i = 0; i < particlesCount; i++) {
        // 形状をランダム選択
        const geometryIndex = Math.floor(Math.random() * geometryPool.length);
        const geometry = geometryPool[geometryIndex];
        
        // カラーをランダム選択
        const colorIndex = Math.floor(Math.random() * colors.length);
        const material = new THREE.MeshBasicMaterial({ 
            color: colors[colorIndex],
            transparent: true,
            opacity: 0.3 + Math.random() * 0.5
        });
        
        // パーティクルメッシュ作成
        const particle = new THREE.Mesh(geometry, material);
        
        // 初期配置
        const radius = 15 + Math.random() * 40;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        particle.position.x = radius * Math.sin(phi) * Math.cos(theta);
        particle.position.y = radius * Math.sin(phi) * Math.sin(theta);
        particle.position.z = radius * Math.cos(phi);
        
        // 初期回転
        particle.rotation.x = Math.random() * Math.PI * 2;
        particle.rotation.y = Math.random() * Math.PI * 2;
        particle.rotation.z = Math.random() * Math.PI * 2;
        
        // パーティクルのパラメータを保存
        particles.push({
            mesh: particle,
            velocity: {
                x: (Math.random() - 0.5) * 0.02,
                y: (Math.random() - 0.5) * 0.02,
                z: (Math.random() - 0.5) * 0.02
            },
            rotation: {
                x: (Math.random() - 0.5) * 0.01,
                y: (Math.random() - 0.5) * 0.01,
                z: (Math.random() - 0.5) * 0.01
            },
            orbit: {
                speed: 0.0001 + Math.random() * 0.0004,
                radius: radius,
                angle: Math.random() * Math.PI * 2,
                yFactor: Math.random() * 2 - 1 // Y軸変化の係数
            },
            pulse: {
                speed: 0.01 + Math.random() * 0.02,
                size: 0.05 + Math.random() * 0.1
            }
        });
        
        scene.add(particle);
    }
    
    // 接続線（最適化版 - モバイルでは少なく）
    const lineCount = window.innerWidth < 768 ? 10 : 25;
    const connectionLines = [];
    const lineGeometries = [];
    const linePositions = [];
    
    for (let i = 0; i < lineCount; i++) {
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array(6);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        lineGeometries.push(geometry);
        linePositions.push(vertices);
        
        // 青みがかった線カラー
        const material = new THREE.LineBasicMaterial({
            color: 0x4A8FFF,
            transparent: true,
            opacity: 0.04
        });
        
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        connectionLines.push({
            line: line,
            material: material
        });
    }
    
    // カメラ制御用変数
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    
    // マウス追跡（デスクトップ）
    document.addEventListener('mousemove', function(event) {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    }, { passive: true });
    
    // タッチ追跡（モバイル）
    document.addEventListener('touchmove', function(event) {
        if (event.touches.length > 0) {
            mouseX = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
            mouseY = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
        }
    }, { passive: true });
    
    // スクロール位置記録
    let scrollY = window.scrollY;
    document.addEventListener('scroll', function() {
        scrollY = window.scrollY;
    }, { passive: true });
    
    // 時間変数
    let time = 0;
    
    // フレームカウンター（最適化用）
    let frameCount = 0;
    
    // パフォーマンス最適化のためのフレームレート調整
    const targetFPS = window.innerWidth < 768 ? 30 : 60;
    const frameInterval = 1000 / targetFPS;
    let lastFrameTime = 0;
    
    // アニメーション関数
    const animate = (currentTime) => {
        requestAnimationFrame(animate);
        
        // フレームレート制御（特にモバイルデバイス向け）
        if (currentTime - lastFrameTime < frameInterval) return;
        lastFrameTime = currentTime;
        
        time += 0.01;
        frameCount++;
        
        // カメラの滑らかな動き
        targetX = mouseX * 15;
        targetY = mouseY * 15;
        camera.position.x += (targetX - camera.position.x) * 0.02;
        camera.position.y += (targetY - camera.position.y) * 0.02;
        // スクロール位置に応じてカメラのZ位置を調整
        camera.position.z = 50 + (scrollY * 0.01);
        camera.lookAt(scene.position);
        
        // コアのアニメーション
        core.rotation.y += 0.0015;
        core.rotation.x += 0.0007;
        const scalePulse = Math.sin(time * 0.5) * 0.05 + 1;
        core.scale.set(scalePulse, scalePulse, scalePulse);
        
        // 内側コアの逆回転（球体を維持）
        innerCore.rotation.y -= 0.002;
        innerCore.rotation.z += 0.001;
        // 球体を維持するため、均等なスケール値を使用
        const innerScalePulse = Math.sin(time * 0.6) * 0.08 + 1;
        innerCore.scale.set(innerScalePulse, innerScalePulse, innerScalePulse);
        
        // パーティクルアニメーション - パフォーマンス最適化
        // すべてのパーティクルを毎フレーム更新せず、一部のみを更新
        const particlesToUpdate = Math.min(particles.length, 50);
        const startIndex = frameCount % particles.length;
        
        for (let i = 0; i < particlesToUpdate; i++) {
            const index = (startIndex + i) % particles.length;
            const p = particles[index];
            
            // 軌道運動
            p.orbit.angle += p.orbit.speed;
            
            // 楕円軌道的な動き
            const orbitX = p.orbit.radius * Math.cos(p.orbit.angle);
            const orbitZ = p.orbit.radius * Math.sin(p.orbit.angle);
            const orbitY = p.orbit.radius * 0.5 * p.orbit.yFactor * Math.sin(p.orbit.angle * 0.5);
            
            // 波形的な変動
            const waveX = Math.sin(time + index * 0.1) * 1.5;
            const waveY = Math.cos(time * 0.7 + index * 0.2) * 1.2;
            const waveZ = Math.sin(time * 0.5 + index * 0.15) * 1.8;
            
            // 位置更新
            p.mesh.position.x = orbitX + p.velocity.x * waveX;
            p.mesh.position.y = orbitY + p.velocity.y * waveY;
            p.mesh.position.z = orbitZ + p.velocity.z * waveZ;
            
            // サイズの呼吸
            const sizePulse = Math.sin(time * p.pulse.speed + index) * p.pulse.size + 1;
            p.mesh.scale.set(sizePulse, sizePulse, sizePulse);
            
            // 自転（フレームごとに回転角を制限して最適化）
            p.mesh.rotation.x += p.rotation.x * 0.5;
            p.mesh.rotation.y += p.rotation.y * 0.5;
            p.mesh.rotation.z += p.rotation.z * 0.5;
            
            // 範囲外に出たら反対側から再登場
            if (Math.abs(p.mesh.position.x) > 70) p.mesh.position.x *= -0.9;
            if (Math.abs(p.mesh.position.y) > 50) p.mesh.position.y *= -0.9;
            if (Math.abs(p.mesh.position.z) > 70) p.mesh.position.z *= -0.9;
        }
        
        // 接続線のアニメーション - パフォーマンス最適化
        // 30フレームごとに全線を更新
        if (frameCount % 3 === 0) {
            const lineToUpdate = frameCount % connectionLines.length;
            const line = connectionLines[lineToUpdate];
            const linePositionArray = linePositions[lineToUpdate];
            
            // 近くのパーティクルをペアで選択
            const p1Index = Math.floor(Math.random() * particles.length);
            let p2Index = (p1Index + 1 + Math.floor(Math.random() * 20)) % particles.length;
            
            const p1 = particles[p1Index];
            const p2 = particles[p2Index];
            
            if (p1 && p2) {
                const distance = p1.mesh.position.distanceTo(p2.mesh.position);
                
                // 短い距離での接続
                if (distance < 15) {
                    linePositionArray[0] = p1.mesh.position.x;
                    linePositionArray[1] = p1.mesh.position.y;
                    linePositionArray[2] = p1.mesh.position.z;
                    linePositionArray[3] = p2.mesh.position.x;
                    linePositionArray[4] = p2.mesh.position.y;
                    linePositionArray[5] = p2.mesh.position.z;
                    
                    lineGeometries[lineToUpdate].attributes.position.needsUpdate = true;
                    
                    // 時間変化も加えた透明度変化
                    const opacity = 0.03 * (1 - distance / 15) * (0.7 + 0.3 * Math.sin(time * 2 + lineToUpdate));
                    line.material.opacity = opacity;
                } else {
                    line.material.opacity = 0;
                }
            }
        }
        
        // メモリ使用量最適化のため、定期的にガベージコレクションを促す
        if (frameCount % 1000 === 0) {
            // フレームカウンターをリセット
            frameCount = 0;
        }
        
        renderer.render(scene, camera);
        
        // 開発時のみStats.jsを更新
        // if (stats) stats.update();
    };
    
    // アニメーション開始
    animate();
    
    // リサイズイベント処理
    window.addEventListener('resize', function() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }, { passive: true });
    
    // クリーンアップ関数（SPA用）
    return function cleanup() {
        window.removeEventListener('resize', null);
        window.removeEventListener('mousemove', null);
        window.removeEventListener('touchmove', null);
        
        // Three.jsリソースを解放
        scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
        }
    };
}

// グローバルスコープで関数を利用可能に
window.initThreeJSParticles = initThreeJSParticles;

// DOMContentLoadedでThree.jsパーティクルエフェクトを初期化
document.addEventListener('DOMContentLoaded', function() {
    if (typeof THREE !== 'undefined' && document.getElementById('three-container')) {
        initThreeJSParticles();
    }
});
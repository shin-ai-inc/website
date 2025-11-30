/**
 * ShinAI Website - Common Elements (Header & Footer)
 * このファイルは全ページのヘッダーとフッターを生成・管理します。
 */

// 初期化関数
function initCommonElements() {
    renderHeader();
    renderFooter();
    setActiveNavLink();
}

// DOMの状態に応じて初期化を実行
if (document.readyState === 'loading') {
    // DOMがまだ読み込み中の場合
    document.addEventListener('DOMContentLoaded', initCommonElements);
} else {
    // DOMがすでに読み込まれている場合（bfcache等からの復元時）
    initCommonElements();
}

// bfcache（戻る/進むボタン）からの復元時にも再初期化
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        // bfcacheから復元された場合、ヘッダーが空なら再描画
        const header = document.getElementById('header');
        if (header && header.innerHTML.trim() === '') {
            initCommonElements();
        }
    }
});

/**
 * ヘッダーをレンダリングする関数
 */
function renderHeader() {
    const headerHtml = `
    <div class="header-inner">
        <!-- Logo Component -->
        <a href="index.html" class="logo" aria-label="ShinAIホームページ">
            <div class="logo-icon">
                <img src="assets/images/logo.png" alt="ShinAI" width="28" height="28">
            </div>
            <span>ShinAI</span>
        </a>
        
        <!-- Desktop Navigation -->
        <nav aria-label="メインナビゲーション">
            <ul class="nav" id="nav">
                <li class="nav-item">
                    <a href="index.html" class="nav-link" data-page="index.html">ホーム</a>
                </li>
                <li class="nav-item">
                    <a href="about.html" class="nav-link" data-page="about.html">会社紹介</a>
                </li>
                <li class="nav-item">
                    <a href="services.html" class="nav-link" data-page="services.html">サービス</a>
                </li>
                <li class="nav-item">
                    <a href="industries.html" class="nav-link" data-page="industries.html">業界別活用</a>
                </li>
                <li class="nav-item">
                    <a href="faq.html" class="nav-link" data-page="faq.html">よくある質問</a>
                </li>
                <li class="nav-item">
                    <a href="contact.html" class="nav-link" data-page="contact.html">お問い合わせ</a>
                </li>
                <li class="nav-cta">
                    <a href="contact.html" class="btn-header-consultation">
                        <i class="fas fa-comment-dots"></i>
                        <span>無料相談</span>
                    </a>
                </li>
            </ul>
        </nav>
        
        <!-- Mobile Hamburger -->
        <button class="hamburger" id="hamburger" aria-expanded="false" aria-controls="nav" aria-label="メニューを開く">
            <i class="fas fa-bars" aria-hidden="true"></i>
        </button>
    </div>
    `;

    const headerElement = document.getElementById('header');
    if (headerElement) {
        headerElement.innerHTML = headerHtml;
        
        // ハンバーガーメニューのイベントリスナーを再設定
        // (HTMLを書き換えたため、要素を取得し直してイベントを設定する必要があります)
        initializeMobileMenu();
    }
}

/**
 * フッターをレンダリングする関数
 */
function renderFooter() {
    const currentYear = new Date().getFullYear();
    const footerHtml = `
        <div class="container">
            <div class="footer-grid">
                <!-- Footer Brand Column Component -->
                <div>
                    <div class="footer-logo">
                        <div class="footer-logo-icon">
                            <img src="assets/images/logo.png" alt="ShinAI" width="36" height="36">
                        </div>
                        <span class="footer-logo-text">ShinAI</span>
                    </div>
                    <p class="footer-description">
                        AIエージェント開発やRAG構築など、最先端のAI技術で企業の課題を解決。<br>プロトタイプから始める伴走型開発で、確実な成果を実現します。
                    </p>
                    <div class="footer-social">
                        <a href="https://twitter.com/ShinAI_JP" class="footer-social-link" aria-label="Twitter">
                            <i class="fab fa-twitter" aria-hidden="true"></i>
                        </a>
                        <a href="https://www.facebook.com/ShinAI.tech" class="footer-social-link" aria-label="Facebook">
                            <i class="fab fa-facebook-f" aria-hidden="true"></i>
                        </a>
                        <a href="https://www.linkedin.com/company/shinai-tech" class="footer-social-link" aria-label="LinkedIn">
                            <i class="fab fa-linkedin-in" aria-hidden="true"></i>
                        </a>
                        <a href="https://www.instagram.com/shinai.tech" class="footer-social-link" aria-label="Instagram">
                            <i class="fab fa-instagram" aria-hidden="true"></i>
                        </a>
                    </div>
                </div>
                
                <!-- Footer Services Column Component -->
                <div>
                    <h4 class="footer-heading">サービス</h4>
                    <ul class="footer-links">
                        <li><a href="services.html#aipro">新規事業企画書AIツール「アイプロ」</a></li>
                        <li><a href="services.html#custom">オーダーメイドAIアプリケーション開発</a></li>
                        <li><a href="services.html#consulting">AI導入(DX/AX)コンサルティング</a></li>
                    </ul>
                </div>
                
                <!-- Footer Company Column Component -->
                <div>
                    <h4 class="footer-heading">会社情報</h4>
                    <ul class="footer-links">
                        <li><a href="about.html">会社概要</a></li>
                        <li><a href="about.html#philosophy">企業理念</a></li>
                        <li><a href="industries.html">AI活用事例</a></li>
                        <li><a href="faq.html">よくある質問</a></li>
                        <li><a href="about.html#careers">採用情報</a></li>
                    </ul>
                </div>
                
                <!-- Footer Contact Column Component -->
                <div>
                    <h4 class="footer-heading">お問い合わせ</h4>
                    <div class="footer-contact-item">
                        <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
                        <span>〒100-0001 東京都千代田区丸の内3-8-3<br>Tokyo Innovation Base</span>
                    </div>
                    <div class="footer-contact-item">
                        <i class="fas fa-envelope" aria-hidden="true"></i>
                        <a href="mailto:shinai.life@gmail.com">shinai.life@gmail.com</a>
                    </div>
                    <div class="footer-contact-item">
                        <i class="fas fa-clock" aria-hidden="true"></i>
                        <span>平日 9:00〜18:00（土日祝休）</span>
                    </div>
                    <div class="footer-contact-item">
                        <i class="fas fa-file-alt" aria-hidden="true"></i>
                        <a href="contact.html">お問い合わせフォーム</a>
                    </div>
                </div>
            </div>
            
            <!-- Footer Bottom Component -->
            <div class="footer-bottom">
                <p class="footer-copyright">&copy; <span id="current-year">${currentYear}</span> ShinAI All Rights Reserved.</p>
                <div class="footer-links-inline">
                    <a href="privacy-policy.html">プライバシーポリシー</a>
                    <a href="terms.html">利用規約</a>
                    <a href="legal.html">特定商取引法に基づく表記</a>
                </div>
            </div>
        </div>
    `;

    const footerElement = document.getElementById('footer');
    if (footerElement) {
        footerElement.innerHTML = footerHtml;
    }
}

/**
 * 現在のページに基づいてナビゲーションのactiveクラスを設定する関数
 */
function setActiveNavLink() {
    const currentPath = window.location.pathname;
    let pageName = currentPath.split('/').pop() || 'index.html';
    
    // 拡張子がない場合は .html を追加（npx serve などの対応）
    if (pageName && !pageName.includes('.')) {
        pageName = pageName + '.html';
    }
    // ルートパス（/）の場合は index.html
    if (pageName === '' || pageName === '.html') {
        pageName = 'index.html';
    }
    
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        // activeクラスを一旦削除
        link.classList.remove('active');
        link.removeAttribute('aria-current');
        
        // データ属性またはhref属性と比較
        const linkPage = link.getAttribute('data-page');
        
        if (linkPage === pageName) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });
}

/**
 * モバイルメニューの初期化（動的生成後に呼び出す）
 */
function initializeMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const nav = document.getElementById('nav');
    
    if (hamburger && nav) {
        hamburger.addEventListener('click', () => {
            const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
            hamburger.setAttribute('aria-expanded', !isExpanded);
            nav.classList.toggle('active');
            hamburger.classList.toggle('active');
        });

        // リンククリック時にメニューを閉じる
        const navLinks = nav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.setAttribute('aria-expanded', 'false');
                nav.classList.remove('active');
                hamburger.classList.remove('active');
            });
        });
    }
}


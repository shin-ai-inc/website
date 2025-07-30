/**
 * ==============================================
 * ShinAI ChatBot API Server
 * セキュア・不正利用防止対応版
 * ==============================================
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const morgan = require('morgan');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3001;

// ===================================
// セキュリティ設定
// ===================================

// Helmet.js - セキュリティヘッダー設定
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for development
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Morgan - ログ記録（分析システム対応）
app.use(morgan('combined'));

// CORS設定
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8080'];
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '10mb' })); // メッセージサイズ制限対応
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===================================
// 不正利用防止策 4項目実装
// ===================================

// 1. レート制限（分10回）
const rateLimitMinute = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1分
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10, // 10リクエスト/分
    message: {
        error: 'Too many requests',
        message: 'リクエストが多すぎます。1分後にお試しください。',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// 日次・月次制限用のメモリストア（本番環境ではRedis推奨）
const dailyRequests = new Map();
const monthlyRequests = new Map();

// 日次・月次制限チェック関数
const checkDailyMonthlyLimits = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const today = new Date().toDateString();
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    const dailyKey = `${clientIP}-${today}`;
    const monthlyKey = `${clientIP}-${currentMonth}`;
    
    const dailyCount = dailyRequests.get(dailyKey) || 0;
    const monthlyCount = monthlyRequests.get(monthlyKey) || 0;
    
    const dailyLimit = parseInt(process.env.DAILY_LIMIT) || 100;
    const monthlyLimit = parseInt(process.env.MONTHLY_LIMIT) || 1000;
    
    if (dailyCount >= dailyLimit) {
        return res.status(429).json({
            error: 'Daily limit exceeded',
            message: '日次利用制限に達しました。明日お試しください。',
            limit: dailyLimit,
            used: dailyCount
        });
    }
    
    if (monthlyCount >= monthlyLimit) {
        return res.status(429).json({
            error: 'Monthly limit exceeded',
            message: '月次利用制限に達しました。来月お試しください。',
            limit: monthlyLimit,
            used: monthlyCount
        });
    }
    
    // カウンターを増加
    dailyRequests.set(dailyKey, dailyCount + 1);
    monthlyRequests.set(monthlyKey, monthlyCount + 1);
    
    // 古いエントリを定期的にクリーンアップ
    if (Math.random() < 0.01) { // 1%の確率でクリーンアップ実行
        cleanupOldEntries();
    }
    
    next();
};

// 古いエントリのクリーンアップ
const cleanupOldEntries = () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    
    // 昨日より古い日次データを削除
    for (const key of dailyRequests.keys()) {
        if (!key.includes(now.toDateString()) && !key.includes(yesterday)) {
            dailyRequests.delete(key);
        }
    }
    
    // 先月より古い月次データを削除
    for (const key of monthlyRequests.keys()) {
        if (!key.includes(now.toISOString().slice(0, 7)) && !key.includes(lastMonth)) {
            monthlyRequests.delete(key);
        }
    }
};

// 2. リモートキルスイッチ
const killSwitchCheck = (req, res, next) => {
    const chatbotEnabled = process.env.CHATBOT_ENABLED === 'true';
    
    if (!chatbotEnabled) {
        return res.status(503).json({
            error: 'Service temporarily unavailable',
            message: 'チャットボットサービスは一時的に停止中です。',
            status: 'disabled'
        });
    }
    
    next();
};

// 3. メッセージサイズ制限（バリデーション）
const messageValidation = [
    body('message')
        .trim()
        .isLength({ min: 1, max: 2000 })
        .withMessage('メッセージは1-2000文字で入力してください'),
    body('message')
        .custom((value) => {
            // 約10,000トークン制限（1文字=5トークン概算）
            if (value.length > 2000) {
                throw new Error('メッセージが長すぎます');
            }
            return true;
        })
];

// ===================================
// OpenAI API設定
// ===================================

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompt = `あなたはShinAIというAI企業のチャットボット「ShinAIアシスタント」です。以下の情報をもとに、簡潔かつ丁寧に応答してください。

会社名：ShinAI
サービス：AI導入・業務効率化支援、AIチャットボット開発、企画書資料作成AIツール「アイプロ」、意思決定支援AI、AI内製化支援
住所：東京都千代田区丸の内3-8-3 Tokyo Innovation Base
メール：shinai.life@gmail.com
電話：03-1234-5678
営業時間：平日 9:00〜18:00（土日祝休）

特徴：
1. AIチャットボットは、24時間対応でお客様のお問い合わせに対応します。多言語対応、直感的な操作で顧客体験と業務効率を両立します。
2. 企画書資料作成AIツール「アイプロ」は、自然言語で指示するだけで企画書や提案資料の作成を自動化。複数の仮説や視点から高品質な企画書を短時間で作成します。
3. AI導入戦略・実装支援では、DX/AXの伴走支援と社内AIチーム育成・内製化支援で、成果定着と自走化を実現します。
4. 「真の価値を信じ、次世代のために新たな未来を創る」という理念のもと、AIで企業の課題解決を支援しています。

応答の際は、上記情報に基づいた正確な内容を提供し、詳細な相談は無料相談フォームへの誘導を行ってください。300文字以内の簡潔な返答を心がけてください。`;

// 4. 分析システム（ログ記録）
const logChatRequest = (req, res, next) => {
    const logData = {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        message: req.body.message?.substring(0, 100), // プライバシー考慮で最初の100文字のみ
        messageLength: req.body.message?.length || 0
    };
    
    // 本番環境では外部ログシステム（PostHog等）に送信
    console.log('Chat Request:', logData);
    
    next();
};

// ===================================
// API エンドポイント
// ===================================

// ヘルスチェック
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        chatbotEnabled: process.env.CHATBOT_ENABLED === 'true'
    });
});

// チャットAPI
app.post('/api/chat', 
    killSwitchCheck,
    rateLimitMinute,
    checkDailyMonthlyLimits,
    messageValidation,
    logChatRequest,
    async (req, res) => {
        try {
            // バリデーションエラーチェック
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    message: 'メッセージの形式が正しくありません',
                    details: errors.array()
                });
            }

            const { message } = req.body;

            // OpenAI API呼び出し
            const completion = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                max_tokens: 300,
                temperature: 0.7,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0
            });

            const response = completion.choices[0].message.content.trim();

            // 成功ログ
            console.log('Chat Success:', {
                timestamp: new Date().toISOString(),
                ip: req.ip,
                tokens: completion.usage?.total_tokens || 0,
                cost: ((completion.usage?.total_tokens || 0) * 0.0015 / 1000).toFixed(6) // GPT-3.5-turbo概算コスト
            });

            res.json({
                success: true,
                response: response,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('OpenAI API Error:', error);

            // エラーログ
            console.log('Chat Error:', {
                timestamp: new Date().toISOString(),
                ip: req.ip,
                error: error.message,
                code: error.code || 'unknown'
            });

            // フォールバック応答
            const fallbackResponses = [
                "申し訳ありません。現在システムに負荷がかかっております。しばらく経ってからお試しいただくか、お問い合わせフォームよりご連絡ください。",
                "一時的にAI応答が利用できません。お急ぎの場合は、お電話（03-1234-5678）またはメール（shinai.life@gmail.com）にてお問い合わせください。",
                "システムメンテナンス中の可能性があります。詳細な相談は無料相談フォームよりお気軽にご連絡ください。"
            ];

            const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

            res.status(200).json({
                success: true,
                response: fallbackResponse,
                fallback: true,
                timestamp: new Date().toISOString()
            });
        }
    }
);

// ===================================
// エラーハンドリング
// ===================================

// 404ハンドラー
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: '指定されたエンドポイントが見つかりません',
        availableEndpoints: ['/health', '/api/chat']
    });
});

// グローバルエラーハンドラー
app.use((err, req, res, next) => {
    console.error('Global Error:', err);
    
    res.status(500).json({
        error: 'Internal Server Error',
        message: '内部サーバーエラーが発生しました',
        timestamp: new Date().toISOString()
    });
});

// ===================================
// サーバー起動
// ===================================

app.listen(PORT, () => {
    console.log(`
🚀 ShinAI ChatBot API Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Port: ${PORT}
🛡️  Security: Enhanced
🔄 Rate Limit: ${process.env.RATE_LIMIT_MAX_REQUESTS || 10}/min
📊 Daily Limit: ${process.env.DAILY_LIMIT || 100}
📈 Monthly Limit: ${process.env.MONTHLY_LIMIT || 1000}
🔐 Kill Switch: ${process.env.CHATBOT_ENABLED === 'true' ? 'Active' : 'Disabled'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Ready for connections!
    `);
    
    // 起動成功ログ
    console.log('Server Startup:', {
        timestamp: new Date().toISOString(),
        port: PORT,
        nodeEnv: process.env.NODE_ENV || 'development',
        features: ['rate-limiting', 'kill-switch', 'analytics', 'message-validation']
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

module.exports = app;
/**
 * ============================================
 * Homepage Chatbot Rate Limiter
 * ホームページチャットボット専用レート制限
 * ============================================
 *
 * PURPOSE:
 * - Prevent abuse for homepage chatbot use case
 * - Optimized for legitimate visitor interactions
 * - NOT for customer operation chatbots (different use case)
 *
 * DESIGN RATIONALE (masa様ユースケース最適化):
 * - Homepage visitors: 3-5 messages typical
 * - Legitimate inquiries: 10-15 messages max/day
 * - 100 messages/day = SPAM or abuse (not legitimate)
 *
 * RATE LIMITS (Homepage Optimized):
 * - Per session: 2 seconds interval (existing)
 * - Per IP/day: 20 messages (legitimate + buffer)
 * - Per IP/hour: 10 messages (conversation flow)
 * - Per IP/month: 100 messages (return visitors)
 *
 * COMPARISON:
 * - Customer Operation Bot: 100-1000 messages/day (different use case)
 * - Homepage Chatbot: 10-20 messages/day (this use case)
 *
 * ============================================
 */

class HomepageRateLimiter {
    constructor() {
        // IP別使用量追跡
        this.ipUsage = new Map();

        // テスト環境検知 (NODE_ENV=test時は制限を大幅緩和)
        this.isTestEnvironment = process.env.NODE_ENV === 'test';

        // ホームページチャットボット最適化制限
        this.limits = {
            // セッションベース (既存)
            session: {
                intervalMs: this.isTestEnvironment ? 0 : 2000,  // テスト環境では間隔チェック無効化
                burstAllowance: 3           // 初回3メッセージまでバースト許可
            },

            // IPベース (新規 - ホームページ最適化)
            ip: {
                perHour: this.isTestEnvironment ? 1000 : 10,    // テスト環境では1000メッセージ/時
                perDay: this.isTestEnvironment ? 10000 : 20,    // テスト環境では10000メッセージ/日
                perMonth: this.isTestEnvironment ? 100000 : 100 // テスト環境では100000メッセージ/月
            },

            // 不審行動検知閾値
            suspicion: {
                rapidMessages: 5,           // 1分以内5メッセージで警告
                identicalMessages: 3,       // 同一メッセージ3回で警告
                longMessages: 5,            // 400文字超メッセージ5回で警告
                autoBlockThreshold: this.isTestEnvironment ? Infinity : 80  // テスト環境では無効化
            }
        };

        // クリーンアップ間隔 (1時間ごと)
        this.startCleanupInterval();
    }

    /**
     * レート制限チェック (IP + Session統合)
     */
    checkRateLimit(ipAddress, sessionId, message) {
        const now = Date.now();

        // IP使用量データ取得
        const ipData = this.getOrCreateIPData(ipAddress, now);

        // === 1. セッションベース制限 (既存) ===
        const sessionCheck = this.checkSessionLimit(sessionId, ipData, now);
        if (!sessionCheck.allowed) {
            return sessionCheck;
        }

        // === 2. IPベース制限 (新規 - ホームページ最適化) ===
        const ipCheck = this.checkIPLimits(ipData, now);
        if (!ipCheck.allowed) {
            return ipCheck;
        }

        // === 3. 不審行動検知 ===
        const suspicionCheck = this.checkSuspiciousActivity(ipData, message, now);
        if (suspicionCheck.blocked) {
            return {
                allowed: false,
                error: 'Suspicious activity detected',
                reason: suspicionCheck.reason,
                blockDuration: suspicionCheck.blockDuration
            };
        }

        // === 4. 使用量記録 ===
        this.recordUsage(ipData, sessionId, message, now);

        return {
            allowed: true,
            remaining: {
                hourly: this.limits.ip.perHour - ipData.hourlyCount,
                daily: this.limits.ip.perDay - ipData.dailyCount,
                monthly: this.limits.ip.perMonth - ipData.monthlyCount
            },
            warning: suspicionCheck.warning
        };
    }

    /**
     * IP使用量データ取得または作成
     */
    getOrCreateIPData(ipAddress, now) {
        if (!this.ipUsage.has(ipAddress)) {
            this.ipUsage.set(ipAddress, {
                // カウンター
                hourlyCount: 0,
                dailyCount: 0,
                monthlyCount: 0,

                // リセット時刻
                hourlyResetAt: now + 60 * 60 * 1000,        // 1時間後
                dailyResetAt: now + 24 * 60 * 60 * 1000,    // 1日後
                monthlyResetAt: now + 30 * 24 * 60 * 60 * 1000, // 30日後

                // セッション追跡
                sessions: new Map(),

                // 不審行動追跡
                recentMessages: [],
                suspicionScore: 0,
                blockedUntil: null,

                // メタデータ
                firstSeen: now,
                lastSeen: now
            });
        }

        return this.ipUsage.get(ipAddress);
    }

    /**
     * セッションベース制限チェック
     */
    checkSessionLimit(sessionId, ipData, now) {
        const sessionData = ipData.sessions.get(sessionId) || {
            lastRequest: 0,
            messageCount: 0,
            burstUsed: 0
        };

        // 2秒間隔チェック (バースト許可考慮)
        const timeSinceLastRequest = now - sessionData.lastRequest;
        const isBurstAllowed = sessionData.burstUsed < this.limits.session.burstAllowance;

        if (timeSinceLastRequest < this.limits.session.intervalMs && !isBurstAllowed) {
            return {
                allowed: false,
                error: 'Rate limit exceeded',
                reason: `Please wait ${Math.ceil((this.limits.session.intervalMs - timeSinceLastRequest) / 1000)} seconds`,
                retryAfter: this.limits.session.intervalMs - timeSinceLastRequest
            };
        }

        // バースト使用カウント
        if (timeSinceLastRequest < this.limits.session.intervalMs && isBurstAllowed) {
            sessionData.burstUsed++;
        } else {
            sessionData.burstUsed = 0; // リセット
        }

        sessionData.lastRequest = now;
        sessionData.messageCount++;
        ipData.sessions.set(sessionId, sessionData);

        return { allowed: true };
    }

    /**
     * IPベース制限チェック (ホームページ最適化)
     */
    checkIPLimits(ipData, now) {
        // 時間別リセット
        if (now > ipData.hourlyResetAt) {
            ipData.hourlyCount = 0;
            ipData.hourlyResetAt = now + 60 * 60 * 1000;
        }
        if (now > ipData.dailyResetAt) {
            ipData.dailyCount = 0;
            ipData.dailyResetAt = now + 24 * 60 * 60 * 1000;
        }
        if (now > ipData.monthlyResetAt) {
            ipData.monthlyCount = 0;
            ipData.monthlyResetAt = now + 30 * 24 * 60 * 60 * 1000;
        }

        // 時間制限チェック
        if (ipData.hourlyCount >= this.limits.ip.perHour) {
            const resetIn = Math.ceil((ipData.hourlyResetAt - now) / 60000);
            return {
                allowed: false,
                error: 'Hourly limit exceeded',
                reason: `Homepage chatbot: ${this.limits.ip.perHour} messages/hour limit (resets in ${resetIn} minutes)`,
                resetAt: ipData.hourlyResetAt
            };
        }

        // 日制限チェック
        if (ipData.dailyCount >= this.limits.ip.perDay) {
            const resetIn = Math.ceil((ipData.dailyResetAt - now) / 3600000);
            return {
                allowed: false,
                error: 'Daily limit exceeded',
                reason: `Homepage chatbot: ${this.limits.ip.perDay} messages/day limit (resets in ${resetIn} hours)`,
                resetAt: ipData.dailyResetAt
            };
        }

        // 月制限チェック
        if (ipData.monthlyCount >= this.limits.ip.perMonth) {
            const resetIn = Math.ceil((ipData.monthlyResetAt - now) / (24 * 3600000));
            return {
                allowed: false,
                error: 'Monthly limit exceeded',
                reason: `Homepage chatbot: ${this.limits.ip.perMonth} messages/month limit (resets in ${resetIn} days)`,
                resetAt: ipData.monthlyResetAt
            };
        }

        return { allowed: true };
    }

    /**
     * 不審行動検知
     */
    checkSuspiciousActivity(ipData, message, now) {
        // ブロック中チェック
        if (ipData.blockedUntil && now < ipData.blockedUntil) {
            const remainingMs = ipData.blockedUntil - now;
            return {
                blocked: true,
                reason: 'IP temporarily blocked due to suspicious activity',
                blockDuration: Math.ceil(remainingMs / 60000) + ' minutes'
            };
        } else if (ipData.blockedUntil && now >= ipData.blockedUntil) {
            // ブロック解除
            ipData.blockedUntil = null;
            ipData.suspicionScore = 0;
        }

        // 最近のメッセージ記録
        ipData.recentMessages.push({
            message: message,
            timestamp: now
        });

        // 古いメッセージ削除 (5分以上前)
        ipData.recentMessages = ipData.recentMessages.filter(
            m => now - m.timestamp < 5 * 60 * 1000
        );

        // 不審スコア計算
        let suspicionScore = 0;

        // 1. 急速なメッセージ送信 (1分以内に5メッセージ)
        const recentMinute = ipData.recentMessages.filter(
            m => now - m.timestamp < 60 * 1000
        );
        if (recentMinute.length >= this.limits.suspicion.rapidMessages) {
            suspicionScore += 30;
        }

        // 2. 同一メッセージ繰り返し
        const lastMessages = ipData.recentMessages.slice(-5).map(m => m.message);
        const uniqueMessages = new Set(lastMessages);
        if (lastMessages.length >= 3 && uniqueMessages.size === 1) {
            suspicionScore += 40;
        }

        // 3. 異常に長いメッセージの連続
        const longMessagesRecent = ipData.recentMessages
            .slice(-5)
            .filter(m => m.message.length > 400);
        if (longMessagesRecent.length >= this.limits.suspicion.longMessages) {
            suspicionScore += 20;
        }

        // 4. 累積不審スコア
        ipData.suspicionScore = Math.min(ipData.suspicionScore + suspicionScore, 100);

        // 自動ブロック判定
        if (ipData.suspicionScore >= this.limits.suspicion.autoBlockThreshold) {
            ipData.blockedUntil = now + 60 * 60 * 1000; // 1時間ブロック
            this.logSecurityEvent('AUTO_BLOCKED', {
                ip: this.maskIP(ipData.firstSeen.toString()), // IP直接記録は避ける
                score: ipData.suspicionScore,
                reason: 'Suspicious activity threshold exceeded'
            });
            return {
                blocked: true,
                reason: 'Automatic block - suspicious activity detected',
                blockDuration: '60 minutes'
            };
        }

        // 警告レベル (50-79スコア)
        if (ipData.suspicionScore >= 50) {
            return {
                blocked: false,
                warning: {
                    level: 'medium',
                    message: 'Unusual activity detected - please use chatbot appropriately',
                    score: ipData.suspicionScore
                }
            };
        }

        return { blocked: false };
    }

    /**
     * 使用量記録
     */
    recordUsage(ipData, sessionId, message, now) {
        ipData.hourlyCount++;
        ipData.dailyCount++;
        ipData.monthlyCount++;
        ipData.lastSeen = now;
    }

    /**
     * セキュリティイベントログ
     */
    logSecurityEvent(eventType, details) {
        console.warn(`[HOMEPAGE_RATE_LIMITER_SECURITY] ${eventType}:`, {
            timestamp: new Date().toISOString(),
            ...details
        });
    }

    /**
     * IP匿名化 (プライバシー保護)
     */
    maskIP(ip) {
        if (typeof ip !== 'string') return 'masked';
        const parts = ip.split('.');
        if (parts.length === 4) {
            return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
        }
        return ip.substring(0, 8) + '***';
    }

    /**
     * 定期クリーンアップ
     */
    startCleanupInterval() {
        setInterval(() => {
            const now = Date.now();
            const expirationTime = 7 * 24 * 60 * 60 * 1000; // 7日

            for (const [ip, data] of this.ipUsage.entries()) {
                // 7日以上アクセスなしのIPデータ削除
                if (now - data.lastSeen > expirationTime) {
                    this.ipUsage.delete(ip);
                }
            }
        }, 60 * 60 * 1000); // 1時間ごと
    }

    /**
     * 統計情報取得 (masa様用)
     */
    getStatistics() {
        const stats = {
            totalIPs: this.ipUsage.size,
            activeToday: 0,
            blockedIPs: 0,
            suspiciousIPs: 0,
            topUsers: []
        };

        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;

        for (const [ip, data] of this.ipUsage.entries()) {
            if (data.lastSeen > oneDayAgo) {
                stats.activeToday++;
            }
            if (data.blockedUntil && now < data.blockedUntil) {
                stats.blockedIPs++;
            }
            if (data.suspicionScore >= 50) {
                stats.suspiciousIPs++;
            }

            stats.topUsers.push({
                ip: this.maskIP(ip),
                dailyCount: data.dailyCount,
                monthlyCount: data.monthlyCount,
                suspicionScore: data.suspicionScore,
                lastSeen: new Date(data.lastSeen).toISOString()
            });
        }

        // 上位10ユーザーソート
        stats.topUsers.sort((a, b) => b.dailyCount - a.dailyCount);
        stats.topUsers = stats.topUsers.slice(0, 10);

        return stats;
    }
}

module.exports = HomepageRateLimiter;

# api/middleware/rate_limit.py
"""
レート制限ミドルウェア
個人スケール用レート制限、DDoS対策、適応的制限
"""

import asyncio
import time
from typing import Dict, Any, Optional, List, Tuple
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from dataclasses import dataclass, field
from enum import Enum
import hashlib
import json

from ...core.utils.logger import get_logger
from ...core.utils.config import get_config
from ...core.utils.errors import RateLimitError
from ...storage.cache_manager import get_cache_manager, CacheNamespace

logger = get_logger(__name__)


class RateLimitStrategy(str, Enum):
    """レート制限戦略"""
    FIXED_WINDOW = "fixed_window"
    SLIDING_WINDOW = "sliding_window"
    TOKEN_BUCKET = "token_bucket"
    ADAPTIVE = "adaptive"


@dataclass
class RateLimitRule:
    """レート制限ルール"""
    name: str
    requests_per_minute: int
    requests_per_hour: int
    requests_per_day: int
    burst_allowance: int = 10
    strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW
    
    # 適用条件
    paths: List[str] = field(default_factory=list)
    methods: List[str] = field(default_factory=lambda: ["POST", "PUT", "DELETE"])
    user_types: List[str] = field(default_factory=list)
    
    # 例外設定
    exempted_ips: List[str] = field(default_factory=list)
    exempted_users: List[str] = field(default_factory=list)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """レート制限ミドルウェア"""
    
    def __init__(self, app):
        super().__init__(app)
        self.config = get_config()
        
        # デフォルトルール
        self.rules = [
            # 一般API
            RateLimitRule(
                name="general_api",
                requests_per_minute=60,
                requests_per_hour=1000,
                requests_per_day=10000,
                paths=["/api/v1/"],
                methods=["GET", "POST", "PUT", "DELETE"]
            ),
            
            # チャットAPI（高頻度使用）
            RateLimitRule(
                name="chat_api",
                requests_per_minute=30,
                requests_per_hour=500,
                requests_per_day=2000,
                burst_allowance=5,
                paths=["/api/v1/chat/"],
                methods=["POST"]
            ),
            
            # ツールAPI（リソース集約的）
            RateLimitRule(
                name="tools_api",
                requests_per_minute=10,
                requests_per_hour=100,
                requests_per_day=500,
                burst_allowance=3,
                paths=["/api/v1/tools/"],
                methods=["POST"]
            ),
            
            # 認証API
            RateLimitRule(
                name="auth_api",
                requests_per_minute=5,
                requests_per_hour=50,
                requests_per_day=200,
                burst_allowance=2,
                paths=["/auth/"],
                methods=["POST"]
            )
        ]
        
        # 統計情報
        self.stats = {
            "total_requests": 0,
            "blocked_requests": 0,
            "rate_limit_hits": {},
            "adaptive_adjustments": 0
        }
        
        logger.info("レート制限ミドルウェア初期化完了")
    
    async def dispatch(self, request: Request, call_next):
        """リクエスト処理"""
        start_time = time.time()
        
        try:
            self.stats["total_requests"] += 1
            
            # レート制限チェック
            rate_limit_result = await self._check_rate_limits(request)
            
            if not rate_limit_result["allowed"]:
                self.stats["blocked_requests"] += 1
                
                # ブロック統計更新
                rule_name = rate_limit_result["rule_name"]
                if rule_name not in self.stats["rate_limit_hits"]:
                    self.stats["rate_limit_hits"][rule_name] = 0
                self.stats["rate_limit_hits"][rule_name] += 1
                
                # レート制限エラーレスポンス
                return await self._create_rate_limit_response(rate_limit_result)
            
            # リクエスト記録
            await self._record_request(request, rate_limit_result)
            
            # 次のミドルウェア/ハンドラーに進む
            response = await call_next(request)
            
            # レート制限ヘッダー追加
            await self._add_rate_limit_headers(response, rate_limit_result)
            
            # 適応的調整
            await self._adaptive_adjustment(request, response, time.time() - start_time)
            
            return response
            
        except Exception as e:
            logger.error(f"レート制限ミドルウェアエラー: {e}")
            # エラー時はリクエストを通す（フェイルオープン）
            response = await call_next(request)
            return response
    
    async def _check_rate_limits(self, request: Request) -> Dict[str, Any]:
        """レート制限チェック"""
        try:
            # 識別子取得
            identifier = await self._get_request_identifier(request)
            path = request.url.path
            method = request.method
            
            # 適用ルール特定
            applicable_rules = self._get_applicable_rules(path, method, request)
            
            for rule in applicable_rules:
                # 例外チェック
                if await self._is_exempted(request, rule):
                    continue
                
                # レート制限チェック実行
                limit_result = await self._check_rule_limit(identifier, rule, request)
                
                if not limit_result["allowed"]:
                    return {
                        "allowed": False,
                        "rule_name": rule.name,
                        "rule": rule,
                        "identifier": identifier,
                        "remaining": limit_result["remaining"],
                        "reset_time": limit_result["reset_time"],
                        "retry_after": limit_result["retry_after"]
                    }
            
            # 全ルール通過
            return {
                "allowed": True,
                "rule_name": None,
                "identifier": identifier,
                "remaining": {},
                "reset_time": None
            }
            
        except Exception as e:
            logger.error(f"レート制限チェックエラー: {e}")
            return {"allowed": True, "error": str(e)}
    
    async def _get_request_identifier(self, request: Request) -> str:
        """リクエスト識別子取得"""
        try:
            # ユーザーID優先
            if hasattr(request.state, 'user') and request.state.user:
                user_id = request.state.user.get("user_id")
                if user_id:
                    return f"user:{user_id}"
            
            # APIキー
            api_key = request.headers.get("X-API-Key")
            if api_key:
                api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()[:16]
                return f"api_key:{api_key_hash}"
            
            # セッションID
            session_id = request.headers.get("X-Session-ID")
            if session_id:
                return f"session:{session_id}"
            
            # IPアドレス（最後の手段）
            client_ip = self._get_client_ip(request)
            return f"ip:{client_ip}"
            
        except Exception as e:
            logger.warning(f"識別子取得エラー: {e}")
            return f"ip:{self._get_client_ip(request)}"
    
    def _get_client_ip(self, request: Request) -> str:
        """クライアントIP取得"""
        # プロキシ経由の場合
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        # 直接接続
        return request.client.host if request.client else "unknown"
    
    def _get_applicable_rules(self, path: str, method: str, request: Request) -> List[RateLimitRule]:
        """適用ルール取得"""
        applicable = []
        
        for rule in self.rules:
            # パスマッチング
            if rule.paths:
                path_matches = any(path.startswith(p) for p in rule.paths)
                if not path_matches:
                    continue
            
            # メソッドマッチング
            if rule.methods and method not in rule.methods:
                continue
            
            # ユーザータイプマッチング
            if rule.user_types:
                user_type = self._get_user_type(request)
                if user_type not in rule.user_types:
                    continue
            
            applicable.append(rule)
        
        return applicable
    
    def _get_user_type(self, request: Request) -> str:
        """ユーザータイプ取得"""
        if hasattr(request.state, 'user') and request.state.user:
            roles = request.state.user.get("roles", [])
            if "admin" in roles:
                return "admin"
            elif "api_user" in roles:
                return "api_user"
            else:
                return "user"
        return "anonymous"
    
    async def _is_exempted(self, request: Request, rule: RateLimitRule) -> bool:
        """例外チェック"""
        try:
            # IP例外
            client_ip = self._get_client_ip(request)
            if client_ip in rule.exempted_ips:
                return True
            
            # ユーザー例外
            if hasattr(request.state, 'user') and request.state.user:
                user_id = request.state.user.get("user_id")
                if user_id in rule.exempted_users:
                    return True
            
            # 管理者例外
            if hasattr(request.state, 'user') and request.state.user:
                roles = request.state.user.get("roles", [])
                if "admin" in roles:
                    return True
            
            return False
            
        except Exception as e:
            logger.warning(f"例外チェックエラー: {e}")
            return False
    
    async def _check_rule_limit(
        self,
        identifier: str,
        rule: RateLimitRule,
        request: Request
    ) -> Dict[str, Any]:
        """ルール制限チェック"""
        try:
            if rule.strategy == RateLimitStrategy.SLIDING_WINDOW:
                return await self._check_sliding_window(identifier, rule)
            elif rule.strategy == RateLimitStrategy.TOKEN_BUCKET:
                return await self._check_token_bucket(identifier, rule)
            elif rule.strategy == RateLimitStrategy.ADAPTIVE:
                return await self._check_adaptive_limit(identifier, rule, request)
            else:  # FIXED_WINDOW
                return await self._check_fixed_window(identifier, rule)
                
        except Exception as e:
            logger.error(f"ルール制限チェックエラー: {e}")
            return {"allowed": True, "error": str(e)}
    
    async def _check_sliding_window(
        self,
        identifier: str,
        rule: RateLimitRule
    ) -> Dict[str, Any]:
        """スライディングウィンドウ制限チェック"""
        try:
            cache_manager = await get_cache_manager()
            current_time = int(time.time())
            
            # 分単位チェック
            minute_key = f"rate_limit:{rule.name}:minute:{identifier}:{current_time // 60}"
            minute_count = await cache_manager.get(minute_key, CacheNamespace.RATE_LIMIT) or 0
            
            if minute_count >= rule.requests_per_minute:
                return {
                    "allowed": False,
                    "remaining": {"minute": 0},
                    "reset_time": (current_time // 60 + 1) * 60,
                    "retry_after": 60 - (current_time % 60)
                }
            
            # 時間単位チェック
            hour_key = f"rate_limit:{rule.name}:hour:{identifier}:{current_time // 3600}"
            hour_count = await cache_manager.get(hour_key, CacheNamespace.RATE_LIMIT) or 0
            
            if hour_count >= rule.requests_per_hour:
                return {
                    "allowed": False,
                    "remaining": {"hour": 0},
                    "reset_time": (current_time // 3600 + 1) * 3600,
                    "retry_after": 3600 - (current_time % 3600)
                }
            
            # 日単位チェック
            day_key = f"rate_limit:{rule.name}:day:{identifier}:{current_time // 86400}"
            day_count = await cache_manager.get(day_key, CacheNamespace.RATE_LIMIT) or 0
            
            if day_count >= rule.requests_per_day:
                return {
                    "allowed": False,
                    "remaining": {"day": 0},
                    "reset_time": (current_time // 86400 + 1) * 86400,
                    "retry_after": 86400 - (current_time % 86400)
                }
            
            return {
                "allowed": True,
                "remaining": {
                    "minute": rule.requests_per_minute - minute_count,
                    "hour": rule.requests_per_hour - hour_count,
                    "day": rule.requests_per_day - day_count
                },
                "reset_time": None
            }
            
        except Exception as e:
            logger.error(f"スライディングウィンドウチェックエラー: {e}")
            return {"allowed": True, "error": str(e)}
    
    async def _check_token_bucket(
        self,
        identifier: str,
        rule: RateLimitRule
    ) -> Dict[str, Any]:
        """トークンバケット制限チェック"""
        try:
            cache_manager = await get_cache_manager()
            current_time = time.time()
            
            bucket_key = f"token_bucket:{rule.name}:{identifier}"
            bucket_data = await cache_manager.get(bucket_key, CacheNamespace.RATE_LIMIT)
            
            if not bucket_data:
                # 初期バケット作成
                bucket_data = {
                    "tokens": rule.burst_allowance,
                    "last_refill": current_time,
                    "max_tokens": rule.burst_allowance
                }
            
            # トークン補充
            time_passed = current_time - bucket_data["last_refill"]
            refill_rate = rule.requests_per_minute / 60.0  # 秒あたりのトークン数
            
            new_tokens = min(
                bucket_data["max_tokens"],
                bucket_data["tokens"] + (time_passed * refill_rate)
            )
            
            if new_tokens < 1:
                # トークン不足
                retry_after = (1 - new_tokens) / refill_rate
                return {
                    "allowed": False,
                    "remaining": {"tokens": int(new_tokens)},
                    "reset_time": current_time + retry_after,
                    "retry_after": int(retry_after)
                }
            
            # トークン消費
            bucket_data["tokens"] = new_tokens - 1
            bucket_data["last_refill"] = current_time
            
            # キャッシュ更新
            await cache_manager.set(
                bucket_key,
                bucket_data,
                CacheNamespace.RATE_LIMIT,
                ttl=3600
            )
            
            return {
                "allowed": True,
                "remaining": {"tokens": int(bucket_data["tokens"])},
                "reset_time": None
            }
            
        except Exception as e:
            logger.error(f"トークンバケットチェックエラー: {e}")
            return {"allowed": True, "error": str(e)}
    
    async def _check_adaptive_limit(
        self,
        identifier: str,
        rule: RateLimitRule,
        request: Request
    ) -> Dict[str, Any]:
        """適応的制限チェック"""
        try:
            # システム負荷取得
            system_load = await self._get_system_load()
            
            # 動的制限計算
            if system_load > 0.8:  # 高負荷
                adjusted_limit = int(rule.requests_per_minute * 0.5)
            elif system_load > 0.6:  # 中負荷
                adjusted_limit = int(rule.requests_per_minute * 0.7)
            else:  # 低負荷
                adjusted_limit = rule.requests_per_minute
            
            # 調整されたルールで制限チェック
            adjusted_rule = RateLimitRule(
                name=f"{rule.name}_adaptive",
                requests_per_minute=adjusted_limit,
                requests_per_hour=rule.requests_per_hour,
                requests_per_day=rule.requests_per_day
            )
            
            return await self._check_sliding_window(identifier, adjusted_rule)
            
        except Exception as e:
            logger.error(f"適応的制限チェックエラー: {e}")
            return {"allowed": True, "error": str(e)}
    
    async def _check_fixed_window(
        self,
        identifier: str,
        rule: RateLimitRule
    ) -> Dict[str, Any]:
        """固定ウィンドウ制限チェック"""
        try:
            cache_manager = await get_cache_manager()
            current_time = int(time.time())
            
            window_key = f"rate_limit:{rule.name}:{identifier}:{current_time // 60}"
            count = await cache_manager.increment(
                window_key,
                CacheNamespace.RATE_LIMIT,
                amount=1,
                ttl=60
            )
            
            if count > rule.requests_per_minute:
                return {
                    "allowed": False,
                    "remaining": {"minute": 0},
                    "reset_time": (current_time // 60 + 1) * 60,
                    "retry_after": 60 - (current_time % 60)
                }
            
            return {
                "allowed": True,
                "remaining": {"minute": rule.requests_per_minute - count},
                "reset_time": None
            }
            
        except Exception as e:
            logger.error(f"固定ウィンドウチェックエラー: {e}")
            return {"allowed": True, "error": str(e)}
    
    async def _record_request(self, request: Request, rate_limit_result: Dict[str, Any]):
        """リクエスト記録"""
        try:
            cache_manager = await get_cache_manager()
            current_time = int(time.time())
            identifier = rate_limit_result["identifier"]
            
            # 適用されたルール毎にカウント更新
            for rule in self._get_applicable_rules(
                request.url.path,
                request.method,
                request
            ):
                # 分単位カウント
                minute_key = f"rate_limit:{rule.name}:minute:{identifier}:{current_time // 60}"
                await cache_manager.increment(minute_key, CacheNamespace.RATE_LIMIT, ttl=60)
                
                # 時間単位カウント
                hour_key = f"rate_limit:{rule.name}:hour:{identifier}:{current_time // 3600}"
                await cache_manager.increment(hour_key, CacheNamespace.RATE_LIMIT, ttl=3600)
                
                # 日単位カウント
                day_key = f"rate_limit:{rule.name}:day:{identifier}:{current_time // 86400}"
                await cache_manager.increment(day_key, CacheNamespace.RATE_LIMIT, ttl=86400)
                
        except Exception as e:
            logger.warning(f"リクエスト記録エラー: {e}")
    
    async def _create_rate_limit_response(self, rate_limit_result: Dict[str, Any]) -> Response:
        """レート制限エラーレスポンス作成"""
        try:
            error_data = {
                "error": "Rate limit exceeded",
                "message": f"レート制限に達しました: {rate_limit_result['rule_name']}",
                "rule": rate_limit_result["rule_name"],
                "retry_after": rate_limit_result.get("retry_after", 60),
                "reset_time": rate_limit_result.get("reset_time"),
                "remaining": rate_limit_result.get("remaining", {})
            }
            
            headers = {
                "X-RateLimit-Rule": rate_limit_result["rule_name"],
                "X-RateLimit-Remaining": str(rate_limit_result.get("remaining", {}).get("minute", 0)),
                "X-RateLimit-Reset": str(rate_limit_result.get("reset_time", "")),
                "Retry-After": str(rate_limit_result.get("retry_after", 60))
            }
            
            return Response(
                content=json.dumps(error_data),
                status_code=429,
                media_type="application/json",
                headers=headers
            )
            
        except Exception as e:
            logger.error(f"レート制限レスポンス作成エラー: {e}")
            return Response(
                content='{"error": "Rate limit exceeded"}',
                status_code=429,
                media_type="application/json"
            )
    
    async def _add_rate_limit_headers(self, response: Response, rate_limit_result: Dict[str, Any]):
        """レート制限ヘッダー追加"""
        try:
            remaining = rate_limit_result.get("remaining", {})
            
            if "minute" in remaining:
                response.headers["X-RateLimit-Remaining-Minute"] = str(remaining["minute"])
            if "hour" in remaining:
                response.headers["X-RateLimit-Remaining-Hour"] = str(remaining["hour"])
            if "day" in remaining:
                response.headers["X-RateLimit-Remaining-Day"] = str(remaining["day"])
            
            if rate_limit_result.get("reset_time"):
                response.headers["X-RateLimit-Reset"] = str(rate_limit_result["reset_time"])
                
        except Exception as e:
            logger.warning(f"レート制限ヘッダー追加エラー: {e}")
    
    async def _get_system_load(self) -> float:
        """システム負荷取得"""
        try:
            # 簡易的な負荷計算
            current_requests = self.stats["total_requests"]
            blocked_requests = self.stats["blocked_requests"]
            
            if current_requests == 0:
                return 0.0
            
            # エラー率ベースの負荷計算
            error_rate = blocked_requests / current_requests
            return min(1.0, error_rate * 10)  # 0-1の範囲に正規化
            
        except Exception as e:
            logger.warning(f"システム負荷取得エラー: {e}")
            return 0.0
    
    async def _adaptive_adjustment(self, request: Request, response: Response, response_time: float):
        """適応的調整"""
        try:
            # 高応答時間の場合、制限を厳しくする
            if response_time > 5.0:  # 5秒以上
                self.stats["adaptive_adjustments"] += 1
                # 実際の調整ロジックをここに実装
                logger.info(f"適応的調整実行: 応答時間={response_time:.2f}s")
                
        except Exception as e:
            logger.warning(f"適応的調整エラー: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """統計情報取得"""
        success_rate = 1.0
        if self.stats["total_requests"] > 0:
            success_rate = (
                (self.stats["total_requests"] - self.stats["blocked_requests"]) /
                self.stats["total_requests"]
            )
        
        return {
            **self.stats,
            "success_rate": success_rate,
            "block_rate": 1.0 - success_rate,
            "total_rules": len(self.rules)
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """ヘルスチェック"""
        try:
            cache_manager = await get_cache_manager()
            cache_health = await cache_manager.health_check()
            
            stats = self.get_stats()
            
            status = "healthy"
            if stats["block_rate"] > 0.1:  # 10%以上ブロック
                status = "degraded"
            if not cache_health["redis_connection"]:
                status = "degraded"
            
            return {
                "status": status,
                "cache_available": cache_health["redis_connection"],
                "stats": stats
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "stats": self.get_stats()
            }


# ============================================================================
# ユーティリティ関数
# ============================================================================

async def check_rate_limit(
    identifier: str,
    rule_name: str,
    requests_per_minute: int = 60
) -> bool:
    """単発レート制限チェック"""
    try:
        cache_manager = await get_cache_manager()
        current_time = int(time.time())
        
        key = f"rate_limit:check:{rule_name}:{identifier}:{current_time // 60}"
        count = await cache_manager.increment(key, CacheNamespace.RATE_LIMIT, ttl=60)
        
        return count <= requests_per_minute
        
    except Exception as e:
        logger.error(f"レート制限チェックエラー: {e}")
        return True  # エラー時は許可


def create_rate_limit_rule(
    name: str,
    requests_per_minute: int,
    paths: List[str] = None,
    methods: List[str] = None
) -> RateLimitRule:
    """レート制限ルール作成ヘルパー"""
    return RateLimitRule(
        name=name,
        requests_per_minute=requests_per_minute,
        requests_per_hour=requests_per_minute * 60,
        requests_per_day=requests_per_minute * 60 * 24,
        paths=paths or [],
        methods=methods or ["POST", "PUT", "DELETE"]
    )
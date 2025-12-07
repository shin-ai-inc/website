# api/middleware/cors.py
"""
認証・セキュリティミドルウェア
JWT認証、APIキー認証、セキュリティヘッダー
"""

import asyncio
import time
from typing import Optional, Dict, Any, List
from fastapi import Request, Response, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
import jwt
import hashlib
import secrets

from ...core.utils.logger import get_logger
from ...core.utils.config import get_config
from ...core.utils.errors import AuthenticationError, AuthorizationError
from ...storage.cache_manager import get_cache_manager, CacheNamespace

logger = get_logger(__name__)


class AuthMiddleware(BaseHTTPMiddleware):
    """認証ミドルウェア"""
    
    def __init__(self, app):
        super().__init__(app)
        self.config = get_config()
        self.security = HTTPBearer(auto_error=False)
        
        # 認証不要パス
        self.public_paths = {
            "/health",
            "/docs", 
            "/redoc",
            "/openapi.json",
            "/metrics",
            "/info"
        }
        
        # APIキー認証パス
        self.api_key_paths = {
            "/api/v1/tools",
            "/api/v1/memory"
        }
        
        # JWT必須パス
        self.jwt_required_paths = {
            "/api/v1/sessions",
            "/api/v1/analytics"
        }
        
        logger.info("認証ミドルウェア初期化完了")
    
    async def dispatch(self, request: Request, call_next):
        """リクエスト処理"""
        start_time = time.time()
        
        try:
            # パス判定
            path = request.url.path
            
            # 認証不要パス
            if self._is_public_path(path):
                response = await call_next(request)
                await self._add_security_headers(response)
                return response
            
            # 認証実行
            auth_result = await self._authenticate_request(request)
            
            if not auth_result["authenticated"]:
                raise AuthenticationError("認証が必要です")
            
            # ユーザー情報をリクエストに追加
            request.state.user = auth_result["user"]
            request.state.auth_method = auth_result["method"]
            
            # 認可チェック
            if not await self._authorize_request(request, auth_result["user"]):
                raise AuthorizationError("アクセス権限がありません")
            
            # 次のミドルウェア/ハンドラーに進む
            response = await call_next(request)
            
            # セキュリティヘッダー追加
            await self._add_security_headers(response)
            
            # 認証メトリクス記録
            await self._record_auth_metrics(request, auth_result, time.time() - start_time)
            
            return response
            
        except AuthenticationError as e:
            logger.warning(f"認証エラー: {path} - {e}")
            return Response(
                content=f'{{"error": "Authentication required", "message": "{str(e)}"}}',
                status_code=401,
                media_type="application/json"
            )
            
        except AuthorizationError as e:
            logger.warning(f"認可エラー: {path} - {e}")
            return Response(
                content=f'{{"error": "Access denied", "message": "{str(e)}"}}',
                status_code=403,
                media_type="application/json"
            )
            
        except Exception as e:
            logger.error(f"認証ミドルウェアエラー: {path} - {e}")
            return Response(
                content='{"error": "Internal authentication error"}',
                status_code=500,
                media_type="application/json"
            )
    
    def _is_public_path(self, path: str) -> bool:
        """認証不要パス判定"""
        # 完全一致
        if path in self.public_paths:
            return True
        
        # プレフィックス一致
        public_prefixes = ["/docs", "/redoc", "/static"]
        for prefix in public_prefixes:
            if path.startswith(prefix):
                return True
        
        return False
    
    async def _authenticate_request(self, request: Request) -> Dict[str, Any]:
        """リクエスト認証"""
        path = request.url.path
        
        # JWT認証試行
        jwt_result = await self._authenticate_jwt(request)
        if jwt_result["authenticated"]:
            return jwt_result
        
        # APIキー認証試行
        api_key_result = await self._authenticate_api_key(request)
        if api_key_result["authenticated"]:
            return api_key_result
        
        # セッション認証試行
        session_result = await self._authenticate_session(request)
        if session_result["authenticated"]:
            return session_result
        
        # 認証失敗
        return {
            "authenticated": False,
            "user": None,
            "method": None,
            "error": "No valid authentication found"
        }
    
    async def _authenticate_jwt(self, request: Request) -> Dict[str, Any]:
        """JWT認証"""
        try:
            # Authorization ヘッダーから取得
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return {"authenticated": False, "error": "No Bearer token"}
            
            token = auth_header.split(" ")[1]
            
            # JWT デコード
            secret_key = getattr(self.config, 'jwt_secret_key', 'default-secret')
            payload = jwt.decode(token, secret_key, algorithms=["HS256"])
            
            # トークン有効性チェック
            if payload.get("exp", 0) < time.time():
                return {"authenticated": False, "error": "Token expired"}
            
            # ユーザー情報取得
            user_id = payload.get("user_id")
            if not user_id:
                return {"authenticated": False, "error": "Invalid token payload"}
            
            # キャッシュからユーザー情報取得
            user_info = await self._get_cached_user(user_id)
            if not user_info:
                user_info = {
                    "user_id": user_id,
                    "username": payload.get("username", user_id),
                    "roles": payload.get("roles", ["user"]),
                    "permissions": payload.get("permissions", [])
                }
                await self._cache_user(user_id, user_info)
            
            return {
                "authenticated": True,
                "user": user_info,
                "method": "jwt",
                "token_payload": payload
            }
            
        except jwt.ExpiredSignatureError:
            return {"authenticated": False, "error": "Token expired"}
        except jwt.InvalidTokenError:
            return {"authenticated": False, "error": "Invalid token"}
        except Exception as e:
            logger.error(f"JWT認証エラー: {e}")
            return {"authenticated": False, "error": str(e)}
    
    async def _authenticate_api_key(self, request: Request) -> Dict[str, Any]:
        """APIキー認証"""
        try:
            # ヘッダーから APIキー取得
            api_key = request.headers.get("X-API-Key")
            if not api_key:
                return {"authenticated": False, "error": "No API key"}
            
            # APIキー検証
            if not await self._validate_api_key(api_key):
                return {"authenticated": False, "error": "Invalid API key"}
            
            # APIキー情報取得
            api_key_info = await self._get_api_key_info(api_key)
            
            return {
                "authenticated": True,
                "user": {
                    "user_id": api_key_info.get("user_id", "api_user"),
                    "username": api_key_info.get("name", "API User"),
                    "roles": ["api_user"],
                    "permissions": api_key_info.get("permissions", ["api_access"])
                },
                "method": "api_key",
                "api_key_info": api_key_info
            }
            
        except Exception as e:
            logger.error(f"APIキー認証エラー: {e}")
            return {"authenticated": False, "error": str(e)}
    
    async def _authenticate_session(self, request: Request) -> Dict[str, Any]:
        """セッション認証"""
        try:
            # セッションID取得
            session_id = request.headers.get("X-Session-ID")
            if not session_id:
                session_id = request.cookies.get("session_id")
            
            if not session_id:
                return {"authenticated": False, "error": "No session ID"}
            
            # セッション検証
            session_info = await self._validate_session(session_id)
            if not session_info:
                return {"authenticated": False, "error": "Invalid session"}
            
            return {
                "authenticated": True,
                "user": session_info["user"],
                "method": "session",
                "session_info": session_info
            }
            
        except Exception as e:
            logger.error(f"セッション認証エラー: {e}")
            return {"authenticated": False, "error": str(e)}
    
    async def _validate_api_key(self, api_key: str) -> bool:
        """APIキー検証"""
        try:
            # ハッシュ化されたキーと比較
            api_keys = getattr(self.config, 'api_keys', {})
            
            for key_name, key_hash in api_keys.items():
                if self._hash_api_key(api_key) == key_hash:
                    return True
            
            # 開発環境用のデフォルトキー
            if getattr(self.config, 'environment', 'production') == 'development':
                if api_key == "dev-api-key-12345":
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"APIキー検証エラー: {e}")
            return False
    
    async def _get_api_key_info(self, api_key: str) -> Dict[str, Any]:
        """APIキー情報取得"""
        try:
            # キャッシュから取得
            cache_manager = await get_cache_manager()
            cache_key = f"api_key:{self._hash_api_key(api_key)}"
            
            cached_info = await cache_manager.get(cache_key, CacheNamespace.USER_PREFERENCE)
            if cached_info:
                return cached_info
            
            # デフォルト情報
            info = {
                "user_id": "api_user",
                "name": "API User",
                "permissions": ["api_access", "read", "write"],
                "rate_limit": 1000,  # 1時間あたり
                "created_at": time.time()
            }
            
            # キャッシュに保存
            await cache_manager.set(cache_key, info, CacheNamespace.USER_PREFERENCE, ttl=3600)
            
            return info
            
        except Exception as e:
            logger.error(f"APIキー情報取得エラー: {e}")
            return {}
    
    async def _validate_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """セッション検証"""
        try:
            # セッションストアから検証
            from ...storage.session_store import get_session_store
            session_store = await get_session_store()
            
            session_data = await session_store.get_session(session_id)
            if not session_data:
                return None
            
            # セッション有効性チェック
            if session_data.get("status") != "active":
                return None
            
            return {
                "session_id": session_id,
                "user": {
                    "user_id": session_data.get("user_id"),
                    "username": session_data.get("user_id", "user"),
                    "roles": ["user"],
                    "permissions": ["session_access"]
                },
                "session_data": session_data
            }
            
        except Exception as e:
            logger.error(f"セッション検証エラー: {e}")
            return None
    
    async def _get_cached_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """キャッシュからユーザー情報取得"""
        try:
            cache_manager = await get_cache_manager()
            cache_key = f"user:{user_id}"
            return await cache_manager.get(cache_key, CacheNamespace.USER_PREFERENCE)
        except Exception:
            return None
    
    async def _cache_user(self, user_id: str, user_info: Dict[str, Any]):
        """ユーザー情報キャッシュ"""
        try:
            cache_manager = await get_cache_manager()
            cache_key = f"user:{user_id}"
            await cache_manager.set(cache_key, user_info, CacheNamespace.USER_PREFERENCE, ttl=1800)
        except Exception as e:
            logger.warning(f"ユーザー情報キャッシュエラー: {e}")
    
    async def _authorize_request(self, request: Request, user: Dict[str, Any]) -> bool:
        """認可チェック"""
        try:
            path = request.url.path
            method = request.method
            
            # 管理者は全アクセス許可
            if "admin" in user.get("roles", []):
                return True
            
            # API ユーザーは API エンドポイントのみ
            if "api_user" in user.get("roles", []):
                return path.startswith("/api/")
            
            # 通常ユーザーの権限チェック
            permissions = user.get("permissions", [])
            
            # 読み取り専用ユーザー
            if method in ["GET", "HEAD", "OPTIONS"] and "read" in permissions:
                return True
            
            # 書き込み権限
            if method in ["POST", "PUT", "PATCH", "DELETE"] and "write" in permissions:
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"認可チェックエラー: {e}")
            return False
    
    async def _add_security_headers(self, response: Response):
        """セキュリティヘッダー追加"""
        try:
            # セキュリティヘッダー
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
            
            # HTTPS 強制（本番環境）
            if getattr(self.config, 'environment', 'production') == 'production':
                response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            
        except Exception as e:
            logger.warning(f"セキュリティヘッダー追加エラー: {e}")
    
    async def _record_auth_metrics(self, request: Request, auth_result: Dict[str, Any], response_time: float):
        """認証メトリクス記録"""
        try:
            if hasattr(request.app.state, 'metrics_manager'):
                await request.app.state.metrics_manager.record_auth_event(
                    method=auth_result.get("method", "unknown"),
                    success=auth_result.get("authenticated", False),
                    user_id=auth_result.get("user", {}).get("user_id"),
                    response_time=response_time,
                    endpoint=request.url.path
                )
        except Exception as e:
            logger.warning(f"認証メトリクス記録エラー: {e}")
    
    def _hash_api_key(self, api_key: str) -> str:
        """APIキーハッシュ化"""
        return hashlib.sha256(api_key.encode()).hexdigest()


# ============================================================================
# 認証ユーティリティ関数
# ============================================================================

def generate_api_key() -> str:
    """APIキー生成"""
    return secrets.token_urlsafe(32)


def create_jwt_token(
    user_id: str,
    username: str,
    roles: List[str] = None,
    permissions: List[str] = None,
    expires_in: int = 3600
) -> str:
    """JWTトークン作成"""
    try:
        config = get_config()
        secret_key = getattr(config, 'jwt_secret_key', 'default-secret')
        
        payload = {
            "user_id": user_id,
            "username": username,
            "roles": roles or ["user"],
            "permissions": permissions or ["read"],
            "iat": int(time.time()),
            "exp": int(time.time()) + expires_in
        }
        
        return jwt.encode(payload, secret_key, algorithm="HS256")
        
    except Exception as e:
        logger.error(f"JWTトークン作成エラー: {e}")
        raise


def verify_jwt_token(token: str) -> Dict[str, Any]:
    """JWTトークン検証"""
    try:
        config = get_config()
        secret_key = getattr(config, 'jwt_secret_key', 'default-secret')
        
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        return payload
        
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("トークンが期限切れです")
    except jwt.InvalidTokenError:
        raise AuthenticationError("無効なトークンです")


async def get_current_user(request: Request) -> Dict[str, Any]:
    """現在のユーザー取得"""
    if hasattr(request.state, 'user'):
        return request.state.user
    
    raise AuthenticationError("認証されていません")


def require_permissions(required_permissions: List[str]):
    """権限要求デコレータ"""
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            user = await get_current_user(request)
            user_permissions = user.get("permissions", [])
            
            for permission in required_permissions:
                if permission not in user_permissions:
                    raise AuthorizationError(f"権限が不足しています: {permission}")
            
            return await func(request, *args, **kwargs)
        
        return wrapper
    return decorator
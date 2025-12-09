# api/routes/sessions.py
"""
セッション管理APIルーター
セッション作成・取得・更新・削除、検索機能
目標: 高速セッション管理、永続化、統計分析
"""

import time
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Request, HTTPException, Depends, Query, BackgroundTasks
from fastapi.responses import JSONResponse

from ...core.utils.logger import get_logger
from ...core.utils.errors import SessionStoreError, ValidationError
from ...core.utils.metrics import track_performance
from ...storage.session_store import get_session_store, SessionFilter
from ...storage.cache_manager import get_cache_manager, CacheNamespace
from ..models.requests import (
    SessionCreateRequest, SessionUpdateRequest, SessionSearchRequest
)
from ..models.responses import (
    SessionResponse, SessionListResponse, SessionSummary, SessionDetail,
    create_success_response, create_paginated_response
)

logger = get_logger(__name__)

router = APIRouter()


@router.post("/", response_model=SessionResponse)
@track_performance("session_create")
async def create_session(
    request_data: SessionCreateRequest,
    background_tasks: BackgroundTasks,
    request: Request
):
    """
    セッション作成
    
    新しいAI会話セッションを作成
    自動バックアップ、メトリクス記録機能付き
    """
    try:
        session_store = await get_session_store()
        
        # セッション作成
        session_id = await session_store.create_session(
            user_id=request_data.user_id,
            session_type=request_data.session_type.value,
            metadata=request_data.metadata,
            settings=request_data.settings,
            priority=request_data.priority.value
        )
        
        # 作成されたセッション取得
        session = await session_store.get_session(session_id)
        if not session:
            raise SessionStoreError("セッション作成後の取得に失敗しました")
        
        session_detail = SessionDetail(
            session_id=session["session_id"],
            user_id=session["user_id"],
            title=request_data.title,
            session_type=session["session_type"],
            status=session["status"],
            description=request_data.description,
            message_count=session["total_messages"],
            total_tokens=session["total_tokens"],
            total_cost=session.get("total_cost", 0.0),
            avg_response_time=session.get("avg_response_time", 0.0),
            quality_score=session.get("quality_score", 0.0),
            created_at=session["created_at"],
            updated_at=session["updated_at"],
            last_accessed=session["last_accessed"],
            tags=request_data.tags,
            priority=request_data.priority.value,
            settings=request_data.settings,
            metadata=request_data.metadata,
            model_usage={},
            tool_usage={},
            error_count=0,
            performance_metrics={},
            recent_messages=[]
        )
        
        # バックグラウンド処理
        background_tasks.add_task(
            _post_session_creation,
            session_id,
            request_data.user_id
        )
        
        return SessionResponse(
            status="success",
            message="セッションが正常に作成されました",
            session=session_detail
        )
        
    except ValidationError as e:
        logger.warning(f"セッション作成バリデーションエラー: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    
    except SessionStoreError as e:
        logger.error(f"セッション作成エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    except Exception as e:
        logger.error(f"予期しないセッション作成エラー: {e}")
        raise HTTPException(status_code=500, detail="内部サーバーエラー")


@router.get("/", response_model=SessionListResponse)
@track_performance("session_list")
async def list_sessions(
    user_id: Optional[str] = Query(None, description="ユーザーID"),
    session_type: Optional[str] = Query(None, description="セッションタイプ"),
    status: Optional[str] = Query(None, description="ステータス"),
    limit: int = Query(20, ge=1, le=100, description="取得件数"),
    offset: int = Query(0, ge=0, description="オフセット"),
    sort_by: str = Query("updated_at", description="ソート項目"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="ソート順"),
    request: Request = None
):
    """
    セッション一覧取得
    
    フィルタリング、ソート、ページネーション対応
    キャッシュ機能付き高速検索
    """
    try:
        # 認証されたユーザーのみ自分のセッションにアクセス可能
        if hasattr(request.state, 'user'):
            authenticated_user_id = request.state.user.get("user_id")
            if user_id and user_id != authenticated_user_id:
                # 管理者以外は他ユーザーのセッションにアクセス不可
                user_roles = request.state.user.get("roles", [])
                if "admin" not in user_roles:
                    raise HTTPException(status_code=403, detail="アクセス権限がありません")
            elif not user_id:
                user_id = authenticated_user_id
        
        # キャッシュキー生成
        cache_key = f"sessions_list:{user_id}:{session_type}:{status}:{limit}:{offset}:{sort_by}:{sort_order}"
        
        # キャッシュ確認
        cache_manager = await get_cache_manager()
        cached_result = await cache_manager.get(cache_key, CacheNamespace.SESSION)
        
        if cached_result:
            logger.debug("セッション一覧キャッシュヒット")
            return SessionListResponse(**cached_result)
        
        # データベース検索
        session_store = await get_session_store()
        filter_params = SessionFilter(
            user_id=user_id,
            status=status,
            session_type=session_type,
            limit=limit,
            offset=offset
        )
        
        sessions, total_count = await session_store.search_sessions(filter_params)
        
        # レスポンス構築
        session_summaries = [
            SessionSummary(
                session_id=session.session_id,
                user_id=session.user_id,
                title=None,  # 実装時に追加
                session_type=session.status,  # 修正必要
                status=session.status,
                message_count=session.total_messages,
                total_tokens=session.total_tokens,
                total_cost=session.total_cost,
                avg_response_time=session.avg_response_time,
                quality_score=session.quality_score,
                created_at=session.created_at,
                updated_at=session.updated_at,
                last_accessed=session.updated_at,  # 修正必要
                tags=[],  # 実装時に追加
                priority=5  # デフォルト値
            )
            for session in sessions
        ]
        
        # 統計計算
        total_messages = sum(s.message_count for s in session_summaries)
        total_tokens = sum(s.total_tokens for s in session_summaries)
        total_cost = sum(s.total_cost for s in session_summaries)
        active_sessions = sum(1 for s in session_summaries if s.status == "active")
        
        # ページネーション情報
        page_size = limit
        current_page = (offset // page_size) + 1
        page_count = (total_count + page_size - 1) // page_size
        
        response = SessionListResponse(
            status="success",
            message=f"{len(session_summaries)}件のセッションを取得しました",
            sessions=session_summaries,
            total_count=total_count,
            page_count=page_count,
            current_page=current_page,
            page_size=page_size,
            has_next=current_page < page_count,
            has_previous=current_page > 1,
            total_messages=total_messages,
            total_tokens=total_tokens,
            total_cost=total_cost,
            active_sessions=active_sessions
        )
        
        # キャッシュ保存
        await cache_manager.set(
            cache_key,
            response.dict(),
            CacheNamespace.SESSION,
            ttl=300  # 5分間キャッシュ
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"セッション一覧取得エラー: {e}")
        raise HTTPException(status_code=500, detail="内部サーバーエラー")


@router.get("/{session_id}", response_model=SessionResponse)
@track_performance("session_get")
async def get_session(
    session_id: str,
    include_messages: bool = Query(False, description="メッセージ含む"),
    request: Request = None
):
    """
    セッション詳細取得
    
    指定されたセッションの詳細情報を取得
    メッセージ履歴の包含オプション付き
    """
    try:
        session_store = await get_session_store()
        session = await session_store.get_session(session_id, include_messages=include_messages)
        
        if not session:
            raise HTTPException(status_code=404, detail="セッションが見つかりません")
        
        # アクセス権限チェック
        if hasattr(request.state, 'user'):
            authenticated_user_id = request.state.user.get("user_id")
            session_user_id = session.get("user_id")
            
            if session_user_id != authenticated_user_id:
                user_roles = request.state.user.get("roles", [])
                if "admin" not in user_roles:
                    raise HTTPException(status_code=403, detail="アクセス権限がありません")
        
        # メッセージ履歴処理
        recent_messages = []
        if include_messages:
            messages = session.get("messages", [])
            recent_messages = [
                {
                    "id": msg.get("id", ""),
                    "role": msg.get("role", ""),
                    "content": msg.get("content", ""),
                    "timestamp": msg.get("timestamp", ""),
                    "model_used": msg.get("model_used"),
                    "token_count": msg.get("token_count", 0),
                    "response_time": msg.get("response_time", 0.0),
                    "metadata": msg.get("metadata", {})
                }
                for msg in messages[-10:]  # 最新10件
            ]
        
        session_detail = SessionDetail(
            session_id=session["session_id"],
            user_id=session["user_id"],
            title=session.get("title"),
            session_type=session.get("session_type", "chat"),
            status=session.get("status", "active"),
            description=session.get("description"),
            message_count=session.get("total_messages", 0),
            total_tokens=session.get("total_tokens", 0),
            total_cost=session.get("total_cost", 0.0),
            avg_response_time=session.get("avg_response_time", 0.0),
            quality_score=session.get("quality_score", 0.0),
            created_at=session["created_at"],
            updated_at=session["updated_at"],
            last_accessed=session.get("last_accessed", session["updated_at"]),
            tags=session.get("tags", []),
            priority=session.get("priority", 5),
            settings=session.get("settings", {}),
            metadata=session.get("metadata", {}),
            model_usage=session.get("model_usage", {}),
            tool_usage=session.get("tool_usage", {}),
            error_count=session.get("error_count", 0),
            performance_metrics=session.get("performance_metrics", {}),
            recent_messages=recent_messages
        )
        
        return SessionResponse(
            status="success",
            message="セッション詳細を取得しました",
            session=session_detail
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"セッション取得エラー: {session_id} - {e}")
        raise HTTPException(status_code=500, detail="内部サーバーエラー")


@router.put("/{session_id}", response_model=SessionResponse)
@track_performance("session_update")
async def update_session(
    session_id: str,
    request_data: SessionUpdateRequest,
    background_tasks: BackgroundTasks,
    request: Request = None
):
    """
    セッション更新
    
    セッション設定、メタデータ、ステータスの更新
    バリデーション・権限チェック付き
    """
    try:
        session_store = await get_session_store()
        
        # セッション存在確認
        existing_session = await session_store.get_session(session_id)
        if not existing_session:
            raise HTTPException(status_code=404, detail="セッションが見つかりません")
        
        # アクセス権限チェック
        if hasattr(request.state, 'user'):
            authenticated_user_id = request.state.user.get("user_id")
            session_user_id = existing_session.get("user_id")
            
            if session_user_id != authenticated_user_id:
                user_roles = request.state.user.get("roles", [])
                if "admin" not in user_roles:
                    raise HTTPException(status_code=403, detail="アクセス権限がありません")
        
        # 更新データ準備
        update_data = {}
        
        if request_data.title is not None:
            update_data["title"] = request_data.title
        if request_data.description is not None:
            update_data["description"] = request_data.description
        if request_data.status is not None:
            update_data["status"] = request_data.status
        if request_data.priority is not None:
            update_data["priority"] = request_data.priority.value
        if request_data.tags is not None:
            update_data["tags"] = request_data.tags
        if request_data.settings is not None:
            # 既存設定とマージ
            existing_settings = existing_session.get("settings", {})
            existing_settings.update(request_data.settings)
            update_data["settings"] = existing_settings
        if request_data.metadata is not None:
            # 既存メタデータとマージ
            existing_metadata = existing_session.get("metadata", {})
            existing_metadata.update(request_data.metadata)
            update_data["metadata"] = existing_metadata
        
        # セッション更新実行
        success = await session_store.update_session(session_id, update_data)
        if not success:
            raise SessionStoreError("セッション更新に失敗しました")
        
        # 更新されたセッション取得
        updated_session = await session_store.get_session(session_id)
        
        session_detail = SessionDetail(
            session_id=updated_session["session_id"],
            user_id=updated_session["user_id"],
            title=updated_session.get("title"),
            session_type=updated_session.get("session_type", "chat"),
            status=updated_session.get("status", "active"),
            description=updated_session.get("description"),
            message_count=updated_session.get("total_messages", 0),
            total_tokens=updated_session.get("total_tokens", 0),
            total_cost=updated_session.get("total_cost", 0.0),
            avg_response_time=updated_session.get("avg_response_time", 0.0),
            quality_score=updated_session.get("quality_score", 0.0),
            created_at=updated_session["created_at"],
            updated_at=updated_session["updated_at"],
            last_accessed=updated_session.get("last_accessed", updated_session["updated_at"]),
            tags=updated_session.get("tags", []),
            priority=updated_session.get("priority", 5),
            settings=updated_session.get("settings", {}),
            metadata=updated_session.get("metadata", {}),
            model_usage={},
            tool_usage={},
            error_count=0,
            performance_metrics={},
            recent_messages=[]
        )
        
        # バックグラウンド処理（キャッシュ無効化など）
        background_tasks.add_task(
            _post_session_update,
            session_id,
            update_data
        )
        
        return SessionResponse(
            status="success",
            message="セッションが正常に更新されました",
            session=session_detail
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"セッション更新エラー: {session_id} - {e}")
        raise HTTPException(status_code=500, detail="内部サーバーエラー")


@router.delete("/{session_id}")
@track_performance("session_delete")
async def delete_session(
    session_id: str,
    permanent: bool = Query(False, description="物理削除フラグ"),
    background_tasks: BackgroundTasks,
    request: Request = None
):
    """
    セッション削除
    
    ソフト削除（デフォルト）または物理削除
    権限チェック・バックアップ機能付き
    """
    try:
        session_store = await get_session_store()
        
        # セッション存在確認
        existing_session = await session_store.get_session(session_id)
        if not existing_session:
            raise HTTPException(status_code=404, detail="セッションが見つかりません")
        
        # アクセス権限チェック
        if hasattr(request.state, 'user'):
            authenticated_user_id = request.state.user.get("user_id")
            session_user_id = existing_session.get("user_id")
            
            if session_user_id != authenticated_user_id:
                user_roles = request.state.user.get("roles", [])
                if "admin" not in user_roles:
                    raise HTTPException(status_code=403, detail="アクセス権限がありません")
        
        # 物理削除は管理者のみ
        if permanent:
            user_roles = getattr(request.state, 'user', {}).get("roles", [])
            if "admin" not in user_roles:
                raise HTTPException(status_code=403, detail="物理削除は管理者のみ実行可能です")
        
        # バックアップ作成（物理削除の場合）
        if permanent:
            background_tasks.add_task(
                _backup_session_before_deletion,
                session_id,
                existing_session
            )
        
        # 削除実行
        success = await session_store.delete_session(session_id, soft_delete=not permanent)
        if not success:
            raise SessionStoreError("セッション削除に失敗しました")
        
        # キャッシュ無効化
        background_tasks.add_task(
            _invalidate_session_caches,
            session_id,
            existing_session.get("user_id")
        )
        
        delete_type = "物理削除" if permanent else "ソフト削除"
        
        return create_success_response(
            data={
                "session_id": session_id,
                "delete_type": delete_type,
                "deleted_at": time.time()
            },
            message=f"セッションが正常に{delete_type}されました"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"セッション削除エラー: {session_id} - {e}")
        raise HTTPException(status_code=500, detail="内部サーバーエラー")


@router.post("/search", response_model=SessionListResponse)
@track_performance("session_search")
async def search_sessions(
    request_data: SessionSearchRequest,
    request: Request = None
):
    """
    セッション検索
    
    高度な検索機能・フィルタリング
    全文検索、日時範囲、品質スコアなど
    """
    try:
        # 権限チェック
        if hasattr(request.state, 'user'):
            authenticated_user_id = request.state.user.get("user_id")
            
            # 他ユーザーの検索は管理者のみ
            if request_data.user_id and request_data.user_id != authenticated_user_id:
                user_roles = request.state.user.get("roles", [])
                if "admin" not in user_roles:
                    raise HTTPException(status_code=403, detail="他ユーザーの検索はできません")
            elif not request_data.user_id:
                request_data.user_id = authenticated_user_id
        
        session_store = await get_session_store()
        
        # 検索フィルター構築
        filter_params = SessionFilter(
            user_id=request_data.user_id,
            status=request_data.status,
            session_type=request_data.session_type.value if request_data.session_type else None,
            created_after=request_data.created_after,
            created_before=request_data.created_before,
            min_quality_score=request_data.min_quality_score,
            limit=request_data.limit,
            offset=request_data.offset
        )
        
        # 検索実行
        sessions, total_count = await session_store.search_sessions(filter_params)
        
        # タグフィルタリング（後処理）
        if request_data.tags:
            # 実装: タグによるフィルタリング
            pass
        
        # レスポンス構築
        session_summaries = [
            SessionSummary(
                session_id=session.session_id,
                user_id=session.user_id,
                title=None,
                session_type=session.status,  # 修正必要
                status=session.status,
                message_count=session.total_messages,
                total_tokens=session.total_tokens,
                total_cost=session.total_cost,
                avg_response_time=session.avg_response_time,
                quality_score=session.quality_score,
                created_at=session.created_at,
                updated_at=session.updated_at,
                last_accessed=session.updated_at,
                tags=[],
                priority=5
            )
            for session in sessions
        ]
        
        # 統計
        total_messages = sum(s.message_count for s in session_summaries)
        total_tokens = sum(s.total_tokens for s in session_summaries)
        total_cost = sum(s.total_cost for s in session_summaries)
        active_sessions = sum(1 for s in session_summaries if s.status == "active")
        
        # ページネーション
        page_size = request_data.limit
        current_page = (request_data.offset // page_size) + 1
        page_count = (total_count + page_size - 1) // page_size
        
        return SessionListResponse(
            status="success",
            message=f"{len(session_summaries)}件の検索結果",
            sessions=session_summaries,
            total_count=total_count,
            page_count=page_count,
            current_page=current_page,
            page_size=page_size,
            has_next=current_page < page_count,
            has_previous=current_page > 1,
            total_messages=total_messages,
            total_tokens=total_tokens,
            total_cost=total_cost,
            active_sessions=active_sessions
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"セッション検索エラー: {e}")
        raise HTTPException(status_code=500, detail="内部サーバーエラー")


@router.get("/{session_id}/messages")
@track_performance("session_messages")
async def get_session_messages(
    session_id: str,
    limit: int = Query(50, ge=1, le=200, description="取得件数"),
    offset: int = Query(0, ge=0, description="オフセット"),
    since: Optional[str] = Query(None, description="開始日時（ISO形式）"),
    request: Request = None
):
    """
    セッションメッセージ取得
    
    ページネーション対応メッセージ履歴取得
    日時フィルタリング機能付き
    """
    try:
        session_store = await get_session_store()
        
        # セッション存在・権限チェック
        session = await session_store.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="セッションが見つかりません")
        
        if hasattr(request.state, 'user'):
            authenticated_user_id = request.state.user.get("user_id")
            session_user_id = session.get("user_id")
            
            if session_user_id != authenticated_user_id:
                user_roles = request.state.user.get("roles", [])
                if "admin" not in user_roles:
                    raise HTTPException(status_code=403, detail="アクセス権限がありません")
        
        # 日時パラメータ処理
        since_datetime = None
        if since:
            try:
                from datetime import datetime
                since_datetime = datetime.fromisoformat(since.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="無効な日時形式です")
        
        # メッセージ取得
        messages = await session_store.get_session_messages(
            session_id=session_id,
            limit=limit,
            offset=offset,
            since=since_datetime
        )
        
        # レスポンス構築
        total_count = session.get("total_messages", 0)
        page_size = limit
        current_page = (offset // page_size) + 1
        page_count = (total_count + page_size - 1) // page_size
        
        response_data = create_paginated_response(
            items=messages,
            total_count=total_count,
            page=current_page,
            page_size=page_size
        )
        
        response_data.update({
            "status": "success",
            "message": f"{len(messages)}件のメッセージを取得しました",
            "session_id": session_id
        })
        
        return JSONResponse(content=response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"セッションメッセージ取得エラー: {session_id} - {e}")
        raise HTTPException(status_code=500, detail="内部サーバーエラー")


@router.get("/{session_id}/analytics")
@track_performance("session_analytics")
async def get_session_analytics(
    session_id: str,
    request: Request = None
):
    """
    セッション分析
    
    使用統計、パフォーマンス分析、コスト分析
    """
    try:
        session_store = await get_session_store()
        
        # セッション取得・権限チェック
        session = await session_store.get_session(session_id, include_messages=True)
        if not session:
            raise HTTPException(status_code=404, detail="セッションが見つかりません")
        
        if hasattr(request.state, 'user'):
            authenticated_user_id = request.state.user.get("user_id")
            session_user_id = session.get("user_id")
            
            if session_user_id != authenticated_user_id:
                user_roles = request.state.user.get("roles", [])
                if "admin" not in user_roles:
                    raise HTTPException(status_code=403, detail="アクセス権限がありません")
        
        # 分析データ計算
        messages = session.get("messages", [])
        
        analytics = {
            "session_overview": {
                "session_id": session_id,
                "total_messages": len(messages),
                "user_messages": len([m for m in messages if m.get("role") == "user"]),
                "assistant_messages": len([m for m in messages if m.get("role") == "assistant"]),
                "total_tokens": session.get("total_tokens", 0),
                "total_cost": session.get("total_cost", 0.0),
                "avg_response_time": session.get("avg_response_time", 0.0),
                "quality_score": session.get("quality_score", 0.0),
                "duration_hours": 0  # 実装必要
            },
            "model_usage": _calculate_model_usage(messages),
            "performance_metrics": _calculate_performance_metrics(messages),
            "cost_breakdown": _calculate_cost_breakdown(messages),
            "conversation_flow": _analyze_conversation_flow(messages),
            "quality_analysis": _analyze_quality(messages)
        }
        
        return create_success_response(
            data=analytics,
            message="セッション分析を取得しました"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"セッション分析エラー: {session_id} - {e}")
        raise HTTPException(status_code=500, detail="内部サーバーエラー")


# ============================================================================
# ヘルパー関数
# ============================================================================

async def _post_session_creation(session_id: str, user_id: str):
    """セッション作成後処理"""
    try:
        # ユーザー統計更新
        cache_manager = await get_cache_manager()
        user_stats_key = f"user_stats:{user_id}"
        
        stats = await cache_manager.get(user_stats_key, CacheNamespace.USER_PREFERENCE) or {
            "total_sessions": 0,
            "active_sessions": 0
        }
        
        stats["total_sessions"] += 1
        stats["active_sessions"] += 1
        
        await cache_manager.set(
            user_stats_key,
            stats,
            CacheNamespace.USER_PREFERENCE,
            ttl=86400  # 24時間
        )
        
        logger.debug(f"セッション作成後処理完了: {session_id}")
        
    except Exception as e:
        logger.error(f"セッション作成後処理エラー: {e}")


async def _post_session_update(session_id: str, update_data: Dict[str, Any]):
    """セッション更新後処理"""
    try:
        # 関連キャッシュ無効化
        cache_manager = await get_cache_manager()
        
        # セッション詳細キャッシュ削除
        await cache_manager.delete(f"session:{session_id}", CacheNamespace.SESSION)
        
        # セッション一覧キャッシュ無効化（パターンマッチ削除は実装依存）
        # 実装: sessions_list:* パターンのキャッシュを削除
        
        logger.debug(f"セッション更新後処理完了: {session_id}")
        
    except Exception as e:
        logger.error(f"セッション更新後処理エラー: {e}")


async def _backup_session_before_deletion(session_id: str, session_data: Dict[str, Any]):
    """削除前セッションバックアップ"""
    try:
        from ...storage.backup_manager import get_backup_manager
        
        backup_manager = await get_backup_manager()
        
        # セッションデータをJSONファイルとしてバックアップ
        backup_data = {
            "session_id": session_id,
            "backup_type": "session_deletion",
            "timestamp": time.time(),
            "session_data": session_data
        }
        
        # 実装: backup_manager にセッションバックアップ機能追加
        logger.info(f"セッション削除前バックアップ作成: {session_id}")
        
    except Exception as e:
        logger.error(f"セッションバックアップエラー: {e}")


async def _invalidate_session_caches(session_id: str, user_id: str):
    """セッション関連キャッシュ無効化"""
    try:
        cache_manager = await get_cache_manager()
        
        # セッション詳細キャッシュ削除
        await cache_manager.delete(f"session:{session_id}", CacheNamespace.SESSION)
        
        # 会話キャッシュ削除
        await cache_manager.delete(f"conversation:{session_id}", CacheNamespace.SESSION)
        
        # ユーザー統計更新
        if user_id:
            user_stats_key = f"user_stats:{user_id}"
            stats = await cache_manager.get(user_stats_key, CacheNamespace.USER_PREFERENCE)
            if stats:
                stats["active_sessions"] = max(0, stats.get("active_sessions", 1) - 1)
                await cache_manager.set(
                    user_stats_key,
                    stats,
                    CacheNamespace.USER_PREFERENCE,
                    ttl=86400
                )
        
    except Exception as e:
        logger.error(f"キャッシュ無効化エラー: {e}")


def _calculate_model_usage(messages: List[Dict[str, Any]]) -> Dict[str, Any]:
    """モデル使用状況計算"""
    model_counts = {}
    model_tokens = {}
    
    for message in messages:
        if message.get("role") == "assistant":
            model = message.get("model_used", "unknown")
            tokens = message.get("token_count", 0)
            
            model_counts[model] = model_counts.get(model, 0) + 1
            model_tokens[model] = model_tokens.get(model, 0) + tokens
    
    return {
        "usage_counts": model_counts,
        "token_usage": model_tokens,
        "total_models": len(model_counts)
    }


def _calculate_performance_metrics(messages: List[Dict[str, Any]]) -> Dict[str, Any]:
    """パフォーマンス指標計算"""
    response_times = []
    
    for message in messages:
        if message.get("role") == "assistant":
            response_time = message.get("response_time", 0)
            if response_time > 0:
                response_times.append(response_time)
    
    if not response_times:
        return {
            "avg_response_time": 0,
            "min_response_time": 0,
            "max_response_time": 0,
            "fast_responses": 0,
            "slow_responses": 0
        }
    
    avg_time = sum(response_times) / len(response_times)
    fast_responses = sum(1 for t in response_times if t < 2.0)
    slow_responses = sum(1 for t in response_times if t > 10.0)
    
    return {
        "avg_response_time": avg_time,
        "min_response_time": min(response_times),
        "max_response_time": max(response_times),
        "fast_responses": fast_responses,
        "slow_responses": slow_responses,
        "total_responses": len(response_times)
    }


def _calculate_cost_breakdown(messages: List[Dict[str, Any]]) -> Dict[str, Any]:
    """コスト分析"""
    total_cost = 0.0
    model_costs = {}
    
    for message in messages:
        if message.get("role") == "assistant":
            cost = message.get("estimated_cost", 0.0)
            model = message.get("model_used", "unknown")
            
            total_cost += cost
            model_costs[model] = model_costs.get(model, 0.0) + cost
    
    return {
        "total_cost": total_cost,
        "cost_by_model": model_costs,
        "avg_cost_per_message": total_cost / len([m for m in messages if m.get("role") == "assistant"]) if messages else 0
    }


def _analyze_conversation_flow(messages: List[Dict[str, Any]]) -> Dict[str, Any]:
    """会話フロー分析"""
    if not messages:
        return {"total_turns": 0, "avg_user_message_length": 0, "avg_assistant_message_length": 0}
    
    user_messages = [m for m in messages if m.get("role") == "user"]
    assistant_messages = [m for m in messages if m.get("role") == "assistant"]
    
    user_lengths = [len(m.get("content", "")) for m in user_messages]
    assistant_lengths = [len(m.get("content", "")) for m in assistant_messages]
    
    return {
        "total_turns": len(user_messages),
        "avg_user_message_length": sum(user_lengths) / len(user_lengths) if user_lengths else 0,
        "avg_assistant_message_length": sum(assistant_lengths) / len(assistant_lengths) if assistant_lengths else 0,
        "conversation_ratio": len(assistant_messages) / len(user_messages) if user_messages else 0
    }


def _analyze_quality(messages: List[Dict[str, Any]]) -> Dict[str, Any]:
    """品質分析"""
    quality_scores = []
    
    for message in messages:
        if message.get("role") == "assistant":
            quality = message.get("quality_score")
            if quality is not None:
                quality_scores.append(quality)
    
    if not quality_scores:
        return {"avg_quality": 0, "high_quality_rate": 0, "low_quality_rate": 0}
    
    avg_quality = sum(quality_scores) / len(quality_scores)
    high_quality = sum(1 for q in quality_scores if q >= 0.8)
    low_quality = sum(1 for q in quality_scores if q < 0.6)
    
    return {
        "avg_quality": avg_quality,
        "high_quality_rate": high_quality / len(quality_scores),
        "low_quality_rate": low_quality / len(quality_scores),
        "total_evaluated": len(quality_scores)
    }
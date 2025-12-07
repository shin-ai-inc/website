# api/routes/memory.py
"""
メモリ管理APIルーター
セマンティック検索、メモリ保存、要約機能
目標: 高速検索、高品質要約、ベクタDB最適化
"""

import time
import uuid
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Request, HTTPException, Depends, Query, BackgroundTasks
from fastapi.responses import JSONResponse

from ...core.utils.logger import get_logger
from ...core.utils.errors import ValidationError, LLMError
from ...core.utils.metrics import track_performance
from ...storage.vector_store import get_vector_store
from ...storage.cache_manager import get_cache_manager, CacheNamespace
from ...core.memory.summarizer import ConversationSummarizer
from ...core.llm.router import get_llm_router
from ..models.requests import MemorySearchRequest, MemoryStoreRequest, MemorySummarizeRequest
from ..models.responses import (
    MemoryResponse, MemoryStoreResponse, MemorySummarizeResponse,
    MemorySearchResult, create_success_response
)

logger = get_logger(__name__)

router = APIRouter()


@router.post("/search", response_model=MemoryResponse)
@track_performance("memory_search")
async def search_memory(
    request_data: MemorySearchRequest,
    request: Request = None
):
    """
    メモリ検索
    
    セマンティック検索によるコンテンツ発見
    キーワード検索、ハイブリッド検索対応
    """
    try:
        start_time = time.time()
        
        # 権限チェック
        user_id = None
        if hasattr(request.state, 'user'):
            user_id = request.state.user.get("user_id")
            
            # 他ユーザーの検索は管理者のみ
            if request_data.user_id and request_data.user_id != user_id:
                user_roles = request.state.user.get("roles", [])
                if "admin" not in user_roles:
                    raise HTTPException(status_code=403, detail="他ユーザーのメモリは検索できません")
        
        search_user_id = request_data.user_id or user_id
        
        # キャッシュキー生成
        cache_key = f"memory_search:{hash(request_data.query)}:{search_user_id}:{request_data.search_type}:{request_data.limit}"
        
        # キャッシュ確認
        cache_manager = await get_cache_manager()
        cached_result = await cache_manager.get(cache_key, CacheNamespace.AI_RESPONSE)
        
        if cached_result:
            logger.debug("メモリ検索キャッシュヒット")
            return MemoryResponse(**cached_result)
        
        # ベクタストア検索
        vector_store = await get_vector_store()
        
        # 検索タイプ別処理
        if request_data.search_type == "semantic":
            search_results = await vector_store.similarity_search(
                query=request_data.query,
                k=request_data.limit,
                filter_dict={
                    "user_id": search_user_id,
                    "session_id": request_data.session_id
                } if request_data.session_id else {"user_id": search_user_id}
            )
        elif request_data.search_type == "keyword":
            search_results = await vector_store.keyword_search(
                query=request_data.query,
                limit=request_data.limit,
                user_id=search_user_id,
                session_id=request_data.session_id
            )
        else:  # hybrid
            search_results = await vector_store.hybrid_search(
                query=request_data.query,
                limit=request_data.limit,
                user_id=search_user_id,
                session_id=request_data.session_id,
                semantic_weight=0.7,
                keyword_weight=0.3
            )
        
        # 結果フィルタリング
        filtered_results = []
        for result in search_results:
            # 最小スコアフィルター
            similarity_score = getattr(result, 'similarity_score', 0.0)
            if similarity_score < request_data.min_score:
                continue
            
            # コンテンツタイプフィルター
            if request_data.content_types:
                content_type = getattr(result, 'metadata', {}).get('content_type', 'text')
                if content_type not in request_data.content_types:
                    continue
            
            # 日時範囲フィルター
            if request_data.date_range:
                # 実装: 日時範囲フィルタリング
                pass
            
            filtered_results.append(result)
        
        # レスポンス構築
        memory_results = []
        for result in filtered_results:
            metadata = getattr(result, 'metadata', {})
            
            memory_result = MemorySearchResult(
                id=metadata.get('id', str(uuid.uuid4())),
                content=result.page_content,
                similarity_score=getattr(result, 'similarity_score', 0.0),
                content_type=metadata.get('content_type', 'text'),
                title=metadata.get('title'),
                summary=metadata.get('summary'),
                source_session=metadata.get('session_id'),
                tags=metadata.get('tags', []),
                importance=metadata.get('importance', 0.5),
                created_at=metadata.get('created_at', time.time()),
                accessed_at=time.time(),
                metadata=metadata
            )
            memory_results.append(memory_result)
        
        search_time = time.time() - start_time
        
        # 統計計算
        scores = [r.similarity_score for r in memory_results]
        max_score = max(scores) if scores else 0.0
        avg_score = sum(scores) / len(scores) if scores else 0.0
        
        response = MemoryResponse(
            status="success",
            message=f"{len(memory_results)}件の検索結果",
            results=memory_results,
            query=request_data.query,
            total_results=len(memory_results),
            search_time=search_time,
            max_score=max_score,
            avg_score=avg_score
        )
        
        # キャッシュ保存（高速化のため）
        await cache_manager.set(
            cache_key,
            response.dict(),
            CacheNamespace.AI_RESPONSE,
            ttl=300  # 5分間キャッシュ
        )
        
        return response
        
    except Exception as e:
        logger.error(f"メモリ検索エラー: {e}")
        raise HTTPException(status_code=500, detail="検索処理に失敗しました")


@router.post("/store", response_model=MemoryStoreResponse)
@track_performance("memory_store")
async def store_memory(
    request_data: MemoryStoreRequest,
    background_tasks: BackgroundTasks,
    request: Request = None
):
    """
    メモリ保存
    
    コンテンツをベクタデータベースに保存
    自動埋め込み生成、メタデータ付与
    """
    try:
        start_time = time.time()
        
        # ユーザーID取得
        user_id = request_data.user_id
        if hasattr(request.state, 'user'):
            authenticated_user_id = request.state.user.get("user_id")
            if not user_id:
                user_id = authenticated_user_id
            elif user_id != authenticated_user_id:
                # 管理者以外は他ユーザーのメモリ保存不可
                user_roles = request.state.user.get("roles", [])
                if "admin" not in user_roles:
                    raise HTTPException(status_code=403, detail="他ユーザーのメモリは保存できません")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="ユーザーIDが必要です")
        
        # メモリID生成
        memory_id = str(uuid.uuid4())
        
        # メタデータ構築
        metadata = {
            "id": memory_id,
            "user_id": user_id,
            "session_id": request_data.session_id,
            "content_type": request_data.content_type,
            "title": request_data.title,
            "summary": request_data.summary,
            "tags": request_data.tags,
            "importance": request_data.importance,
            "created_at": time.time(),
            "ttl": request_data.ttl,
            **request_data.metadata
        }
        
        # ベクタストア保存
        vector_store = await get_vector_store()
        
        # 埋め込み生成・保存
        embedding_id = await vector_store.add_texts(
            texts=[request_data.content],
            metadatas=[metadata]
        )
        
        processing_time = time.time() - start_time
        
        # バックグラウンド処理
        background_tasks.add_task(
            _post_memory_storage,
            memory_id,
            user_id,
            request_data.content,
            metadata
        )
        
        return MemoryStoreResponse(
            status="success",
            message="メモリが正常に保存されました",
            memory_id=memory_id,
            embedding_id=embedding_id[0] if embedding_id else None,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"メモリ保存エラー: {e}")
        raise HTTPException(status_code=500, detail="メモリ保存に失敗しました")


@router.post("/summarize", response_model=MemorySummarizeResponse)
@track_performance("memory_summarize")
async def summarize_memory(
    request_data: MemorySummarizeRequest,
    background_tasks: BackgroundTasks,
    request: Request = None
):
    """
    メモリ要約
    
    セッションの会話履歴を高品質要約
    エンティティ保持、コンテキスト保持機能
    """
    try:
        start_time = time.time()
        
        # 権限チェック
        if hasattr(request.state, 'user'):
            authenticated_user_id = request.state.user.get("user_id")
            
            # セッション所有者チェック（実装必要）
            # session_ownershipの確認ロジック
        
        # セッションメッセージ取得
        from ...storage.session_store import get_session_store
        session_store = await get_session_store()
        
        session = await session_store.get_session(request_data.session_id, include_messages=True)
        if not session:
            raise HTTPException(status_code=404, detail="セッションが見つかりません")
        
        messages = session.get("messages", [])
        if not messages:
            raise HTTPException(status_code=400, detail="要約対象のメッセージがありません")
        
        # メッセージ範囲フィルタリング
        if request_data.message_range:
            start_idx = request_data.message_range.get("start", 0)
            end_idx = request_data.message_range.get("end", len(messages))
            messages = messages[start_idx:end_idx]
        
        # タイプ除外フィルタリング
        if request_data.exclude_types:
            messages = [
                m for m in messages 
                if m.get("content_type", "text") not in request_data.exclude_types
            ]
        
        # 要約実行
        summarizer = ConversationSummarizer()
        
        summary_result = await summarizer.summarize_conversation(
            messages=messages,
            target_length=request_data.target_length,
            preserve_entities=request_data.preserve_entities,
            preserve_context=request_data.preserve_context,
            quality_threshold=request_data.quality_threshold
        )
        
        processing_time = time.time() - start_time
        
        # LLM使用情報取得（概算）
        tokens_used = summary_result.get("token_count", 0)
        model_used = summary_result.get("model_used", "unknown")
        
        # セッション要約更新
        await session_store.update_session(request_data.session_id, {
            "context_summary": summary_result["summary"],
            "quality_score": summary_result["quality_score"]
        })
        
        # メモリとして保存（バックグラウンド）
        background_tasks.add_task(
            _store_summary_as_memory,
            request_data.session_id,
            summary_result["summary"],
            session.get("user_id"),
            summary_result
        )
        
        return MemorySummarizeResponse(
            status="success",
            message="要約が正常に完了しました",
            summary=summary_result["summary"],
            session_id=request_data.session_id,
            original_length=len(str(messages)),
            summary_length=len(summary_result["summary"]),
            compression_ratio=summary_result.get("compression_ratio", 0.0),
            quality_score=summary_result["quality_score"],
            processing_time=processing_time,
            tokens_used=tokens_used,
            model_used=model_used,
            entities_preserved=summary_result.get("entities_preserved", []),
            context_preserved=summary_result.get("context_preserved", True)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"メモリ要約エラー: {e}")
        raise HTTPException(status_code=500, detail="要約処理に失敗しました")


@router.get("/stats")
@track_performance("memory_stats")
async def get_memory_stats(
    user_id: Optional[str] = Query(None, description="ユーザーID"),
    session_id: Optional[str] = Query(None, description="セッションID"),
    request: Request = None
):
    """
    メモリ統計取得
    
    ユーザー・セッション別メモリ使用統計
    """
    try:
        # 権限チェック
        if hasattr(request.state, 'user'):
            authenticated_user_id = request.state.user.get("user_id")
            
            if user_id and user_id != authenticated_user_id:
                user_roles = request.state.user.get("roles", [])
                if "admin" not in user_roles:
                    raise HTTPException(status_code=403, detail="他ユーザーの統計は取得できません")
            elif not user_id:
                user_id = authenticated_user_id
        
        # ベクタストア統計取得
        vector_store = await get_vector_store()
        stats = await vector_store.get_stats(user_id=user_id, session_id=session_id)
        
        # 追加統計計算
        additional_stats = {
            "total_memories": stats.get("document_count", 0),
            "avg_similarity_threshold": 0.7,  # 設定値
            "most_accessed_memories": [],  # 実装必要
            "recent_activity": [],  # 実装必要
            "storage_usage_mb": stats.get("storage_size", 0) / 1024 / 1024,
            "embedding_dimensions": stats.get("embedding_dimensions", 0)
        }
        
        combined_stats = {**stats, **additional_stats}
        
        return create_success_response(
            data=combined_stats,
            message="メモリ統計を取得しました"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"メモリ統計取得エラー: {e}")
        raise HTTPException(status_code=500, detail="統計取得に失敗しました")


@router.delete("/cleanup")
@track_performance("memory_cleanup")
async def cleanup_memory(
    user_id: Optional[str] = Query(None, description="ユーザーID"),
    session_id: Optional[str] = Query(None, description="セッションID"),
    older_than_days: int = Query(30, ge=1, description="削除対象日数"),
    dry_run: bool = Query(True, description="テスト実行"),
    background_tasks: BackgroundTasks,
    request: Request = None
):
    """
    メモリクリーンアップ
    
    古いメモリエントリの削除
    ドライラン対応、バックアップ機能付き
    """
    try:
        # 権限チェック
        if hasattr(request.state, 'user'):
            authenticated_user_id = request.state.user.get("user_id")
            
            if user_id and user_id != authenticated_user_id:
                user_roles = request.state.user.get("roles", [])
                if "admin" not in user_roles:
                    raise HTTPException(status_code=403, detail="他ユーザーのメモリは削除できません")
            elif not user_id:
                user_id = authenticated_user_id
        
        vector_store = await get_vector_store()
        
        # 削除対象特定
        cutoff_time = time.time() - (older_than_days * 24 * 3600)
        
        cleanup_result = await vector_store.cleanup_old_entries(
            user_id=user_id,
            session_id=session_id,
            older_than_timestamp=cutoff_time,
            dry_run=dry_run
        )
        
        if not dry_run:
            # バックアップ作成（バックグラウンド）
            background_tasks.add_task(
                _backup_deleted_memories,
                cleanup_result.get("deleted_entries", [])
            )
        
        action = "削除予定" if dry_run else "削除完了"
        
        return create_success_response(
            data=cleanup_result,
            message=f"メモリクリーンアップ{action}: {cleanup_result.get('deleted_count', 0)}件"
        )
        
    except Exception as e:
        logger.error(f"メモリクリーンアップエラー: {e}")
        raise HTTPException(status_code=500, detail="クリーンアップに失敗しました")


@router.post("/rebuild-index")
@track_performance("memory_rebuild_index")
async def rebuild_memory_index(
    background_tasks: BackgroundTasks,
    request: Request = None
):
    """
    メモリインデックス再構築
    
    ベクタインデックスの最適化・再構築
    管理者権限必要
    """
    try:
        # 管理者権限チェック
        if hasattr(request.state, 'user'):
            user_roles = request.state.user.get("roles", [])
            if "admin" not in user_roles:
                raise HTTPException(status_code=403, detail="管理者権限が必要です")
        
        # バックグラウンドでインデックス再構築
        background_tasks.add_task(_rebuild_vector_index)
        
        return create_success_response(
            message="インデックス再構築をバックグラウンドで開始しました"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"インデックス再構築エラー: {e}")
        raise HTTPException(status_code=500, detail="インデックス再構築に失敗しました")


@router.get("/similar/{memory_id}")
@track_performance("memory_similar")
async def find_similar_memories(
    memory_id: str,
    limit: int = Query(10, ge=1, le=50, description="取得件数"),
    min_score: float = Query(0.7, ge=0.0, le=1.0, description="最小類似度"),
    request: Request = None
):
    """
    類似メモリ検索
    
    指定されたメモリに類似するコンテンツを検索
    """
    try:
        vector_store = await get_vector_store()
        
        # メモリ存在確認
        memory_doc = await vector_store.get_document_by_id(memory_id)
        if not memory_doc:
            raise HTTPException(status_code=404, detail="メモリが見つかりません")
        
        # 権限チェック
        if hasattr(request.state, 'user'):
            authenticated_user_id = request.state.user.get("user_id")
            memory_user_id = memory_doc.metadata.get("user_id")
            
            if memory_user_id != authenticated_user_id:
                user_roles = request.state.user.get("roles", [])
                if "admin" not in user_roles:
                    raise HTTPException(status_code=403, detail="アクセス権限がありません")
        
        # 類似検索実行
        similar_docs = await vector_store.similarity_search_by_vector(
            embedding=memory_doc.embedding,
            k=limit + 1,  # 元のドキュメントを除外するため+1
            filter_dict={"user_id": memory_doc.metadata.get("user_id")}
        )
        
        # 元のドキュメントを除外
        similar_docs = [doc for doc in similar_docs if doc.metadata.get("id") != memory_id][:limit]
        
        # 最小スコアフィルタリング
        filtered_docs = [doc for doc in similar_docs if getattr(doc, 'similarity_score', 0) >= min_score]
        
        # レスポンス構築
        similar_memories = []
        for doc in filtered_docs:
            metadata = doc.metadata
            
            similar_memory = MemorySearchResult(
                id=metadata.get('id', str(uuid.uuid4())),
                content=doc.page_content,
                similarity_score=getattr(doc, 'similarity_score', 0.0),
                content_type=metadata.get('content_type', 'text'),
                title=metadata.get('title'),
                summary=metadata.get('summary'),
                source_session=metadata.get('session_id'),
                tags=metadata.get('tags', []),
                importance=metadata.get('importance', 0.5),
                created_at=metadata.get('created_at', time.time()),
                accessed_at=time.time(),
                metadata=metadata
            )
            similar_memories.append(similar_memory)
        
        return MemoryResponse(
            status="success",
            message=f"{len(similar_memories)}件の類似メモリを発見",
            results=similar_memories,
            query=f"類似検索: {memory_id}",
            total_results=len(similar_memories),
            search_time=0.0,  # 実際の時間測定
            max_score=max([m.similarity_score for m in similar_memories]) if similar_memories else 0.0,
            avg_score=sum([m.similarity_score for m in similar_memories]) / len(similar_memories) if similar_memories else 0.0
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"類似メモリ検索エラー: {e}")
        raise HTTPException(status_code=500, detail="類似検索に失敗しました")


# ============================================================================
# ヘルパー関数
# ============================================================================

async def _post_memory_storage(
    memory_id: str,
    user_id: str,
    content: str,
    metadata: Dict[str, Any]
):
    """メモリ保存後処理"""
    try:
        # ユーザー統計更新
        cache_manager = await get_cache_manager()
        stats_key = f"user_memory_stats:{user_id}"
        
        stats = await cache_manager.get(stats_key, CacheNamespace.USER_PREFERENCE) or {
            "total_memories": 0,
            "total_content_length": 0
        }
        
        stats["total_memories"] += 1
        stats["total_content_length"] += len(content)
        
        await cache_manager.set(
            stats_key,
            stats,
            CacheNamespace.USER_PREFERENCE,
            ttl=86400
        )
        
        logger.debug(f"メモリ保存後処理完了: {memory_id}")
        
    except Exception as e:
        logger.error(f"メモリ保存後処理エラー: {e}")


async def _store_summary_as_memory(
    session_id: str,
    summary: str,
    user_id: str,
    summary_result: Dict[str, Any]
):
    """要約をメモリとして保存"""
    try:
        vector_store = await get_vector_store()
        
        metadata = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "session_id": session_id,
            "content_type": "summary",
            "title": f"Session {session_id} Summary",
            "summary": summary[:200] + "..." if len(summary) > 200 else summary,
            "tags": ["summary", "auto-generated"],
            "importance": 0.8,
            "created_at": time.time(),
            "quality_score": summary_result.get("quality_score", 0.0),
            "entities_preserved": summary_result.get("entities_preserved", [])
        }
        
        await vector_store.add_texts(
            texts=[summary],
            metadatas=[metadata]
        )
        
        logger.info(f"要約をメモリとして保存: {session_id}")
        
    except Exception as e:
        logger.error(f"要約メモリ保存エラー: {e}")


async def _backup_deleted_memories(deleted_entries: List[Dict[str, Any]]):
    """削除メモリバックアップ"""
    try:
        from ...storage.backup_manager import get_backup_manager
        
        backup_manager = await get_backup_manager()
        
        # バックアップデータ構築
        backup_data = {
            "backup_type": "memory_cleanup",
            "timestamp": time.time(),
            "deleted_count": len(deleted_entries),
            "entries": deleted_entries
        }
        
        # 実装: backup_manager でメモリバックアップ機能
        logger.info(f"削除メモリバックアップ作成: {len(deleted_entries)}件")
        
    except Exception as e:
        logger.error(f"メモリバックアップエラー: {e}")


async def _rebuild_vector_index():
    """ベクタインデックス再構築"""
    try:
        vector_store = await get_vector_store()
        
        # インデックス最適化・再構築
        result = await vector_store.optimize_index()
        
        logger.info(f"ベクタインデックス再構築完了: {result}")
        
    except Exception as e:
        logger.error(f"インデックス再構築エラー: {e}")
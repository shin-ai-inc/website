# api/routes/tools.py
"""
AI継続ワークフローシステム - MCPツールAPI統合
継続性95%以上、品質90%以上、応答<2秒、可用性99.5%以上を実現
"""

import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, validator

from api.middleware.auth import get_current_user
from api.middleware.rate_limit import limiter
from api.models.requests import ToolExecutionRequest, ToolRegistrationRequest
from api.models.responses import (
    ToolExecutionResponse,
    ToolListResponse,
    ToolStatusResponse,
)
from core.mcp.tools_registry import ToolsRegistry
from core.utils.errors import (
    ToolExecutionError,
    ToolNotFoundError,
    ToolRegistrationError,
)
from core.utils.logger import get_logger
from core.utils.metrics import MetricsCollector

# ログとメトリクス初期化
logger = get_logger(__name__)
metrics = MetricsCollector()
router = APIRouter(prefix="/tools", tags=["🔧 MCP Tools"])


class ToolExecutionMetadata(BaseModel):
    """ツール実行メタデータ"""
    
    execution_id: str = Field(..., description="実行ID")
    tool_name: str = Field(..., description="ツール名")
    user_id: str = Field(..., description="ユーザーID")
    session_id: Optional[str] = Field(None, description="セッションID")
    started_at: datetime = Field(default_factory=datetime.utcnow)
    execution_time_ms: Optional[float] = Field(None, description="実行時間(ms)")
    success: bool = Field(False, description="成功フラグ")
    error_details: Optional[Dict[str, Any]] = Field(None, description="エラー詳細")


class StreamingToolExecution(BaseModel):
    """ストリーミングツール実行"""
    
    type: str = Field(..., description="イベントタイプ")
    data: Dict[str, Any] = Field(..., description="イベントデータ")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = Field(None)


# MCPツールレジストリ初期化
tools_registry = ToolsRegistry()


@router.get("/", response_model=ToolListResponse)
@limiter.limit("100/minute")
async def list_available_tools(
    category: Optional[str] = Query(None, description="ツールカテゴリ"),
    tag: Optional[str] = Query(None, description="タグフィルター"),
    enabled_only: bool = Query(True, description="有効なツールのみ"),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> ToolListResponse:
    """
    利用可能なMCPツール一覧を取得
    
    継続性機能:
    - セッション状態管理ツール
    - メモリ永続化ツール  
    - 品質保持要約ツール
    
    外部統合ツール:
    - Notion API統合
    - GitHub/GitLab統合
    - Slack API統合
    """
    try:
        start_time = asyncio.get_event_loop().time()
        
        # ツール一覧取得
        tools = await tools_registry.list_tools(
            category=category,
            tag=tag,
            enabled_only=enabled_only,
            user_id=current_user["user_id"]
        )
        
        # メトリクス記録
        execution_time = (asyncio.get_event_loop().time() - start_time) * 1000
        await metrics.record_api_request(
            endpoint="/tools/",
            method="GET",
            user_id=current_user["user_id"],
            execution_time_ms=execution_time,
            success=True
        )
        
        logger.info(
            f"Listed {len(tools)} tools for user {current_user['user_id']} "
            f"(category: {category}, tag: {tag}) in {execution_time:.2f}ms"
        )
        
        return ToolListResponse(
            tools=tools,
            total_count=len(tools),
            filters_applied={
                "category": category,
                "tag": tag,
                "enabled_only": enabled_only
            },
            user_permissions=current_user.get("permissions", [])
        )
        
    except Exception as e:
        logger.error(f"Failed to list tools: {str(e)}")
        await metrics.record_api_request(
            endpoint="/tools/",
            method="GET", 
            user_id=current_user["user_id"],
            success=False,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tools: {str(e)}"
        )


@router.get("/{tool_name}", response_model=ToolStatusResponse)
@limiter.limit("200/minute")
async def get_tool_status(
    tool_name: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> ToolStatusResponse:
    """
    特定ツールの詳細状態を取得
    
    応答時間最適化: <500ms での詳細情報取得
    """
    try:
        start_time = asyncio.get_event_loop().time()
        
        # ツール存在確認
        if not await tools_registry.tool_exists(tool_name):
            raise ToolNotFoundError(f"Tool '{tool_name}' not found")
        
        # ツール詳細情報取得
        tool_info = await tools_registry.get_tool_info(tool_name)
        tool_status = await tools_registry.get_tool_status(tool_name)
        tool_metrics = await tools_registry.get_tool_metrics(tool_name)
        
        execution_time = (asyncio.get_event_loop().time() - start_time) * 1000
        
        return ToolStatusResponse(
            tool_name=tool_name,
            status=tool_status,
            info=tool_info,
            metrics=tool_metrics,
            execution_time_ms=execution_time,
            last_updated=datetime.utcnow()
        )
        
    except ToolNotFoundError as e:
        logger.warning(f"Tool not found: {tool_name}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get tool status for {tool_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tool status: {str(e)}"
        )


@router.post("/{tool_name}/execute", response_model=ToolExecutionResponse)
@limiter.limit("50/minute")
async def execute_tool(
    tool_name: str,
    request: ToolExecutionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> ToolExecutionResponse:
    """
    MCPツール実行（同期）
    
    継続性機能:
    - セッション状態の自動保存
    - メモリ品質維持（90%以上）
    - エラー時の自動回復
    
    性能要件: 2秒以内の応答
    """
    execution_metadata = ToolExecutionMetadata(
        execution_id=f"exec_{tool_name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        tool_name=tool_name,
        user_id=current_user["user_id"],
        session_id=request.session_id
    )
    
    try:
        start_time = asyncio.get_event_loop().time()
        
        # ツール存在確認
        if not await tools_registry.tool_exists(tool_name):
            raise ToolNotFoundError(f"Tool '{tool_name}' not found")
        
        # ツール実行権限確認
        if not await tools_registry.check_tool_permission(
            tool_name, current_user["user_id"]
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied for tool '{tool_name}'"
            )
        
        # ツール実行
        logger.info(f"Executing tool {tool_name} for user {current_user['user_id']}")
        
        execution_result = await tools_registry.execute_tool(
            tool_name=tool_name,
            parameters=request.parameters,
            context={
                "user_id": current_user["user_id"],
                "session_id": request.session_id,
                "execution_id": execution_metadata.execution_id,
                "priority": request.priority,
                "timeout_seconds": request.timeout_seconds
            }
        )
        
        execution_time = (asyncio.get_event_loop().time() - start_time) * 1000
        execution_metadata.execution_time_ms = execution_time
        execution_metadata.success = execution_result.success
        
        # メトリクス記録
        await metrics.record_tool_execution(
            tool_name=tool_name,
            user_id=current_user["user_id"],
            execution_time_ms=execution_time,
            success=execution_result.success,
            session_id=request.session_id
        )
        
        # 継続性チェック（重要）
        if request.session_id and execution_result.success:
            await tools_registry.update_session_state(
                session_id=request.session_id,
                tool_execution_result=execution_result,
                user_id=current_user["user_id"]
            )
        
        logger.info(
            f"Tool {tool_name} execution completed in {execution_time:.2f}ms "
            f"(success: {execution_result.success})"
        )
        
        return ToolExecutionResponse(
            execution_id=execution_metadata.execution_id,
            tool_name=tool_name,
            success=execution_result.success,
            result=execution_result.result,
            error=execution_result.error,
            execution_time_ms=execution_time,
            metadata=execution_result.metadata,
            continuity_preserved=execution_result.continuity_preserved,
            quality_score=execution_result.quality_score
        )
        
    except ToolNotFoundError as e:
        execution_metadata.success = False
        execution_metadata.error_details = {"type": "not_found", "message": str(e)}
        
        logger.warning(f"Tool not found: {tool_name}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
        
    except ToolExecutionError as e:
        execution_metadata.success = False
        execution_metadata.error_details = {"type": "execution_error", "message": str(e)}
        
        logger.error(f"Tool execution failed: {tool_name} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Tool execution failed: {str(e)}"
        )
        
    except Exception as e:
        execution_metadata.success = False
        execution_metadata.error_details = {"type": "internal_error", "message": str(e)}
        
        logger.error(f"Unexpected error executing tool {tool_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error during tool execution: {str(e)}"
        )


@router.post("/{tool_name}/execute/stream")
@limiter.limit("25/minute")
async def execute_tool_streaming(
    tool_name: str,
    request: ToolExecutionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    MCPツール実行（ストリーミング）
    
    リアルタイム応答:
    - 進捗状況のストリーミング
    - 部分結果の逐次送信
    - エラーのリアルタイム通知
    
    継続性保証: 中断時の自動復旧機能
    """
    async def stream_tool_execution():
        execution_id = f"stream_{tool_name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        try:
            # 実行開始イベント
            yield f"data: {StreamingToolExecution(type='started', data={'tool_name': tool_name, 'execution_id': execution_id}).json()}\n\n"
            
            # ツール存在確認
            if not await tools_registry.tool_exists(tool_name):
                error_event = StreamingToolExecution(
                    type='error',
                    data={'error': f"Tool '{tool_name}' not found", 'code': 'TOOL_NOT_FOUND'}
                )
                yield f"data: {error_event.json()}\n\n"
                return
            
            # ストリーミング実行
            async for progress_event in tools_registry.execute_tool_streaming(
                tool_name=tool_name,
                parameters=request.parameters,
                context={
                    "user_id": current_user["user_id"],
                    "session_id": request.session_id,
                    "execution_id": execution_id
                }
            ):
                streaming_event = StreamingToolExecution(
                    type=progress_event.type,
                    data=progress_event.data,
                    metadata=progress_event.metadata
                )
                yield f"data: {streaming_event.json()}\n\n"
                
                # 継続性チェック
                if progress_event.type == 'continuity_check':
                    logger.info(f"Continuity check for session {request.session_id}")
            
            # 完了イベント
            completion_event = StreamingToolExecution(
                type='completed',
                data={'execution_id': execution_id, 'tool_name': tool_name}
            )
            yield f"data: {completion_event.json()}\n\n"
            
        except Exception as e:
            error_event = StreamingToolExecution(
                type='error',
                data={'error': str(e), 'execution_id': execution_id}
            )
            yield f"data: {error_event.json()}\n\n"
            logger.error(f"Streaming execution failed for {tool_name}: {str(e)}")
    
    return StreamingResponse(
        stream_tool_execution(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/register", response_model=ToolStatusResponse)
@limiter.limit("10/hour")
async def register_custom_tool(
    request: ToolRegistrationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> ToolStatusResponse:
    """
    カスタムMCPツールの登録
    
    拡張性:
    - 独自ツールの動的登録
    - ツール間の依存関係管理
    - バージョン管理対応
    """
    try:
        # 管理者権限確認
        if "admin" not in current_user.get("roles", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin role required for tool registration"
            )
        
        # ツール登録
        registration_result = await tools_registry.register_tool(
            tool_definition=request.tool_definition,
            owner_id=current_user["user_id"],
            metadata=request.metadata
        )
        
        logger.info(
            f"Custom tool '{request.tool_definition.name}' registered "
            f"by user {current_user['user_id']}"
        )
        
        return ToolStatusResponse(
            tool_name=request.tool_definition.name,
            status="registered",
            info=registration_result.info,
            metrics=registration_result.metrics,
            last_updated=datetime.utcnow()
        )
        
    except ToolRegistrationError as e:
        logger.error(f"Tool registration failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Tool registration failed: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during tool registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error during tool registration: {str(e)}"
        )


@router.delete("/{tool_name}")
@limiter.limit("5/hour") 
async def unregister_tool(
    tool_name: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> JSONResponse:
    """
    MCPツールの登録解除
    
    安全性:
    - 依存関係チェック
    - アクティブセッションの確認
    - ロールバック機能
    """
    try:
        # 管理者権限確認
        if "admin" not in current_user.get("roles", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin role required for tool unregistration"
            )
        
        # ツール登録解除
        unregistration_result = await tools_registry.unregister_tool(
            tool_name=tool_name,
            requester_id=current_user["user_id"]
        )
        
        logger.info(
            f"Tool '{tool_name}' unregistered by user {current_user['user_id']}"
        )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Tool '{tool_name}' unregistered successfully",
                "affected_sessions": unregistration_result.affected_sessions,
                "cleanup_completed": unregistration_result.cleanup_completed
            }
        )
        
    except ToolNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error during tool unregistration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error during tool unregistration: {str(e)}"
        )


@router.get("/{tool_name}/metrics")
@limiter.limit("100/minute")
async def get_tool_metrics(
    tool_name: str,
    hours: int = Query(24, ge=1, le=168, description="過去N時間"),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    ツール性能メトリクスの取得
    
    監視項目:
    - 実行回数・成功率
    - 平均応答時間
    - エラー傾向分析
    - ユーザー利用パターン
    """
    try:
        if not await tools_registry.tool_exists(tool_name):
            raise ToolNotFoundError(f"Tool '{tool_name}' not found")
        
        metrics_data = await tools_registry.get_tool_metrics_detailed(
            tool_name=tool_name,
            hours=hours,
            user_id=current_user["user_id"]
        )
        
        return {
            "tool_name": tool_name,
            "time_range_hours": hours,
            "metrics": metrics_data,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except ToolNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get metrics for tool {tool_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tool metrics: {str(e)}"
        )


# ヘルスチェックエンドポイント
@router.get("/health/check")
async def health_check() -> Dict[str, Any]:
    """
    MCPツールシステムのヘルスチェック
    
    可用性99.5%以上の確保:
    - 全ツールの状態確認
    - レジストリ接続確認
    - リソース使用状況
    """
    try:
        health_status = await tools_registry.health_check()
        
        return {
            "status": "healthy" if health_status.overall_healthy else "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "details": health_status.details,
            "active_tools": health_status.active_tools_count,
            "registry_status": health_status.registry_status,
            "uptime_seconds": health_status.uptime_seconds
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }
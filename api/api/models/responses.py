# api/models/responses.py
"""
APIレスポンスモデル
Pydantic統一レスポンススキーマ
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class BaseResponseModel(BaseModel):
    """基底レスポンスモデル"""
    
    class Config:
        # JSON例のスキーマ生成
        schema_extra = {
            "example": {}
        }


class StatusResponse(BaseResponseModel):
    """ステータスレスポンス"""
    status: str = Field(..., description="ステータス")
    message: str = Field(..., description="メッセージ")
    timestamp: float = Field(..., description="タイムスタンプ")
    
    class Config:
        schema_extra = {
            "example": {
                "status": "success",
                "message": "Operation completed successfully",
                "timestamp": 1640995200.0
            }
        }


class ErrorResponse(BaseResponseModel):
    """エラーレスポンス"""
    error: str = Field(..., description="エラータイプ")
    detail: str = Field(..., description="エラー詳細")
    status_code: int = Field(..., description="HTTPステータスコード")
    timestamp: float = Field(..., description="タイムスタンプ")
    
    class Config:
        schema_extra = {
            "example": {
                "error": "ValidationError",
                "detail": "Input validation failed",
                "status_code": 400,
                "timestamp": 1640995200.0
            }
        }


class ChatMessage(BaseResponseModel):
    """チャットメッセージレスポンス"""
    role: str = Field(..., description="メッセージロール")
    content: str = Field(..., description="メッセージ内容")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="メタデータ")
    
    class Config:
        schema_extra = {
            "example": {
                "role": "assistant",
                "content": "Hello! How can I help you today?",
                "metadata": {
                    "model": "claude-sonnet-4-20250514",
                    "response_time": 1.23
                }
            }
        }


class ChatResponse(BaseResponseModel):
    """チャット応答レスポンス"""
    session_id: str = Field(..., description="セッションID")
    message: ChatMessage = Field(..., description="応答メッセージ")
    routing_info: Dict[str, Any] = Field(..., description="ルーティング情報")
    performance_metrics: Dict[str, Any] = Field(..., description="パフォーマンスメトリクス")
    continuity_info: Optional[Dict[str, Any]] = Field(default=None, description="継続性情報")
    
    class Config:
        schema_extra = {
            "example": {
                "session_id": "session_abc123",
                "message": {
                    "role": "assistant",
                    "content": "Based on your question about machine learning...",
                    "metadata": {"model": "claude-sonnet-4-20250514"}
                },
                "routing_info": {
                    "provider": "anthropic",
                    "model": "claude-sonnet-4-20250514",
                    "reason": "High quality analysis required"
                },
                "performance_metrics": {
                    "response_time": 2.1,
                    "token_count": 1500,
                    "estimated_cost": 0.045
                }
            }
        }


class SummarizeResponse(BaseResponseModel):
    """要約レスポンス"""
    summary: str = Field(..., description="要約結果")
    quality_score: float = Field(..., description="品質スコア", ge=0.0, le=1.0)
    original_token_count: int = Field(..., description="元のトークン数")
    summary_token_count: int = Field(..., description="要約後トークン数")
    compression_ratio: float = Field(..., description="圧縮率", ge=0.0, le=1.0)
    processing_time: float = Field(..., description="処理時間")
    
    class Config:
        schema_extra = {
            "example": {
                "summary": "This conversation discussed machine learning fundamentals...",
                "quality_score": 0.94,
                "original_token_count": 5000,
                "summary_token_count": 800,
                "compression_ratio": 0.84,
                "processing_time": 3.2
            }
        }


class MemorySearchResult(BaseResponseModel):
    """記憶検索結果"""
    content: str = Field(..., description="検索結果コンテンツ")
    metadata: Dict[str, Any] = Field(..., description="メタデータ")
    similarity_score: float = Field(..., description="類似度スコア", ge=0.0, le=1.0)
    
    class Config:
        schema_extra = {
            "example": {
                "content": "Machine learning is a subset of artificial intelligence...",
                "metadata": {
                    "session_id": "session_abc123",
                    "timestamp": 1640995200.0,
                    "topic": "machine_learning"
                },
                "similarity_score": 0.89
            }
        }


class MemorySearchResponse(BaseResponseModel):
    """記憶検索レスポンス"""
    results: List[MemorySearchResult] = Field(..., description="検索結果")
    total_count: int = Field(..., description="総結果数")
    processing_time: float = Field(..., description="処理時間")
    
    class Config:
        schema_extra = {
            "example": {
                "results": [
                    {
                        "content": "Machine learning fundamentals...",
                        "metadata": {"topic": "AI"},
                        "similarity_score": 0.95
                    }
                ],
                "total_count": 5,
                "processing_time": 0.42
            }
        }


class TokenAnalysisResponse(BaseResponseModel):
    """トークン分析レスポンス"""
    total_tokens: int = Field(..., description="総トークン数")
    estimated_cost: float = Field(..., description="推定コスト")
    is_near_limit: bool = Field(..., description="制限接近フラグ")
    recommended_action: str = Field(..., description="推奨アクション")
    analysis_details: Dict[str, Any] = Field(..., description="分析詳細")
    
    class Config:
        schema_extra = {
            "example": {
                "total_tokens": 15000,
                "estimated_cost": 0.45,
                "is_near_limit": True,
                "recommended_action": "summarization_required",
                "analysis_details": {
                    "message_count": 25,
                    "average_tokens_per_message": 600,
                    "utilization_percentage": 87.5
                }
            }
        }


class SessionInfo(BaseResponseModel):
    """セッション情報レスポンス"""
    session_id: str = Field(..., description="セッションID")
    user_id: Optional[str] = Field(default=None, description="ユーザーID")
    thread_id: str = Field(..., description="スレッドID")
    created_at: str = Field(..., description="作成日時")
    last_activity: str = Field(..., description="最終活動日時")
    message_count: int = Field(..., description="メッセージ数")
    token_count: int = Field(..., description="トークン数")
    quality_score: float = Field(..., description="品質スコア", ge=0.0, le=1.0)
    summary: str = Field(..., description="要約")
    context: Dict[str, Any] = Field(..., description="コンテキスト")
    status: str = Field(..., description="ステータス")
    has_changes: bool = Field(..., description="変更有無フラグ")
    
    class Config:
        schema_extra = {
            "example": {
                "session_id": "session_abc123",
                "user_id": "user_123",
                "thread_id": "thread_abc123",
                "created_at": "2025-01-01T00:00:00Z",
                "last_activity": "2025-01-01T12:00:00Z",
                "message_count": 15,
                "token_count": 8500,
                "quality_score": 0.91,
                "summary": "Discussion about AI development...",
                "context": {"topic": "AI"},
                "status": "active",
                "has_changes": True
            }
        }


class SessionListResponse(BaseResponseModel):
    """セッション一覧レスポンス"""
    sessions: List[SessionInfo] = Field(..., description="セッション一覧")
    total_count: int = Field(..., description="総セッション数")
    active_count: int = Field(..., description="アクティブセッション数")
    processing_time: float = Field(..., description="処理時間")
    
    class Config:
        schema_extra = {
            "example": {
                "sessions": [
                    {
                        "session_id": "session_abc123",
                        "user_id": "user_123",
                        "status": "active",
                        "message_count": 15
                    }
                ],
                "total_count": 25,
                "active_count": 8,
                "processing_time": 0.15
            }
        }


class ToolMetadata(BaseResponseModel):
    """ツールメタデータレスポンス"""
    name: str = Field(..., description="ツール名")
    description: str = Field(..., description="説明")
    version: str = Field(..., description="バージョン")
    category: str = Field(..., description="カテゴリ")
    tags: List[str] = Field(..., description="タグ")
    author: str = Field(..., description="作成者")
    created_at: str = Field(..., description="作成日時")
    enabled: bool = Field(..., description="有効フラグ")
    usage_count: int = Field(..., description="使用回数")
    success_rate: float = Field(..., description="成功率", ge=0.0, le=1.0)
    
    class Config:
        schema_extra = {
            "example": {
                "name": "notion_upsert",
                "description": "Notion page update/create tool",
                "version": "1.0.0",
                "category": "integration",
                "tags": ["notion", "productivity"],
                "author": "AI-Workflow-System",
                "created_at": "2025-01-01T00:00:00Z",
                "enabled": True,
                "usage_count": 150,
                "success_rate": 0.97
            }
        }


class ToolListResponse(BaseResponseModel):
    """ツール一覧レスポンス"""
    tools: List[ToolMetadata] = Field(..., description="ツール一覧")
    total_count: int = Field(..., description="総ツール数")
    enabled_count: int = Field(..., description="有効ツール数")
    categories: Dict[str, int] = Field(..., description="カテゴリ別集計")
    
    class Config:
        schema_extra = {
            "example": {
                "tools": [
                    {
                        "name": "notion_upsert",
                        "description": "Notion integration",
                        "category": "integration",
                        "enabled": True
                    }
                ],
                "total_count": 12,
                "enabled_count": 10,
                "categories": {
                    "integration": 5,
                    "automation": 4,
                    "analysis": 3
                }
            }
        }


class ToolExecutionResponse(BaseResponseModel):
    """ツール実行レスポンス"""
    tool_name: str = Field(..., description="ツール名")
    success: bool = Field(..., description="実行成功フラグ")
    result: Any = Field(default=None, description="実行結果")
    error: Optional[str] = Field(default=None, description="エラーメッセージ")
    execution_time: float = Field(..., description="実行時間")
    timestamp: float = Field(..., description="実行タイムスタンプ")
    
    class Config:
        schema_extra = {
            "example": {
                "tool_name": "notion_upsert",
                "success": True,
                "result": {"page_id": "abc123", "url": "https://notion.so/..."},
                "error": None,
                "execution_time": 1.25,
                "timestamp": 1640995200.0
            }
        }


class HealthCheckResponse(BaseResponseModel):
    """ヘルスチェックレスポンス"""
    status: str = Field(..., description="システムステータス")
    timestamp: float = Field(..., description="チェック時刻")
    version: str = Field(..., description="システムバージョン")
    components: Dict[str, Any] = Field(..., description="コンポーネント状態")
    
    class Config:
        schema_extra = {
            "example": {
                "status": "healthy",
                "timestamp": 1640995200.0,
                "version": "1.0.0",
                "components": {
                    "database": {"status": "healthy"},
                    "vector_store": {"status": "healthy"},
                    "llm_router": {"status": "healthy"}
                }
            }
        }


class MetricsResponse(BaseResponseModel):
    """メトリクスレスポンス"""
    timestamp: float = Field(..., description="収集時刻")
    system: Dict[str, Any] = Field(..., description="システムメトリクス")
    performance: Dict[str, Any] = Field(..., description="パフォーマンスメトリクス")
    usage: Dict[str, Any] = Field(..., description="使用量メトリクス")
    
    class Config:
        schema_extra = {
            "example": {
                "timestamp": 1640995200.0,
                "system": {
                    "cpu_percent": 45.2,
                    "memory_percent": 67.8,
                    "disk_usage": 23.1
                },
                "performance": {
                    "avg_response_time": 1.85,
                    "success_rate": 0.987,
                    "throughput": 150.2
                },
                "usage": {
                    "active_sessions": 25,
                    "total_requests": 15000,
                    "token_usage": 2500000
                }
            }
        }


class BulkOperationResponse(BaseResponseModel):
    """一括操作レスポンス"""
    total_operations: int = Field(..., description="総操作数")
    successful_operations: int = Field(..., description="成功操作数")
    failed_operations: int = Field(..., description="失敗操作数")
    results: List[Dict[str, Any]] = Field(..., description="個別結果")
    processing_time: float = Field(..., description="処理時間")
    
    class Config:
        schema_extra = {
            "example": {
                "total_operations": 5,
                "successful_operations": 4,
                "failed_operations": 1,
                "results": [
                    {"operation": "notion_upsert", "success": True},
                    {"operation": "slack_send", "success": False, "error": "Channel not found"}
                ],
                "processing_time": 12.45
            }
        }


class PaginatedResponse(BaseResponseModel):
    """ページング対応レスポンス基底クラス"""
    page: int = Field(..., description="現在ページ")
    page_size: int = Field(..., description="ページサイズ")
    total_pages: int = Field(..., description="総ページ数")
    total_items: int = Field(..., description="総アイテム数")
    has_next: bool = Field(..., description="次ページ有無")
    has_previous: bool = Field(..., description="前ページ有無")
    
    class Config:
        schema_extra = {
            "example": {
                "page": 2,
                "page_size": 20,
                "total_pages": 5,
                "total_items": 95,
                "has_next": True,
                "has_previous": True
            }
        }


class StatisticsResponse(BaseResponseModel):
    """統計情報レスポンス"""
    period: str = Field(..., description="集計期間")
    metrics: Dict[str, Any] = Field(..., description="メトリクス")
    trends: Dict[str, Any] = Field(..., description="トレンド情報")
    summary: Dict[str, Any] = Field(..., description="サマリー")
    generated_at: float = Field(..., description="生成時刻")
    
    class Config:
        schema_extra = {
            "example": {
                "period": "last_24h",
                "metrics": {
                    "total_requests": 5000,
                    "avg_response_time": 1.75,
                    "success_rate": 0.99
                },
                "trends": {
                    "request_trend": "increasing",
                    "performance_trend": "stable"
                },
                "summary": {
                    "status": "healthy",
                    "peak_hour": "14:00-15:00"
                },
                "generated_at": 1640995200.0
            }
        }
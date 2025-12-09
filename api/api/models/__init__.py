# api/models/__init__.py
"""
Pydanticモデル初期化
API リクエスト・レスポンスモデル
"""

from api.models.requests import (
    BaseRequest,
    ChatRequest,
    ChatMessage,
    SummarizeRequest,
    TokenAnalysisRequest,
    MemorySearchRequest,
    MemoryStoreRequest,
    SessionCreateRequest,
    ToolExecuteRequest,
    NotionSaveRequest,
    GitSaveRequest,
    HealthCheckRequest,
    ConfigUpdateRequest,
    BatchRequest,
    StreamingRequest,
    MultiSessionRequest,
)

from api.models.responses import (
    BaseResponse,
    ErrorResponse,
    ChatResponse,
    StreamChunk,
    SummarizeResponse,
    TokenAnalysisResponse,
    MemorySearchResponse,
    SessionResponse,
    SessionListResponse,
    ToolResponse,
    ToolListResponse,
    HealthCheckResponse,
    StatsResponse,
    BackupResponse,
    ExportResponse,
    BatchResponse,
    SystemInfoResponse,
)

__all__ = [
    # Request models
    "BaseRequest",
    "ChatRequest", 
    "ChatMessage",
    "SummarizeRequest",
    "TokenAnalysisRequest",
    "MemorySearchRequest",
    "MemoryStoreRequest",
    "SessionCreateRequest",
    "ToolExecuteRequest",
    "NotionSaveRequest",
    "GitSaveRequest",
    "HealthCheckRequest",
    "ConfigUpdateRequest",
    "BatchRequest",
    "StreamingRequest",
    "MultiSessionRequest",
    
    # Response models
    "BaseResponse",
    "ErrorResponse",
    "ChatResponse",
    "StreamChunk",
    "SummarizeResponse",
    "TokenAnalysisResponse", 
    "MemorySearchResponse",
    "SessionResponse",
    "SessionListResponse",
    "ToolResponse",
    "ToolListResponse",
    "HealthCheckResponse",
    "StatsResponse",
    "BackupResponse",
    "ExportResponse",
    "BatchResponse",
    "SystemInfoResponse",
]
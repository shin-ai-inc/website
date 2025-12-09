# api/models/requests.py
"""
APIレスポンスモデル
Pydantic BaseModelを使用したレスポンスデータ構造
"""

from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class ResponseStatus(str, Enum):
    """レスポンスステータス"""
    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"
    PARTIAL = "partial"


class ProcessingStatus(str, Enum):
    """処理ステータス"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


# ============================================================================
# Base Response Classes
# ============================================================================

class BaseResponse(BaseModel):
    """基底レスポンスクラス"""
    status: ResponseStatus = Field(..., description="レスポンスステータス")
    message: str = Field("", description="メッセージ")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="タイムスタンプ")
    request_id: Optional[str] = Field(None, description="リクエストID")
    
    class Config:
        extra = "allow"


class PaginatedResponse(BaseModel):
    """ページネーション付きレスポンス"""
    total_count: int = Field(..., description="総件数")
    page_count: int = Field(..., description="総ページ数")
    current_page: int = Field(..., description="現在ページ")
    page_size: int = Field(..., description="ページサイズ")
    has_next: bool = Field(..., description="次ページ有無")
    has_previous: bool = Field(..., description="前ページ有無")
    
    class Config:
        extra = "allow"


# ============================================================================
# Chat API Responses
# ============================================================================

class MessageOutput(BaseModel):
    """メッセージ出力"""
    id: str = Field(..., description="メッセージID")
    role: str = Field(..., description="ロール")
    content: str = Field(..., description="コンテンツ")
    timestamp: datetime = Field(..., description="タイムスタンプ")
    
    # AI情報
    model_used: Optional[str] = Field(None, description="使用モデル")
    token_count: int = Field(0, description="トークン数")
    cost: float = Field(0.0, description="処理コスト")
    response_time: float = Field(0.0, description="応答時間")
    
    # 品質情報
    confidence_score: Optional[float] = Field(None, description="信頼度スコア")
    quality_score: Optional[float] = Field(None, description="品質スコア")
    
    # ツール情報
    tool_calls: Optional[List[Dict[str, Any]]] = Field(None, description="ツール呼び出し")
    tool_results: Optional[List[Dict[str, Any]]] = Field(None, description="ツール結果")
    
    metadata: Dict[str, Any] = Field(default_factory=dict, description="メタデータ")


class ChatResponse(BaseResponse):
    """チャット補完レスポンス"""
    message: MessageOutput = Field(..., description="生成メッセージ")
    session_id: str = Field(..., description="セッションID")
    
    # 継続性情報
    continuation_status: str = Field("active", description="継続ステータス")
    context_preserved: bool = Field(True, description="コンテキスト保持")
    memory_updated: bool = Field(False, description="メモリ更新")
    
    # パフォーマンス情報
    processing_time: float = Field(..., description="処理時間")
    tokens_used: int = Field(..., description="使用トークン数")
    cost_incurred: float = Field(0.0, description="発生コスト")
    
    # システム情報
    model_provider: str = Field(..., description="モデルプロバイダー")
    model_name: str = Field(..., description="モデル名")
    routing_reason: Optional[str] = Field(None, description="ルーティング理由")
    
    # 次回推奨設定
    next_recommendations: Dict[str, Any] = Field(default_factory=dict, description="次回推奨設定")


class ChatStreamChunk(BaseModel):
    """チャットストリームチャンク"""
    id: str = Field(..., description="チャンクID")
    type: str = Field(..., description="チャンクタイプ")
    content: str = Field("", description="コンテンツ")
    delta: str = Field("", description="差分コンテンツ")
    
    # ストリーミング情報
    sequence: int = Field(..., description="シーケンス番号")
    is_final: bool = Field(False, description="最終チャンク")
    timestamp: float = Field(..., description="タイムスタンプ")
    
    # メタデータ
    metadata: Dict[str, Any] = Field(default_factory=dict, description="メタデータ")
    
    class Config:
        extra = "allow"


# ============================================================================
# Session API Responses
# ============================================================================

class SessionSummary(BaseModel):
    """セッションサマリー"""
    session_id: str = Field(..., description="セッションID")
    user_id: str = Field(..., description="ユーザーID")
    title: Optional[str] = Field(None, description="タイトル")
    session_type: str = Field(..., description="セッションタイプ")
    status: str = Field(..., description="ステータス")
    
    # 統計情報
    message_count: int = Field(0, description="メッセージ数")
    total_tokens: int = Field(0, description="総トークン数")
    total_cost: float = Field(0.0, description="総コスト")
    avg_response_time: float = Field(0.0, description="平均応答時間")
    quality_score: float = Field(0.0, description="品質スコア")
    
    # 日時情報
    created_at: datetime = Field(..., description="作成日時")
    updated_at: datetime = Field(..., description="更新日時")
    last_accessed: datetime = Field(..., description="最終アクセス")
    
    # その他
    tags: List[str] = Field(default_factory=list, description="タグ")
    priority: int = Field(5, description="優先度")


class SessionDetail(SessionSummary):
    """セッション詳細"""
    description: Optional[str] = Field(None, description="説明")
    settings: Dict[str, Any] = Field(default_factory=dict, description="設定")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="メタデータ")
    
    # 詳細統計
    model_usage: Dict[str, int] = Field(default_factory=dict, description="モデル使用状況")
    tool_usage: Dict[str, int] = Field(default_factory=dict, description="ツール使用状況")
    error_count: int = Field(0, description="エラー数")
    
    # パフォーマンス詳細
    performance_metrics: Dict[str, Any] = Field(default_factory=dict, description="パフォーマンスメトリクス")
    
    # 最新メッセージ（プレビュー用）
    recent_messages: List[MessageOutput] = Field(default_factory=list, description="最新メッセージ")


class SessionResponse(BaseResponse):
    """セッションレスポンス"""
    session: SessionDetail = Field(..., description="セッション詳細")


class SessionListResponse(BaseResponse, PaginatedResponse):
    """セッション一覧レスポンス"""
    sessions: List[SessionSummary] = Field(..., description="セッション一覧")
    
    # 統計サマリー
    total_messages: int = Field(0, description="総メッセージ数")
    total_tokens: int = Field(0, description="総トークン数")
    total_cost: float = Field(0.0, description="総コスト")
    active_sessions: int = Field(0, description="アクティブセッション数")


# ============================================================================
# Tool API Responses
# ============================================================================

class ToolExecutionResult(BaseModel):
    """ツール実行結果"""
    tool_name: str = Field(..., description="ツール名")
    execution_id: str = Field(..., description="実行ID")
    status: ProcessingStatus = Field(..., description="実行ステータス")
    
    # 結果データ
    result: Any = Field(None, description="実行結果")
    output: str = Field("", description="出力内容")
    error_message: Optional[str] = Field(None, description="エラーメッセージ")
    
    # 実行情報
    started_at: datetime = Field(..., description="開始時刻")
    completed_at: Optional[datetime] = Field(None, description="完了時刻")
    execution_time: float = Field(0.0, description="実行時間")
    
    # リソース使用量
    cpu_usage: Optional[float] = Field(None, description="CPU使用率")
    memory_usage: Optional[float] = Field(None, description="メモリ使用量")
    
    metadata: Dict[str, Any] = Field(default_factory=dict, description="メタデータ")


class ToolResponse(BaseResponse):
    """ツール実行レスポンス"""
    execution: ToolExecutionResult = Field(..., description="実行結果")
    session_id: Optional[str] = Field(None, description="セッションID")


class ToolBatchResponse(BaseResponse):
    """ツール一括実行レスポンス"""
    executions: List[ToolExecutionResult] = Field(..., description="実行結果一覧")
    session_id: Optional[str] = Field(None, description="セッションID")
    
    # 統計情報
    total_executions: int = Field(..., description="総実行数")
    successful_executions: int = Field(..., description="成功実行数")
    failed_executions: int = Field(..., description="失敗実行数")
    total_execution_time: float = Field(..., description="総実行時間")


class ToolListResponse(BaseResponse):
    """ツール一覧レスポンス"""
    tools: List[Dict[str, Any]] = Field(..., description="ツール一覧")
    categories: List[str] = Field(..., description="カテゴリ一覧")
    total_tools: int = Field(..., description="総ツール数")


# ============================================================================
# Memory API Responses
# ============================================================================

class MemorySearchResult(BaseModel):
    """メモリ検索結果"""
    id: str = Field(..., description="メモリID")
    content: str = Field(..., description="コンテンツ")
    similarity_score: float = Field(..., description="類似度スコア")
    
    # メタデータ
    content_type: str = Field(..., description="コンテンツタイプ")
    title: Optional[str] = Field(None, description="タイトル")
    summary: Optional[str] = Field(None, description="サマリー")
    source_session: Optional[str] = Field(None, description="ソースセッション")
    
    # 分類情報
    tags: List[str] = Field(default_factory=list, description="タグ")
    importance: float = Field(0.5, description="重要度")
    
    # 日時情報
    created_at: datetime = Field(..., description="作成日時")
    accessed_at: datetime = Field(..., description="アクセス日時")
    
    metadata: Dict[str, Any] = Field(default_factory=dict, description="メタデータ")


class MemoryResponse(BaseResponse):
    """メモリレスポンス"""
    results: List[MemorySearchResult] = Field(..., description="検索結果")
    query: str = Field(..., description="検索クエリ")
    
    # 検索情報
    total_results: int = Field(..., description="総結果数")
    search_time: float = Field(..., description="検索時間")
    max_score: float = Field(0.0, description="最高スコア")
    avg_score: float = Field(0.0, description="平均スコア")


class MemoryStoreResponse(BaseResponse):
    """メモリ保存レスポンス"""
    memory_id: str = Field(..., description="メモリID")
    embedding_id: Optional[str] = Field(None, description="埋め込みID")
    processing_time: float = Field(..., description="処理時間")


class MemorySummarizeResponse(BaseResponse):
    """メモリ要約レスポンス"""
    summary: str = Field(..., description="要約内容")
    session_id: str = Field(..., description="セッションID")
    
    # 要約情報
    original_length: int = Field(..., description="元の長さ")
    summary_length: int = Field(..., description="要約長さ")
    compression_ratio: float = Field(..., description="圧縮率")
    quality_score: float = Field(..., description="品質スコア")
    
    # 処理情報
    processing_time: float = Field(..., description="処理時間")
    tokens_used: int = Field(..., description="使用トークン数")
    model_used: str = Field(..., description="使用モデル")
    
    # 保持情報
    entities_preserved: List[str] = Field(default_factory=list, description="保持エンティティ")
    context_preserved: bool = Field(True, description="コンテキスト保持")


# ============================================================================
# Export API Responses
# ============================================================================

class ExportResponse(BaseResponse):
    """エクスポートレスポンス"""
    export_id: str = Field(..., description="エクスポートID")
    download_url: Optional[str] = Field(None, description="ダウンロードURL")
    file_size: int = Field(..., description="ファイルサイズ")
    format: str = Field(..., description="フォーマット")
    
    # エクスポート情報
    session_id: str = Field(..., description="セッションID")
    exported_messages: int = Field(..., description="エクスポートメッセージ数")
    processing_time: float = Field(..., description="処理時間")
    
    # 有効期限
    expires_at: datetime = Field(..., description="有効期限")
    
    metadata: Dict[str, Any] = Field(default_factory=dict, description="メタデータ")


# ============================================================================
# Analytics API Responses
# ============================================================================

class MetricData(BaseModel):
    """メトリクスデータ"""
    metric_name: str = Field(..., description="メトリクス名")
    value: Union[int, float, str] = Field(..., description="値")
    timestamp: datetime = Field(..., description="タイムスタンプ")
    unit: Optional[str] = Field(None, description="単位")
    
    # 集計情報
    aggregation_period: Optional[str] = Field(None, description="集計期間")
    sample_count: Optional[int] = Field(None, description="サンプル数")
    
    metadata: Dict[str, Any] = Field(default_factory=dict, description="メタデータ")


class AnalyticsResponse(BaseResponse):
    """分析レスポンス"""
    metrics: List[MetricData] = Field(..., description="メトリクス一覧")
    
    # 分析情報
    analysis_period: Dict[str, datetime] = Field(..., description="分析期間")
    total_sessions: int = Field(..., description="総セッション数")
    total_messages: int = Field(..., description="総メッセージ数")
    
    # サマリー統計
    summary_stats: Dict[str, Any] = Field(default_factory=dict, description="サマリー統計")
    
    # チャート データ
    chart_data: Optional[Dict[str, Any]] = Field(None, description="チャートデータ")


# ============================================================================
# System API Responses
# ============================================================================

class HealthResponse(BaseResponse):
    """ヘルスチェックレスポンス"""
    overall_status: str = Field(..., description="全体ステータス")
    
    # コンポーネント状態
    components: Dict[str, Dict[str, Any]] = Field(..., description="コンポーネント状態")
    
    # システム情報
    uptime: float = Field(..., description="稼働時間")
    version: str = Field(..., description="バージョン")
    
    # パフォーマンス指標
    response_time: float = Field(..., description="応答時間")
    memory_usage: float = Field(..., description="メモリ使用量")
    cpu_usage: float = Field(..., description="CPU使用率")
    
    # 統計情報
    stats: Dict[str, Any] = Field(default_factory=dict, description="統計情報")


class ErrorResponse(BaseResponse):
    """エラーレスポンス"""
    error_code: str = Field(..., description="エラーコード")
    error_type: str = Field(..., description="エラータイプ")
    details: Optional[Dict[str, Any]] = Field(None, description="詳細情報")
    
    # デバッグ情報
    trace_id: Optional[str] = Field(None, description="トレースID")
    stack_trace: Optional[str] = Field(None, description="スタックトレース")
    
    # 対処方法
    suggested_action: Optional[str] = Field(None, description="推奨対処方法")
    retry_after: Optional[int] = Field(None, description="リトライ待機秒数")


# ============================================================================
# Streaming Responses
# ============================================================================

class StreamingEvent(BaseModel):
    """ストリーミングイベント"""
    event_type: str = Field(..., description="イベントタイプ")
    data: Dict[str, Any] = Field(..., description="イベントデータ")
    timestamp: float = Field(..., description="タイムスタンプ")
    sequence: int = Field(..., description="シーケンス")
    
    class Config:
        extra = "allow"


class ServerSentEvent(BaseModel):
    """Server-Sent Event"""
    id: Optional[str] = Field(None, description="イベントID")
    event: Optional[str] = Field(None, description="イベント名")
    data: str = Field(..., description="データ")
    retry: Optional[int] = Field(None, description="リトライ間隔")
    
    def format(self) -> str:
        """SSE形式文字列生成"""
        lines = []
        if self.id:
            lines.append(f"id: {self.id}")
        if self.event:
            lines.append(f"event: {self.event}")
        lines.append(f"data: {self.data}")
        if self.retry:
            lines.append(f"retry: {self.retry}")
        lines.append("")  # 空行で終了
        return "\n".join(lines)


# ============================================================================
# Response Factory Functions
# ============================================================================

def create_success_response(
    data: Any = None,
    message: str = "操作が正常に完了しました",
    **kwargs
) -> BaseResponse:
    """成功レスポンス生成"""
    response_data = {
        "status": ResponseStatus.SUCCESS,
        "message": message,
        **kwargs
    }
    if data is not None:
        response_data.update(data)
    
    return BaseResponse(**response_data)


def create_error_response(
    error_code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
    **kwargs
) -> ErrorResponse:
    """エラーレスポンス生成"""
    return ErrorResponse(
        status=ResponseStatus.ERROR,
        message=message,
        error_code=error_code,
        error_type=error_code.split("_")[0],
        details=details,
        **kwargs
    )


def create_paginated_response(
    items: List[Any],
    total_count: int,
    page: int,
    page_size: int,
    **kwargs
) -> Dict[str, Any]:
    """ページネーション付きレスポンス生成"""
    page_count = (total_count + page_size - 1) // page_size
    
    return {
        "total_count": total_count,
        "page_count": page_count,
        "current_page": page,
        "page_size": page_size,
        "has_next": page < page_count,
        "has_previous": page > 1,
        "items": items,
        **kwargs
    }
# api/__init__.py
"""
FastAPI + Redis システム
高速API、ストリーミング応答、セッション管理
目標: <2秒応答、99.5%可用性
"""

from .main import create_app
from .models.requests import *
from .models.responses import *

__all__ = [
    "create_app"
]
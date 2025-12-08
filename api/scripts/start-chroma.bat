@echo off
REM ==============================================
REM ChromaDB Server Startup Script (Windows)
REM ==============================================
REM
REM PURPOSE:
REM - Start ChromaDB server for vector search
REM - Required for Phase 4.1 testing and production
REM
REM USAGE:
REM   start-chroma.bat
REM
REM REQUIREMENTS:
REM - Python 3.8+ installed
REM - chromadb package: pip install chromadb
REM
REM ==============================================

echo [CHROMA] Starting ChromaDB server...
echo [CHROMA] Host: localhost
echo [CHROMA] Port: 8000

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo [ERROR] Install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

REM Check if chromadb is installed
python -c "import chromadb" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] chromadb package not found
    echo [INSTALLING] Installing chromadb...
    pip install chromadb
    if errorlevel 1 (
        echo [ERROR] Failed to install chromadb
        pause
        exit /b 1
    )
)

REM Start ChromaDB server
echo [CHROMA] ChromaDB server starting on http://localhost:8000
echo [CHROMA] Press Ctrl+C to stop

chroma run --host localhost --port 8000

pause

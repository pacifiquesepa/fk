@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo AI Engine virtual environment was not found.
  pause
  exit /b 1
)
.venv\Scripts\python.exe upload_school_books.py
if errorlevel 1 (
  echo.
  echo Upload failed. Keep the AI Engine server running and try again.
)
pause

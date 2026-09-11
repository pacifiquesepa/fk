@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo AI Engine virtual environment was not found.
  pause
  exit /b 1
)
echo Checking FKAMS AI Engine...
powershell -NoProfile -Command "try { Invoke-RestMethod 'http://127.0.0.1:8001/health' -TimeoutSec 3 | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  echo AI Engine is not running. Starting it automatically...
  start "FKAMS AI Engine" /min cmd /c "cd /d ""%~dp0"" && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001"
  echo Waiting for AI Engine startup...
  powershell -NoProfile -Command "$ready=$false; 1..30 | %% { try { Invoke-RestMethod 'http://127.0.0.1:8001/health' -TimeoutSec 2 | Out-Null; $ready=$true; break } catch { Start-Sleep -Seconds 1 } }; if (-not $ready) { exit 1 }"
  if errorlevel 1 (
    echo AI Engine could not start. Check the minimized FKAMS AI Engine window.
    pause
    exit /b 1
  )
)
echo AI Engine is ready. Training question documents...
.venv\Scripts\python.exe upload_school_books.py
if errorlevel 1 (
  echo.
  echo Upload/training failed. Check the messages above.
)
pause

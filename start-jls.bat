@echo off
setlocal

cd /d "%~dp0"

set "PROJECT_DIR=%CD%"
set "APP_URL=http://127.0.0.1:5173/jls-teacher-exam/#/"
set "BUNDLED_NODE=C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "BUNDLED_PNPM=C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"

if exist "%BUNDLED_NODE%\node.exe" (
  set "PATH=%BUNDLED_NODE%;%PATH%"
)

echo.
echo ========================================
echo  JLS start
echo ========================================
echo Project: %PROJECT_DIR%
echo URL:     %APP_URL%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Cannot find Node.js.
  echo Please install Node.js or run this from the Codex desktop environment.
  pause
  exit /b 1
)

if not exist "%PROJECT_DIR%\node_modules\.bin\vite.cmd" (
  echo Vite is not ready.
  echo.
  echo Please run this file first:
  echo   install-jls.bat
  echo.
  echo After it finishes, run start-jls.bat again.
  pause
  exit /b 1
)

echo Closing old dev server on port 5173...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ids = @(Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); foreach ($id in $ids) { try { Stop-Process -Id $id -Force -ErrorAction Stop; Write-Host ('Stopped process ' + $id) } catch { Write-Host ('Could not stop process ' + $id) } }"

echo.
echo Starting JLS...
echo Keep this black window open while using JLS.
echo Browser will open automatically in about 5 seconds.
echo.

start "Open JLS" cmd /c "timeout /t 5 /nobreak >nul && start "" "%APP_URL%""
call "%PROJECT_DIR%\node_modules\.bin\vite.cmd" --host 127.0.0.1

echo.
echo JLS dev server stopped.
pause

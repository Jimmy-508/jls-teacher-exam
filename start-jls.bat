@echo off
setlocal

cd /d "%~dp0"

set "BUNDLED_NODE=C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "BUNDLED_PNPM=C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"

if exist "%BUNDLED_NODE%\node.exe" (
  set "PATH=%BUNDLED_NODE%;%PATH%"
)

echo Starting JLS dev server...
echo Project: %CD%
echo.

if exist "%BUNDLED_PNPM%" (
  "%BUNDLED_PNPM%" run dev --host 127.0.0.1
) else (
  where npm >nul 2>nul
  if errorlevel 1 (
    echo Could not find pnpm or npm.
    echo Please install Node.js, or open this project from Codex again.
    pause
    exit /b 1
  )

  npm run dev -- --host 127.0.0.1
)

pause

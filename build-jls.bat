@echo off
setlocal

cd /d "%~dp0"

set "PROJECT_DIR=%CD%"
set "BUNDLED_NODE=C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "BUNDLED_PNPM=C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"

if exist "%BUNDLED_NODE%\node.exe" (
  set "PATH=%BUNDLED_NODE%;%PATH%"
)

for %%G in ("%ProgramFiles%\Git\cmd" "%ProgramFiles(x86)%\Git\cmd") do (
  if exist "%%~G\git.exe" set "PATH=%%~G;%PATH%"
)

for /d %%G in ("%LOCALAPPDATA%\GitHubDesktop\app-*\resources\app\git\cmd") do (
  if exist "%%~fG\git.exe" set "PATH=%%~fG;%PATH%"
)

echo.
echo ========================================
echo  JLS Production Build
echo ========================================
echo Project: %PROJECT_DIR%
echo Branch:
where git >nul 2>nul
if errorlevel 1 (
  echo   Git not found. Build can still run.
) else (
  git branch --show-current 2>nul
)
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ================================
  echo 找不到 Node.js
  echo 請先安裝 Node.js
  echo ================================
  goto end_fail
)

echo Node.js:
node --version

call :resolve_pnpm
if errorlevel 1 goto end_fail

echo.
echo ========================================
echo 開始建立 Production Build...
echo ========================================
echo.

call "%PNPM_CMD%" build
if errorlevel 1 (
  echo.
  echo Build 失敗
  echo 請檢查上方錯誤訊息。
  goto end_fail
)

echo.
echo ========================================
echo Production Build 完成
echo.
echo 輸出資料夾：
echo dist
echo ========================================

goto end_ok

:resolve_pnpm
if exist "%BUNDLED_PNPM%" (
  set "PNPM_CMD=%BUNDLED_PNPM%"
) else (
  where pnpm >nul 2>nul
  if errorlevel 1 (
    where corepack >nul 2>nul
    if not errorlevel 1 (
      echo 找不到 pnpm，嘗試透過 corepack 啟用 pnpm...
      call corepack enable
      call corepack prepare pnpm@latest --activate
    )
  )

  where pnpm >nul 2>nul
  if errorlevel 1 (
    echo.
    echo ================================
    echo 找不到 pnpm
    echo 請重新執行 install-jls.bat
    echo ================================
    exit /b 1
  )
  set "PNPM_CMD=pnpm"
)

echo pnpm:
call "%PNPM_CMD%" --version
exit /b 0

:end_fail
echo.
pause
exit /b 1

:end_ok
echo.
pause
exit /b 0

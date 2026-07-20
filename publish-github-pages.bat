@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
set "CI=true"

cd /d "%~dp0"

set "PROJECT_DIR=%CD%"
set "PAGES_URL=https://jimmy-508.github.io/jls-teacher-exam/"
set "ACTIONS_URL=https://github.com/Jimmy-508/jls-teacher-exam/actions"
set "BUNDLED_NODE=C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "BUNDLED_PNPM=C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"

if exist "%BUNDLED_NODE%\node.exe" (
  set "PATH=%BUNDLED_NODE%;%PATH%"
)

if exist "%ProgramFiles%\Git\cmd\git.exe" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
if exist "%SystemDrive%\Progra~2\Git\cmd\git.exe" set "PATH=%SystemDrive%\Progra~2\Git\cmd;%PATH%"

for /d %%G in ("%LOCALAPPDATA%\GitHubDesktop\app-*\resources\app\git\cmd") do (
  if exist "%%~fG\git.exe" set "PATH=%%~fG;%PATH%"
)

echo.
echo ========================================
echo  JLS GitHub Pages 發布
echo ========================================
echo Repository 路徑：
echo %PROJECT_DIR%
echo.

call :resolve_git
if errorlevel 1 goto end_fail

git rev-parse --show-toplevel >nul 2>nul
if errorlevel 1 (
  echo 目前資料夾不是 Git Repository。
  goto end_fail
)

for /f "delims=" %%R in ('git rev-parse --show-toplevel 2^>nul') do set "REPO_ROOT=%%R"
echo Repository：
echo %REPO_ROOT%
echo.

for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%B"
if not defined CURRENT_BRANCH set "CURRENT_BRANCH=未知"
echo 目前 Branch：
echo %CURRENT_BRANCH%
echo.

if /i not "%CURRENT_BRANCH%"=="main" (
  echo ================================
  echo 目前不是 main，已停止發布。
  echo 實際分支：%CURRENT_BRANCH%
  echo ================================
  goto end_fail
)

call :check_node
if errorlevel 1 goto end_fail

call :resolve_pnpm
if errorlevel 1 goto end_fail

if not exist "%PROJECT_DIR%\package.json" (
  echo 找不到 package.json，已停止發布。
  goto end_fail
)

if not exist "%PROJECT_DIR%\pnpm-lock.yaml" (
  echo 找不到 pnpm-lock.yaml，已停止發布。
  goto end_fail
)

echo.
echo 檢查未提交變更...
for /f %%C in ('git status --porcelain ^| find /c /v ""') do set "CHANGE_COUNT=%%C"
if not "%CHANGE_COUNT%"=="0" (
  echo.
  echo 偵測到未提交變更，已停止發布。
  echo.
  git status --short
  goto end_fail
)

echo Working tree 乾淨。
echo.
echo 更新 origin 狀態...
git fetch origin
if errorlevel 1 (
  echo git fetch origin 失敗，已停止發布。
  goto end_fail
)

for /f "delims=" %%H in ('git rev-parse HEAD 2^>nul') do set "HEAD_COMMIT=%%H"
for /f "delims=" %%H in ('git rev-parse origin/main 2^>nul') do set "ORIGIN_MAIN_COMMIT=%%H"

if not defined ORIGIN_MAIN_COMMIT (
  echo 找不到 origin/main，已停止發布。
  goto end_fail
)

if /i not "%HEAD_COMMIT%"=="%ORIGIN_MAIN_COMMIT%" (
  echo.
  echo ================================
  echo 本機 main 尚未與 origin/main 同步。
  echo.
  echo 本機 HEAD：
  echo %HEAD_COMMIT%
  echo.
  echo origin/main：
  echo %ORIGIN_MAIN_COMMIT%
  echo.
  echo 請先使用 GitHub Desktop Push origin。
  echo 已停止發布。
  echo ================================
  goto end_fail
)

echo 本機 main 已與 origin/main 同步。
echo.
echo ========================================
echo 開始建立 Production Build...
echo ========================================
call "%PNPM_CMD%" build
if errorlevel 1 (
  echo.
  echo Build 失敗，停止發布。
  goto end_fail
)

if exist "%PROJECT_DIR%\.github\workflows\deploy.yml" (
  echo.
  echo 偵測到 GitHub Actions deploy.yml。
  echo main 已推送，GitHub Actions 將自動部署。
  echo.
  echo 正在開啟 GitHub Actions...
  start "" "%ACTIONS_URL%"
  echo.
  echo GitHub Pages 網址：
  echo %PAGES_URL%
  goto end_ok
)

if exist "%PROJECT_DIR%\package.json" (
  findstr /c:"\"deploy\"" "%PROJECT_DIR%\package.json" >nul 2>nul
  if not errorlevel 1 (
    echo.
    echo 偵測到 package.json deploy script。
    echo 請確認專案發布策略後手動執行 deploy。
    echo 本工具未自動執行，避免誤發布。
    goto end_ok
  )
)

echo.
echo 找不到可自動判斷的 GitHub Pages 部署方式。
echo Build 已成功，但未執行發布。
goto end_ok

:resolve_git
where git >nul 2>nul
if errorlevel 1 (
  echo 找不到 Git，無法發布。
  echo 已檢查路徑：
  echo %ProgramFiles%\Git\cmd
  echo %SystemDrive%\Progra~2\Git\cmd
  echo %LOCALAPPDATA%\GitHubDesktop\app-*\resources\app\git\cmd
  exit /b 1
)

echo Git：
git --version
exit /b 0

:check_node
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo ================================
  echo 找不到 Node.js
  echo 請先安裝 Node.js
  echo ================================
  exit /b 1
)

echo.
echo Node.js：
node --version
exit /b 0

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

echo.
echo pnpm：
call "%PNPM_CMD%" --version
exit /b 0

:end_fail
echo.
pause
exit /b 1

:end_ok
echo.
echo ========================================
echo 發布檢查流程完成
echo ========================================
echo.
pause
exit /b 0

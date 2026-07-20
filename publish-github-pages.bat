@echo off
chcp 65001 >nul
setlocal EnableExtensions
set "CI=true"

cd /d "%~dp0"
set "PROJECT_DIR=%CD%"
set "PAGES_URL=https://jimmy-508.github.io/jls-teacher-exam/"

echo.
echo ========================================
echo  JLS GitHub Pages 發布
echo ========================================
echo Repository 路徑：
echo %PROJECT_DIR%
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo 找不到 Git，無法發布。
  goto end_fail
)

git rev-parse --show-toplevel >nul 2>nul
if errorlevel 1 (
  echo 目前資料夾不是 Git Repository。
  goto end_fail
)

for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%B"
if not defined CURRENT_BRANCH set "CURRENT_BRANCH=未知"
echo 目前 Branch：%CURRENT_BRANCH%

if /i not "%CURRENT_BRANCH%"=="main" (
  echo.
  echo ================================
  echo 目前不是 main。
  echo.
  echo 是否仍要發布？
  echo Y/N
  echo ================================
  choice /c YN /n /m "請選擇："
  if errorlevel 2 (
    echo 已取消發布。
    goto end_ok
  )
)

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo ================================
  echo 找不到 Node.js
  echo 請先安裝 Node.js
  echo ================================
  goto end_fail
)
node --version

call :check_pnpm
if errorlevel 1 goto end_fail

echo.
echo 開始建立 Production Build...
call "%PNPM_CMD%" build
if errorlevel 1 (
  echo.
  echo Build 失敗，停止發布。
  goto end_fail
)

echo.
echo 檢查 Git 狀態...
git status --short
if errorlevel 1 goto end_fail

for /f %%C in ('git status --porcelain ^| find /c /v ""') do set "CHANGE_COUNT=%%C"
if not "%CHANGE_COUNT%"=="0" (
  echo.
  echo 請先 Commit。
  echo 目前仍有尚未提交的變更，已停止發布。
  goto end_fail
)

echo.
echo 正在推送目前分支...
git push
if errorlevel 1 (
  echo.
  echo git push 失敗，請檢查上方錯誤訊息。
  goto end_fail
)

where gh >nul 2>nul
if not errorlevel 1 (
  echo.
  echo 偵測到 GitHub CLI，嘗試等待最新 Workflow 完成...
  gh run watch --exit-status
) else (
  echo.
  echo 找不到 GitHub CLI，略過自動等待 GitHub Actions。
  echo 請到 GitHub Actions 頁面確認部署狀態。
)

echo.
echo 正在開啟 GitHub Pages...
start "" "%PAGES_URL%"

echo.
echo ========================================
echo GitHub Pages 發布流程完成
echo ========================================
goto end_ok

:check_pnpm
where pnpm >nul 2>nul
if not errorlevel 1 (
  for /f "delims=" %%P in ('where pnpm') do (
    if not defined PNPM_CMD set "PNPM_CMD=%%P"
  )
  echo pnpm version:
  call "%PNPM_CMD%" --version
  exit /b 0
)

where corepack >nul 2>nul
if not errorlevel 1 (
  echo 找不到 pnpm，嘗試透過 corepack 啟用 pnpm...
  call corepack enable
  call corepack prepare pnpm@latest --activate
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

for /f "delims=" %%P in ('where pnpm') do (
  if not defined PNPM_CMD set "PNPM_CMD=%%P"
)
echo pnpm version:
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

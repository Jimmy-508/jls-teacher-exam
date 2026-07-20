@echo off
chcp 65001 >nul
setlocal EnableExtensions
set "CI=true"

cd /d "%~dp0"
set "PROJECT_DIR=%CD%"

echo.
echo ========================================
echo JLS Production Build
echo ========================================
echo Repository path:
echo %PROJECT_DIR%
echo.
echo Current branch:
git branch --show-current 2>nul
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo ================================
  echo 找不到 Node.js
  echo 請先安裝 Node.js
  echo ================================
  goto end_fail
)
echo Node.js version:
node --version

call :check_pnpm
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

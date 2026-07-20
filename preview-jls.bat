@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"

set "PROJECT_DIR=%CD%"
set "PREVIEW_LOG=%PROJECT_DIR%\.jls-preview.log"
set "PREVIEW_ERR=%PROJECT_DIR%\.jls-preview.err.log"
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
echo  JLS Production Preview
echo ========================================
echo Project: %PROJECT_DIR%
echo Branch:
where git >nul 2>nul
if errorlevel 1 (
  echo   Git not found. Preview can still run.
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

if not exist "%PROJECT_DIR%\node_modules\.bin\vite.cmd" (
  echo Vite is not ready.
  echo.
  echo Please run this file first:
  echo   install-jls.bat
  goto end_fail
)

if not exist "%PROJECT_DIR%\dist\" (
  echo.
  echo ================================
  echo 尚未建立 Build。
  echo.
  echo 是否立即建立？
  echo Y/N
  echo ================================
  choice /c YN /n /m "請選擇："
  if errorlevel 2 (
    echo 已取消。
    goto end_ok
  )

  echo.
  echo 開始建立 Production Build...
  call "%PNPM_CMD%" build
  if errorlevel 1 (
    echo.
    echo Build 失敗，無法啟動 Preview。
    goto end_fail
  )
)

echo.
echo Closing old preview server on common Vite preview ports...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports = @(4173,4174,4175); foreach ($port in $ports) { $ids = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); foreach ($id in $ids) { try { Stop-Process -Id $id -Force -ErrorAction Stop; Write-Host ('Stopped preview process ' + $id + ' on port ' + $port) } catch { Write-Host ('Could not stop process ' + $id) } } }"

if exist "%PREVIEW_LOG%" del "%PREVIEW_LOG%" >nul 2>nul
if exist "%PREVIEW_ERR%" del "%PREVIEW_ERR%" >nul 2>nul

echo.
echo Starting production preview...
echo Keep this black window open while validating PWA.
echo.

start "JLS Preview Server" /b cmd /c ""%PROJECT_DIR%\node_modules\.bin\vite.cmd" preview --configLoader runner > "%PREVIEW_LOG%" 2> "%PREVIEW_ERR%""

set "PREVIEW_URL="
for /l %%I in (1,1,80) do (
  for /f "usebackq delims=" %%U in (`node -e "const fs=require('fs'); const file='.jls-preview.log'; const text=fs.existsSync(file)?fs.readFileSync(file,'utf8').replace(/\x1b\[[0-9;]*m/g,''):''; const match=text.match(/Local:\s+(https?:\/\/\S+)/); if(match) console.log(match[1]);"`) do set "PREVIEW_URL=%%U"
  if defined PREVIEW_URL goto preview_ready
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 1" >nul
)

echo.
echo Preview 啟動失敗，未取得 Local URL。
if exist "%PREVIEW_LOG%" type "%PREVIEW_LOG%"
if exist "%PREVIEW_ERR%" type "%PREVIEW_ERR%"
goto end_fail

:preview_ready
echo.
echo ========================================
echo Production Preview 已啟動
echo.
echo 請使用：
echo Chrome
echo Application
echo Manifest
echo 驗證 PWA。
echo.
echo URL:
echo %PREVIEW_URL%
echo ========================================
start "" "%PREVIEW_URL%"
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

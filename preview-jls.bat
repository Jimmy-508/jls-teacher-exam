@echo off
chcp 65001 >nul
setlocal EnableExtensions
set "CI=true"

cd /d "%~dp0"
set "PROJECT_DIR=%CD%"
set "PREVIEW_LOG=%PROJECT_DIR%\.jls-preview.log"
set "PREVIEW_PID=%PROJECT_DIR%\.jls-preview.pid"

powershell -NoProfile -ExecutionPolicy Bypass -Command "Write-Host ''; Write-Host '========================================'; Write-Host ' JLS Production Preview'; Write-Host '========================================'; Write-Host 'Repository 路徑：'; Write-Host (Get-Location).Path; if (Get-Command git -ErrorAction SilentlyContinue) { Write-Host ('目前 Branch：' + (& git branch --show-current 2>$null)) } else { Write-Host '目前 Branch：無法偵測，找不到 Git' }"

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
echo 正在關閉舊的 Production Preview...
if exist "%PREVIEW_PID%" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$pidFile = Join-Path (Get-Location).Path '.jls-preview.pid'; try { $id = [int](Get-Content -LiteralPath $pidFile -Raw); Stop-Process -Id $id -Force -ErrorAction Stop; Write-Host ('已結束舊 Preview：' + $id) } catch { Write-Host '找不到舊 Preview 或已結束。' }"
  del "%PREVIEW_PID%" >nul 2>nul
)

if exist "%PREVIEW_LOG%" del "%PREVIEW_LOG%" >nul 2>nul

echo.
echo 正在啟動 pnpm preview...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$repo = (Get-Location).Path; $log = Join-Path $repo '.jls-preview.log'; $pidFile = Join-Path $repo '.jls-preview.pid'; $command = $env:PNPM_CMD; if (-not $command) { $command = 'pnpm' }; $argument = '/d /s /c ""' + $command + '" preview > "' + $log + '" 2>&1"'; $process = Start-Process -FilePath $env:ComSpec -ArgumentList $argument -WorkingDirectory $repo -WindowStyle Hidden -PassThru; Set-Content -LiteralPath $pidFile -Value $process.Id -Encoding ASCII; $url = $null; for ($i = 0; $i -lt 80; $i++) { if (Test-Path -LiteralPath $log) { $text = Get-Content -LiteralPath $log -Raw -ErrorAction SilentlyContinue; if ($text -match 'Local:\s+(https?://\S+)') { $url = $Matches[1]; break } }; Start-Sleep -Milliseconds 500 }; if ($url) { Write-Host ''; Write-Host '================================'; Write-Host 'Production Preview 已啟動'; Write-Host ''; Write-Host '請使用：'; Write-Host 'Chrome'; Write-Host 'Application'; Write-Host 'Manifest'; Write-Host '驗證 PWA。'; Write-Host ''; Write-Host '網址：'; Write-Host $url; Write-Host '================================'; Start-Process $url; exit 0 }; Write-Host ''; Write-Host 'Preview 啟動失敗，未取得 Local URL。'; if (Test-Path -LiteralPath $log) { Get-Content -LiteralPath $log }; exit 1"
if errorlevel 1 goto end_fail

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

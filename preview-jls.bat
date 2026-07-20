@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "CI=true"
cd /d "%~dp0"
set "PROJECT_DIR=%CD%"
set "PREVIEW_LOG=%PROJECT_DIR%\.jls-preview.log"
set "PREVIEW_ERR=%PROJECT_DIR%\.jls-preview.err.log"

call "scripts\init-env.bat"
if errorlevel 2 goto no_pnpm

echo(
echo(========================================
echo( JLS Production Preview
echo(========================================
echo(Project: %PROJECT_DIR%
echo(Branch:
where git >nul 2>nul && git branch --show-current 2>nul || echo(  Git not found. Preview can still run.
echo(

where node >nul 2>nul || goto no_node
echo(Node.js:
node --version

echo(pnpm:
call "%PNPM_CMD%" --version

if not exist "%PROJECT_DIR%\node_modules\.bin\vite.cmd" (
  echo(Vite is not ready.
  echo(Please run install-jls.bat first.
  goto end_fail
)

if not exist "%PROJECT_DIR%\dist\" (
  echo(
  echo(========================================
  echo(Build output does not exist.
  echo(Build now? Y/N
  echo(========================================
  choice /c YN /n /m "Choose: "
  if errorlevel 2 goto end_ok
  call :run_build
  if errorlevel 1 goto end_fail
)

echo(
echo(Closing old preview server on common Vite preview ports...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports = @(4173,4174,4175); foreach ($port in $ports) { $ids = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); foreach ($id in $ids) { try { Stop-Process -Id $id -Force -ErrorAction Stop; Write-Host ('Stopped preview process ' + $id + ' on port ' + $port) } catch { Write-Host ('Could not stop process ' + $id) } } }"

if exist "%PREVIEW_LOG%" del "%PREVIEW_LOG%" >nul 2>nul
if exist "%PREVIEW_ERR%" del "%PREVIEW_ERR%" >nul 2>nul

echo(
echo(Starting production preview...
echo(Keep this window open while validating PWA.
start "JLS Preview Server" /b cmd /c ""%PROJECT_DIR%\node_modules\.bin\vite.cmd" preview --configLoader runner > "%PREVIEW_LOG%" 2> "%PREVIEW_ERR%""

set "PREVIEW_URL="
for /l %%I in (1,1,80) do (
  for /f "usebackq delims=" %%U in (`node -e "const fs=require('fs'); const file='.jls-preview.log'; const text=fs.existsSync(file)?fs.readFileSync(file,'utf8').replace(/\x1b\[[0-9;]*m/g,''):''; const match=text.match(/Local:\s+(https?:\/\/\S+)/); if(match) console.log(match[1]);"`) do set "PREVIEW_URL=%%U"
  if defined PREVIEW_URL goto preview_ready
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 1" >nul
)

echo(
echo(Preview failed; Local URL was not found.
if exist "%PREVIEW_LOG%" type "%PREVIEW_LOG%"
if exist "%PREVIEW_ERR%" type "%PREVIEW_ERR%"
goto end_fail

:preview_ready
echo(
echo(========================================
echo(Production Preview is running.
echo(Use Chrome Application / Manifest to validate PWA.
echo(URL: %PREVIEW_URL%
echo(========================================
start "" "%PREVIEW_URL%"
goto end_ok

:run_build
if exist "%PROJECT_DIR%\node_modules\.bin\tsc.cmd" if exist "%PROJECT_DIR%\node_modules\.bin\vite.cmd" (
  call "%PROJECT_DIR%\node_modules\.bin\tsc.cmd" -b
  if errorlevel 1 exit /b 1
  call "%PROJECT_DIR%\node_modules\.bin\vite.cmd" build --configLoader runner
  exit /b %ERRORLEVEL%
)
call "%PNPM_CMD%" build
exit /b %ERRORLEVEL%

:no_node
echo(
echo(========================================
echo(Node.js not found.
echo(Please install Node.js first.
echo(========================================
goto end_fail

:no_pnpm
echo(
echo(========================================
echo(pnpm not found.
echo(Please run install-jls.bat again.
echo(========================================
goto end_fail

:end_fail
echo(
pause
exit /b 1

:end_ok
echo(
pause
exit /b 0
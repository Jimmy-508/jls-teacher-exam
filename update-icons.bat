@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "CI=true"
cd /d "%~dp0"
set "PROJECT_DIR=%CD%"
set "BACKUP_DIR=%PROJECT_DIR%\.temp-icon-backup"

call "scripts\init-env.bat"
if errorlevel 2 goto no_pnpm

echo(
echo(========================================
echo( JLS Icon Update Tool
echo(========================================
echo(Repository:
echo(%PROJECT_DIR%
echo(Source:
echo(icon-source.png
echo(

where node >nul 2>nul || goto no_node
if not exist "%PROJECT_DIR%\package.json" goto no_package
if not exist "%PROJECT_DIR%\scripts\generate-icons.mjs" goto no_generator
if not exist "%PROJECT_DIR%\icon-source.png" goto no_source

echo(Node.js:
node --version
echo(pnpm:
call "%PNPM_CMD%" --version

if exist "%BACKUP_DIR%" rmdir /s /q "%BACKUP_DIR%"
mkdir "%BACKUP_DIR%" >nul 2>nul

for %%I in (favicon.png apple-touch-icon.png pwa-192x192.png pwa-512x512.png pwa-maskable-192x192.png pwa-maskable-512x512.png jls-icon-192.png jls-icon-512.png jls-maskable-512.png) do (
  if exist "%PROJECT_DIR%\public\icons\%%I" copy /y "%PROJECT_DIR%\public\icons\%%I" "%BACKUP_DIR%\%%I" >nul
)

echo(
echo(Generating icons...
node "%PROJECT_DIR%\scripts\generate-icons.mjs"
if errorlevel 1 goto restore_icons

echo(
echo(Validating production build...
call :run_build
if errorlevel 1 goto restore_icons

if exist "%BACKUP_DIR%" rmdir /s /q "%BACKUP_DIR%"

echo(
echo(========================================
echo(JLS icons updated successfully.
echo(Generated:
echo(favicon
echo(Apple Touch Icon
echo(PWA 192
echo(PWA 512
echo(Maskable 192
echo(Maskable 512
echo(Production Build: OK
echo(========================================
echo(
choice /c YN /n /m "Open Production Preview now? Y/N: "
if errorlevel 2 goto end_ok
call "preview-jls.bat"
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

:restore_icons
echo(
echo(Icon update failed. Restoring previous icons...
for %%I in (favicon.png apple-touch-icon.png pwa-192x192.png pwa-512x512.png pwa-maskable-192x192.png pwa-maskable-512x512.png jls-icon-192.png jls-icon-512.png jls-maskable-512.png) do (
  if exist "%BACKUP_DIR%\%%I" copy /y "%BACKUP_DIR%\%%I" "%PROJECT_DIR%\public\icons\%%I" >nul
)
echo(Previous icons restored. Build was not published.
goto end_fail

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

:no_package
echo(package.json not found. Please run this BAT from the JLS repository root.
goto end_fail

:no_generator
echo(scripts\generate-icons.mjs not found.
goto end_fail

:no_source
echo(
echo(========================================
echo(Missing icon source file:
echo(icon-source.png
echo(
echo(Please put your PNG icon in the JLS repository root and rename it to icon-source.png.
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
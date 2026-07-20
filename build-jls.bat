@echo off
setlocal EnableExtensions
set "CI=true"
cd /d "%~dp0"
set "PROJECT_DIR=%CD%"

call "scripts\init-env.bat"
if errorlevel 2 goto no_pnpm

echo(
echo(========================================
echo( JLS Production Build
echo(========================================
echo(Project: %PROJECT_DIR%
echo(Branch:
where git >nul 2>nul && git branch --show-current 2>nul || echo(  Git not found. Build can still run.
echo(

where node >nul 2>nul || goto no_node
echo(Node.js:
node --version

echo(pnpm:
call "%PNPM_CMD%" --version

echo(
echo(========================================
echo(Starting Production Build...
echo(========================================
echo(

call :run_build
if errorlevel 1 (
  echo(
  echo(Build failed.
  echo(Please check the error messages above.
  goto end_fail
)

echo(
echo(========================================
echo(Production Build complete.
echo(Output folder: dist
echo(========================================
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
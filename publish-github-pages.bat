@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "CI=true"
cd /d "%~dp0"
set "PROJECT_DIR=%CD%"
set "PAGES_URL=https://jimmy-508.github.io/jls-teacher-exam/"
set "ACTIONS_URL=https://github.com/Jimmy-508/jls-teacher-exam/actions"

call "scripts\init-env.bat"
if errorlevel 2 goto no_pnpm

echo(
echo(========================================
echo( JLS GitHub Pages Publish
echo(========================================
echo(Repository path:
echo(%PROJECT_DIR%
echo(

where git >nul 2>nul || goto no_git
echo(Git:
git --version

git rev-parse --show-toplevel >nul 2>nul || goto not_repo
for /f "delims=" %%R in ('git rev-parse --show-toplevel 2^>nul') do set "REPO_ROOT=%%R"
echo(Repository:
echo(%REPO_ROOT%
echo(

for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%B"
if not defined CURRENT_BRANCH set "CURRENT_BRANCH=unknown"
echo(Current branch:
echo(%CURRENT_BRANCH%
echo(

if /i not "%CURRENT_BRANCH%"=="main" (
  echo(========================================
  echo(Current branch is not main. Publish stopped.
  echo(Actual branch: %CURRENT_BRANCH%
  echo(========================================
  goto end_fail
)

where node >nul 2>nul || goto no_node
echo(Node.js:
node --version

echo(pnpm:
call "%PNPM_CMD%" --version

if not exist "%PROJECT_DIR%\package.json" (
  echo(package.json not found. Publish stopped.
  goto end_fail
)
if not exist "%PROJECT_DIR%\pnpm-lock.yaml" (
  echo(pnpm-lock.yaml not found. Publish stopped.
  goto end_fail
)

echo(
echo(Checking uncommitted changes...
for /f %%C in ('git status --porcelain ^| find /c /v ""') do set "CHANGE_COUNT=%%C"
if not "%CHANGE_COUNT%"=="0" (
  echo(
  echo(Uncommitted changes detected. Publish stopped.
  git status --short
  goto end_fail
)
echo(Working tree is clean.

echo(
echo(Fetching origin...
git fetch origin
if errorlevel 1 (
  echo(git fetch origin failed. Publish stopped.
  goto end_fail
)
for /f "delims=" %%H in ('git rev-parse HEAD 2^>nul') do set "HEAD_COMMIT=%%H"
for /f "delims=" %%H in ('git rev-parse origin/main 2^>nul') do set "ORIGIN_MAIN_COMMIT=%%H"
if not defined ORIGIN_MAIN_COMMIT (
  echo(origin/main not found. Publish stopped.
  goto end_fail
)
if /i not "%HEAD_COMMIT%"=="%ORIGIN_MAIN_COMMIT%" (
  echo(
  echo(========================================
  echo(Local main is not synced with origin/main.
  echo(Local HEAD:
  echo(%HEAD_COMMIT%
  echo(origin/main:
  echo(%ORIGIN_MAIN_COMMIT%
  echo(Please Push origin from GitHub Desktop first.
  echo(========================================
  goto end_fail
)
echo(Local main is synced with origin/main.

echo(
echo(========================================
echo(Starting Production Build...
echo(========================================
call :run_build
if errorlevel 1 (
  echo(Build failed. Publish stopped.
  goto end_fail
)

if exist "%PROJECT_DIR%\.github\workflows\deploy.yml" (
  echo(
  echo(GitHub Actions deploy.yml detected.
  echo(main is already pushed. GitHub Actions will deploy automatically.
  echo(Opening GitHub Actions...
  start "" "%ACTIONS_URL%"
  echo(GitHub Pages URL:
  echo(%PAGES_URL%
  goto end_ok
)

echo(No deploy.yml found. Build completed, but no publish action was run.
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

:no_git
echo(Git not found. Publish stopped.
echo(Checked Program Files Git, Program Files x86 Git, and GitHub Desktop Git.
goto end_fail

:not_repo
echo(Current folder is not a Git repository.
goto end_fail

:no_node
echo(Node.js not found. Please install Node.js first.
goto end_fail

:no_pnpm
echo(pnpm not found. Please run install-jls.bat again.
goto end_fail

:end_fail
echo(
pause
exit /b 1

:end_ok
echo(
echo(========================================
echo(Publish check complete.
echo(========================================
echo(
pause
exit /b 0
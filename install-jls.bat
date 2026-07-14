@echo off
setlocal

cd /d "%~dp0"

set "PROJECT_DIR=%CD%"
set "BUNDLED_NODE=C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "BUNDLED_PNPM=C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"

if exist "%BUNDLED_NODE%\node.exe" (
  set "PATH=%BUNDLED_NODE%;%PATH%"
)

echo.
echo ========================================
echo  JLS dependency repair
echo ========================================
echo Project: %PROJECT_DIR%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Cannot find Node.js.
  echo Please install Node.js first.
  pause
  exit /b 1
)

node --version

if exist "%BUNDLED_PNPM%" (
  set "PNPM_CMD=%BUNDLED_PNPM%"
) else (
  where pnpm >nul 2>nul
  if errorlevel 1 (
    echo Cannot find pnpm.
    echo Please install pnpm or run this from Codex desktop.
    pause
    exit /b 1
  )
  set "PNPM_CMD=pnpm"
)

echo.
echo Removing broken node_modules links...
if exist "%PROJECT_DIR%\node_modules" (
  rmdir /s /q "%PROJECT_DIR%\node_modules"
)

echo.
echo Installing dependencies.
echo This may take a few minutes. Please wait until you see "Install finished."
echo.
call "%PNPM_CMD%" install
if errorlevel 1 (
  echo.
  echo Install failed.
  echo Please check your internet connection, then run install-jls.bat again.
  pause
  exit /b 1
)

if not exist "%PROJECT_DIR%\node_modules\.bin\vite.cmd" (
  echo.
  echo Install finished, but Vite still was not linked correctly.
  echo Please tell Codex: "install-jls finished but vite.cmd is missing."
  pause
  exit /b 1
)

echo.
echo Install finished.
echo Now run start-jls.bat.
pause

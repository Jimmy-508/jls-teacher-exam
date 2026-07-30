@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"
echo ========================================
echo JLS default question bank quick update
echo ========================================
echo Repository: %CD%
echo.
if not exist "scripts\init-env.bat" (
  echo Missing scripts\init-env.bat.
  pause
  exit /b 1
)
call "scripts\init-env.bat"
if errorlevel 1 (
  echo Environment initialization failed. Please check Node.js, pnpm and Git.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\update-default-question-bank.ps1"
set "JLS_EXIT_CODE=%ERRORLEVEL%"
echo.
pause
exit /b %JLS_EXIT_CODE%

@echo off
chcp 65001 >nul
setlocal EnableExtensions

cd /d "%~dp0"
set "PROJECT_DIR=%CD%"
set "HAS_WARNING=0"

echo.
echo ========================================
echo JLS 環境檢查
echo ========================================
echo Repository path:
echo %PROJECT_DIR%
echo.

where node >nul 2>nul
if errorlevel 1 (echo Node.js：找不到& set "HAS_WARNING=1") else (echo Node.js version:& node --version)

where pnpm >nul 2>nul
if errorlevel 1 (echo pnpm：找不到& set "HAS_WARNING=1") else (echo pnpm version:& call pnpm --version)

where git >nul 2>nul
if errorlevel 1 (echo Git：找不到& set "HAS_WARNING=1") else (echo Git version:& git --version)

echo.
echo Current branch:
git branch --show-current 2>nul
echo Current commit:
git rev-parse --short HEAD 2>nul
echo.
echo Git Status:
git status --short 2>nul

echo.
if exist package.json (echo package.json：存在) else (echo package.json：不存在& set "HAS_WARNING=1")
if exist pnpm-lock.yaml (echo pnpm-lock.yaml：存在) else (echo pnpm-lock.yaml：不存在& set "HAS_WARNING=1")
if exist node_modules\ (echo node_modules：存在) else (echo node_modules：不存在& set "HAS_WARNING=1")
if exist dist\ (echo dist：存在) else (echo dist：不存在& set "HAS_WARNING=1")
if exist dist\manifest.webmanifest (echo Manifest：存在) else (echo Manifest：不存在& set "HAS_WARNING=1")
if exist dist\sw.js (echo Service Worker：存在) else (echo Service Worker：不存在& set "HAS_WARNING=1")
if exist public\questions.csv (echo public/questions.csv：存在) else (echo public/questions.csv：不存在& set "HAS_WARNING=1")

echo.
if "%HAS_WARNING%"=="0" (
  echo ========================================
  echo JLS 環境正常
  echo ========================================
) else (
  echo ========================================
  echo 請依提示修正
  echo ========================================
)

echo.
pause
exit /b 0

@echo off
chcp 65001 >nul

set "JLS_BUNDLED_NODE=C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "JLS_BUNDLED_PNPM=C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"

if exist "%JLS_BUNDLED_NODE%\node.exe" set "PATH=%JLS_BUNDLED_NODE%;%PATH%"

if exist "%ProgramFiles%\Git\cmd\git.exe" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
if exist "%SystemDrive%\Progra~2\Git\cmd\git.exe" set "PATH=%SystemDrive%\Progra~2\Git\cmd;%PATH%"

for /d %%G in ("%LOCALAPPDATA%\GitHubDesktop\app-*\resources\app\git\cmd") do (
  if exist "%%~fG\git.exe" set "PATH=%%~fG;%PATH%"
)

if exist "%JLS_BUNDLED_PNPM%" (
  set "PNPM_CMD=%JLS_BUNDLED_PNPM%"
) else (
  where pnpm >nul 2>nul
  if errorlevel 1 (
    where corepack >nul 2>nul
    if not errorlevel 1 (
      call corepack enable >nul 2>nul
      call corepack prepare pnpm@latest --activate >nul 2>nul
    )
  )
  where pnpm >nul 2>nul
  if errorlevel 1 exit /b 2
  set "PNPM_CMD=pnpm"
)

exit /b 0
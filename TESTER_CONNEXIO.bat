@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Connexio - Test en un clic
cd /d "%~dp0"

echo.
echo ========================================================
echo   CONNEXIO BY NEPTUNE - TEST WEB EN UN CLIC
echo ========================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Node.js n'est pas installe sur cet ordinateur.
  echo Installez Node.js 22.13 ou plus, puis relancez ce fichier.
  start "" "https://nodejs.org/en/download"
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%V in ('node -p "process.versions.node"') do set NODE_MAJOR=%%V
if %NODE_MAJOR% LSS 22 (
  echo [ERREUR] Node.js est trop ancien.
  echo Version detectee :
  node --version
  echo Installez Node.js 22.13 ou plus, puis relancez ce fichier.
  start "" "https://nodejs.org/en/download"
  pause
  exit /b 1
)

set EXPO_PUBLIC_MOCK_MODE=true
set EXPO_PUBLIC_GITHUB_PAGES=false
set EXPO_PUBLIC_API_BASE_URL=https://api.example.com
set EXPO_PUBLIC_REALTIME_URL=wss://api.example.com/v1/realtime
set EXPO_PUBLIC_EAS_PROJECT_ID=

if not exist "node_modules\expo\package.json" (
  echo [1/2] Installation securisee des dependances...
  call npm ci --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo [ERREUR] L'installation a echoue. Consultez les lignes ci-dessus.
    pause
    exit /b 1
  )
) else (
  echo [1/2] Dependances deja installees.
)

echo [2/2] Demarrage de Connexio en mode demonstration...
echo Le navigateur va s'ouvrir automatiquement sur http://localhost:8081

echo.
start "" powershell -NoProfile -WindowStyle Hidden -Command "$u='http://localhost:8081'; for($i=0;$i -lt 90;$i++){ try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 $u ^| Out-Null; Start-Process $u; exit } catch { Start-Sleep -Seconds 1 } }"

call npx expo start --web --clear --port 8081

if errorlevel 1 (
  echo.
  echo [ERREUR] Connexio n'a pas pu demarrer.
  pause
  exit /b 1
)

endlocal

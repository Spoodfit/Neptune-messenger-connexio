@echo off
setlocal
cd /d "%~dp0"
title Connexio - Apercu telephone

echo.
echo ==============================================
echo   CONNEXIO - PREVISUALISATION TELEPHONE
 echo ==============================================
echo.
echo 1. Installez l'application Expo Go sur votre telephone.
echo 2. Le terminal affichera un QR code.
echo 3. Scannez-le avec Expo Go ou l'appareil photo.
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js n'est pas installe sur cet ordinateur.
  echo La page de telechargement va s'ouvrir.
  start "" "https://nodejs.org/en/download"
  echo.
  echo Installez la version LTS, puis relancez ce fichier.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installation initiale des dependances...
  call npm install
  if errorlevel 1 goto :error
)

echo Lancement du tunnel securise Expo...
call npm run start:tunnel
if errorlevel 1 goto :error
exit /b 0

:error
echo.
echo Une erreur a bloque le lancement. Copiez le texte affiche dans cette fenetre.
pause
exit /b 1

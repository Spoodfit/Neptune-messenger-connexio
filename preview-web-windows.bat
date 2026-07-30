@echo off
setlocal
cd /d "%~dp0"
title Connexio - Apercu navigateur

echo.
echo ==============================================
echo   CONNEXIO - PREVISUALISATION NAVIGATEUR
 echo ==============================================
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
  echo [1/3] Installation initiale des dependances...
  call npm install
  if errorlevel 1 goto :error
) else (
  echo [1/3] Dependances deja installees.
)

echo [2/3] Preparation de la version web...
call npm run web:setup
if errorlevel 1 goto :error

echo [3/3] Lancement de Connexio dans le navigateur...
echo La page s'ouvrira automatiquement. Pour arreter, fermez cette fenetre.
call npm run web
if errorlevel 1 goto :error
exit /b 0

:error
echo.
echo Une erreur a bloque le lancement. Copiez le texte affiche dans cette fenetre.
pause
exit /b 1

@echo off
:: AutoBot — Sincronización e Inicio (Optimizado para Windows)
chcp 65001 >nul
title AutoBot v1.1.0 — Seidor Peru

echo ----------------------------------------
echo          AutoBot v1.1.0
echo          Seidor Peru
echo ----------------------------------------
echo.

cd /d "%~dp0"

:: Sincronizar con el repositorio (Git Pull)
echo [INFO] Detectando rama actual...
for /f "tokens=*" %%b in ('git branch --show-current') do set CURRENT_BRANCH=%%b
echo [INFO] Rama detectada: %CURRENT_BRANCH%
echo [INFO] Sincronizando scripts desde el servidor...
git pull origin %CURRENT_BRANCH%
echo.

::# Verificar que Node.js esté instalado
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo 🔍 Node.js no detectado. Intentando instalar vía winget...
  where winget >nul 2>nul
  if %ERRORLEVEL% eq 0 (
    echo 📦 Instalando Node.js (OpenJS.NodeJS)...
    winget install OpenJS.NodeJS --silent --accept-package-agreements --accept-source-agreements
    if %ERRORLEVEL% eq 0 (
      echo ✅ Node.js instalado con éxito. 
      echo ⚠️ IMPORTANTE: Debes CERRAR esta ventana y VOLVER ABRIR autobot.bat para que Windows reconozca Node.
      pause
      exit /b 0
    )
  )
  echo ❌ No se pudo instalar Node.js automáticamente.
  echo    Por favor, descárgalo manualmente en: https://nodejs.org
  pause
  exit /b 1
)

:: Verificar version minima para Vite (20.19.0)
for /f "delims=v" %%v in ('node -v') do set FULL_VERSION=%%v
echo [OK] Node.js detectado (v%FULL_VERSION%).
echo      Nota: Si el Dashboard falla, asegúrate de tener Node v20.19 o superior.
echo.

:: Instalar dependencias del servidor si faltan
if not exist "node_modules\" (
    echo [INFO] Instalando dependencias del servidor (primera vez)...
    call npm install
)

:: Instalar dependencias del dashboard si faltan
if not exist "ui\node_modules\" (
    echo [INFO] Instalando dependencias del dashboard (primera vez)...
    cd ui
    call npm install
    cd ..
)

:: --- SOLUCION AL ERROR EPERM / VITE CACHE ---
echo [INFO] Limpiando cache de interfaz...
if exist "ui\node_modules\.vite" (
    rmdir /s /q "ui\node_modules\.vite" >nul 2>nul
)

:: Verificar e instalar Playwright Chromium
echo [INFO] Verificando Playwright Chromium...
:: Playwright es idempotente, lo ejecutamos directamente para asegurar que las dependencias esten OK en Windows
call node_modules\.bin\playwright.cmd install chromium
echo.

echo [OK] Iniciando AutoBot...
echo      Dashboard: http://localhost:5173
echo      Backend:   http://localhost:3001
echo.
echo      Cierra esta ventana para detener AutoBot.
echo.

:: Abrir Google Chrome automáticamente después de 4 segundos
start "" /b cmd /c "timeout /t 4 >nul & start chrome http://localhost:5173"

:: Lanzar servidor + UI
call npm start

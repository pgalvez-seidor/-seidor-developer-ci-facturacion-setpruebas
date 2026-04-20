@echo off
:: AutoBot — Sincronización e Inicio
title AutoBot v1.1.0 — Seidor Peru

echo ----------------------------------------
echo          AutoBot v1.1.0
echo          Seidor Peru
echo ----------------------------------------
echo.

cd /d "%~dp0"

:: Sincronizar con el repositorio (Git Pull)
echo [INFO] Sincronizando scripts con el servidor...
git fetch --all >nul 2>&1
git pull
if %ERRORLEVEL% neq 0 (
    echo [WARN] No se pudo sincronizar con Git. Continuando con la version local...
)
echo.

:: Verificar Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo         Descargalo en: https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo [OK] Node.js %NODE_VERSION% detectado
echo.

:: Instalar dependencias del servidor si faltan
if not exist "node_modules\" (
    echo [INFO] Instalando dependencias del servidor ^(primera vez^)...
    call npm install
    echo.
)

:: Instalar dependencias del dashboard si faltan
if not exist "ui\node_modules\" (
    echo [INFO] Instalando dependencias del dashboard ^(primera vez^)...
    cd ui && call npm install && cd ..
    echo.
)

:: Verificar e instalar Playwright Chromium (siempre valida, solo instala si falta)
echo [INFO] Verificando Playwright Chromium...
node_modules\.bin\playwright install chromium --dry-run 2>&1 | findstr /i "is not installed\|will be installed" >nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Instalando Chromium ^(esto toma unos minutos la primera vez^)...
    call node_modules\.bin\playwright install chromium
) else (
    echo [OK] Chromium ya esta instalado
)
echo.

echo [OK] Iniciando AutoBot...
echo      Dashboard: http://localhost:5173
echo      Backend:   http://localhost:3001
echo.
echo      Cierra esta ventana para detener AutoBot.
echo.

:: Abrir navegador después de 4 segundos
start "" /b cmd /c "timeout /t 4 >nul && start http://localhost:5173"

:: Lanzar servidor + UI
call npm start

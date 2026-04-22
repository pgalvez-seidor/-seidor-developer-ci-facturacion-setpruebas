@echo off
chcp 65001 >nul 2>&1
title AutoBot v1.1.0

echo ============================================
echo          AutoBot v1.1.0  -  Seidor Peru
echo ============================================
echo.

cd /d "%~dp0"

echo [1/5] Sincronizando con el servidor...
for /f "tokens=* usebackq" %%b in (`git branch --show-current 2^>nul`) do set CURRENT_BRANCH=%%b
echo       Rama: %CURRENT_BRANCH%
git pull origin %CURRENT_BRANCH% --no-edit --ff-only --set-upstream
if %ERRORLEVEL% neq 0 echo [WARN] No se pudo sincronizar. Usando version local.
echo.

echo [2/5] Verificando Node.js...
for /f "tokens=* usebackq" %%p in (`powershell -NoProfile -Command "[System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')"`) do set "PATH=%%p"

where node >nul 2>&1
if %ERRORLEVEL% equ 0 goto :node_ok

echo [INFO] Node.js no detectado. Instalando via winget...
where winget >nul 2>&1
if %ERRORLEVEL% neq 0 goto :node_manual

winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
if %ERRORLEVEL% neq 0 goto :node_manual

echo [OK] Node.js instalado. Cierra y vuelve a ejecutar autobot.bat
pause
exit /b 0

:node_manual
echo [ERROR] Instala Node.js manualmente en https://nodejs.org (version LTS)
pause
exit /b 1

:node_ok
for /f "tokens=* usebackq" %%v in (`node -v 2^>nul`) do set NODE_VER=%%v
echo [OK] Node.js %NODE_VER% detectado.
echo.

echo [3/5] Instalando dependencias...
echo       Servidor...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Fallo npm install. Revisa tu conexion a internet.
    pause
    exit /b 1
)

echo       Reconstruyendo modulos nativos para Windows (sqlite3)...
call npm rebuild sqlite3
if %ERRORLEVEL% neq 0 (
    echo [WARN] npm rebuild fallo. Reinstalando sqlite3...
    call npm install sqlite3 --force
)

echo       Dashboard...
cd ui
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Fallo npm install en ui/
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Dependencias listas.
echo.

echo [4/5] Preparando entorno de Playwright...
if exist "ui\node_modules\.vite" rmdir /s /q "ui\node_modules\.vite" >nul 2>&1

:: Instalar Playwright Chromium siempre (necesario para tests Y para grabacion con codegen)
echo       Instalando/verificando Playwright Chromium...
if exist "node_modules\.bin\playwright.cmd" (
    call node_modules\.bin\playwright.cmd install chromium
    if %ERRORLEVEL% neq 0 (
        echo [WARN] playwright install chromium fallo. Intentando con npx...
        call npx playwright install chromium
    )
    echo [OK] Playwright Chromium listo.
) else (
    echo [WARN] playwright.cmd no encontrado. Reinstalando playwright...
    call npm install playwright --force
    call node_modules\.bin\playwright.cmd install chromium
    echo [OK] Playwright reinstalado y Chromium descargado.
)
echo.

echo [5/5] Iniciando AutoBot...
echo.
echo       Dashboard : http://localhost:5173
echo       Backend   : http://localhost:3001
echo.
echo       Cierra esta ventana para detener.
echo ============================================
echo.

start "" /b cmd /c "timeout /t 5 >nul & (if exist \"C:\Program Files\Google\Chrome\Application\chrome.exe\" (\"C:\Program Files\Google\Chrome\Application\chrome.exe\" http://localhost:5173) else if exist \"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe\" (\"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe\" http://localhost:5173) else (start http://localhost:5173))"

call npm start

echo.
echo [INFO] AutoBot detenido.
pause
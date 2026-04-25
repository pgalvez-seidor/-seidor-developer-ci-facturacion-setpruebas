# Guía Completa — Convertir una App Web a Electron Nativo
## Mac DMG + Windows EXE · Con backend Express + React UI

> **Para la IA que ejecute esta guía:** Lee este documento completo antes de tocar cualquier archivo.
> Cada sección tiene trampas conocidas. Los errores documentados al final son reales — ocurrieron en producción.
> Sé literal con los valores. No inventes paths. No agregues comentarios al código.

---

## 1. Contexto y arquitectura objetivo

La app que migras tiene esta arquitectura **antes** de Electron:

```
npm start
  └── concurrently
       ├── node scripts/backend.js   ← Express API en puerto 3001
       └── npm run dev --prefix ui   ← React + Vite en puerto 5173
```

La arquitectura **después** de Electron:

```
Electron main process (main.js)
  ├── BrowserWindow (splash)         ← Pantalla de carga mientras arranca
  ├── child_process.fork(backend.js) ← Express corre como proceso hijo
  ├── waitForBackend() polling       ← Espera que /api/health responda
  └── BrowserWindow (main)           ← Carga ui/dist/index.html (build estático)
```

**Regla de oro:** El backend ES un proceso Node separado. Electron no lo embebe — lo lanza con `fork()`. Esto es crítico para que `require()` de módulos nativos funcione.

---

## 2. Estructura de archivos que debes crear

```
mi-proyecto/
├── main.js              ← Proceso principal de Electron (NUEVO)
├── preload.js           ← Puente IPC renderer↔main (NUEVO)
├── package.json         ← Agregar config electron-builder (MODIFICAR)
├── .github/
│   └── workflows/
│       └── build-windows.yml  ← GitHub Actions para EXE (NUEVO)
├── scripts/
│   └── backend.js       ← Tu Express existente (MODIFICAR — ver sección 5)
└── ui/
    ├── public/
    │   └── splash.html  ← Pantalla de carga (NUEVO)
    └── src/
        └── App.jsx      ← Tu React existente (MODIFICAR — ver sección 6)
```

---

## 3. package.json — configuración completa

Agrega las dependencias y la sección `build`. **No uses `asar: true`** — rompe `child_process.fork` con módulos nativos como sqlite3.

```json
{
  "name": "mi-app",
  "productName": "MiApp",
  "version": "1.0.0",
  "main": "main.js",
  "dependencies": {
    "express": "^5.2.1",
    "cors": "^2.8.6",
    "sqlite3": "^5.1.7"
  },
  "devDependencies": {
    "concurrently": "^9.2.1",
    "electron": "^30.0.0",
    "electron-builder": "*"
  },
  "scripts": {
    "start": "concurrently --kill-others \"node scripts/backend.js\" \"npm run dev --prefix ui\"",
    "electron:build": "npm run build --prefix ui && npx electron-builder",
    "electron:build:win": "npm run build --prefix ui && npx electron-builder --win"
  },
  "build": {
    "appId": "com.empresa.miapp",
    "productName": "MiApp",
    "asar": false,
    "mac": {
      "icon": "icon.png",
      "category": "public.app-category.developer-tools",
      "target": ["dmg"]
    },
    "win": {
      "icon": "icon.png",
      "target": [
        { "target": "nsis", "arch": ["x64"] }
      ],
      "requestedExecutionLevel": "requireAdministrator"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "MiApp"
    },
    "files": [
      "main.js",
      "preload.js",
      "scripts/**/*",
      "config/**/*",
      "ui/dist/**/*",
      "ui/public/**/*",
      "node_modules/**/*",
      "!node_modules/.cache/**/*"
    ]
  }
}
```

> ⚠️ **TRAMPA**: El `"icon"` en `win` y `nsis` debe ser un archivo `.ico`, NO `.png`.
> Si pones `.png` en `nsis.installerIcon` o `nsis.uninstallerIcon`, el build de Windows falla con:
> `Error while loading icon: invalid icon file`
> **Solución**: Omite `installerIcon` y `uninstallerIcon` del bloque `nsis`. electron-builder los genera automáticamente.

---

## 4. main.js — proceso principal completo

Copia este archivo exacto. Sustituye los valores entre `< >`.

```javascript
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow;
let splashWindow;
let serverProcess;

const isDev = process.env.NODE_ENV === 'development' || !!process.env.ELECTRON_START_URL;

function createSplash() {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 450,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        webPreferences: { nodeIntegration: false }
    });

    const splashPath = isDev
        ? path.join(__dirname, 'ui/public/splash.html')
        : path.join(__dirname, 'ui/dist/splash.html');

    splashWindow.loadFile(splashPath);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js')
        },
        title: '<Nombre de tu App>'
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, 'ui/dist/index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        if (splashWindow) { splashWindow.close(); splashWindow = null; }
        mainWindow.show();
        mainWindow.maximize();
    });

    mainWindow.on('closed', () => { mainWindow = null; });
}

function waitForBackend(attempts) {
    attempts = attempts || 0;
    const MAX = 40;
    const req = http.get('http://localhost:3001/api/health', { timeout: 400 }, (res) => {
        if (res.statusCode === 200) {
            createWindow();
        } else {
            retry(attempts);
        }
        res.resume();
    });
    req.on('error', () => retry(attempts));
    req.on('timeout', () => { req.destroy(); retry(attempts); });

    function retry(n) {
        if (n < MAX) {
            setTimeout(() => waitForBackend(n + 1), 300);
        } else {
            createWindow();
        }
    }
}

function startBackend() {
    const { fork } = require('child_process');
    const os = require('os');

    const serverPath = path.join(__dirname, 'scripts/backend.js')
        .replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep);

    const appPath = app.getAppPath();
    let projectDir = process.cwd();

    let lookup = appPath;
    for (let i = 0; i < 7; i++) {
        lookup = path.join(lookup, '..');
        if (fs.existsSync(path.join(lookup, '.git'))) { projectDir = lookup; break; }
    }

    const userDataPath = app.getPath('userData');
    const configPath = path.join(userDataPath, 'config', 'settings.json');
    if (fs.existsSync(configPath)) {
        try {
            const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (saved.projectDir && fs.existsSync(saved.projectDir)) {
                projectDir = saved.projectDir;
            }
        } catch (e) {}
    }

    serverProcess = fork(serverPath, [], {
        env: {
            ...process.env,
            PORT: '3001',
            PROJECT_DIR: projectDir,
            USER_DATA_DIR: userDataPath,
            ELECTRON_RUN_AS_NODE: '1'
        },
        execPath: process.execPath,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });

    const errLog = path.join(os.homedir(), 'miapp-backend-err.log');
    const outLog = path.join(os.homedir(), 'miapp-backend-out.log');

    serverProcess.stdout.on('data', (d) => { try { fs.appendFileSync(outLog, d.toString()); } catch (e) {} });
    serverProcess.stderr.on('data', (d) => { try { fs.appendFileSync(errLog, d.toString()); } catch (e) {} });
}

function setSplashStatus(msg) {
    try {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.webContents.executeJavaScript(
                `document.getElementById('status') && (document.getElementById('status').textContent = ${JSON.stringify(msg)})`
            ).catch(() => {});
        }
    } catch (_) {}
}

function isBrowserInstalled() {
    try {
        const pw = require('playwright');
        const execPath = pw.chromium.executablePath();
        return execPath && fs.existsSync(execPath);
    } catch (_) {
        return false;
    }
}

function ensurePlaywrightBrowsers() {
    return new Promise((resolve) => {
        const { execFile } = require('child_process');
        const markerFile = path.join(app.getPath('userData'), '.pw-installed');

        if (fs.existsSync(markerFile) && isBrowserInstalled()) {
            return resolve({ ok: true, skipped: true });
        }

        const playwrightCli = path.join(__dirname, 'node_modules', 'playwright', 'cli.js');
        if (!fs.existsSync(playwrightCli)) {
            return resolve({ ok: false, reason: 'cli-not-found' });
        }

        setSplashStatus('Instalando navegador (primera vez)...');

        const proc = execFile(process.execPath, [playwrightCli, 'install', 'chromium'], {
            env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
            timeout: 180000
        });

        const dots = setInterval(() => setSplashStatus(
            'Descargando navegador' + '.'.repeat((Date.now() / 800 | 0) % 4)
        ), 800);

        proc.on('close', (code) => {
            clearInterval(dots);
            if (code === 0 && isBrowserInstalled()) {
                try { fs.writeFileSync(markerFile, new Date().toISOString()); } catch (_) {}
                setSplashStatus('Navegador listo ✓');
                resolve({ ok: true });
            } else {
                setSplashStatus('Continuando...');
                resolve({ ok: false, code });
            }
        });

        proc.on('error', (err) => {
            clearInterval(dots);
            setSplashStatus('Continuando...');
            resolve({ ok: false, reason: err.message });
        });
    });
}

app.on('ready', async () => {
    createSplash();
    await ensurePlaywrightBrowsers();
    startBackend();
    waitForBackend();
});

app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => { if (serverProcess) serverProcess.kill(); });
app.on('activate', () => { if (mainWindow === null) createWindow(); });

ipcMain.on('quit-app', () => app.quit());

ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Selecciona la carpeta del proyecto',
        buttonLabel: 'Usar esta carpeta'
    });
    return (!result.canceled && result.filePaths.length > 0) ? result.filePaths[0] : null;
});
```

> ⚠️ **TRAMPA — Dialog freeze en Mac**: Si llamas `dialog.showOpenDialog(mainWindow, {...})` pasando la ventana como primer argumento, en macOS el diálogo se convierte en un "sheet" que congela toda la app.
> **Solución**: Llámalo SIN la ventana como argumento: `dialog.showOpenDialog({...})`.

---

## 5. preload.js — puente IPC

```javascript
const { ipcRenderer } = require('electron');

window.electron = {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    quit: () => ipcRenderer.send('quit-app')
};
```

---

## 6. Modificaciones al backend Express

### 6.1 Extender el PATH al inicio del archivo

Electron no hereda el PATH completo del shell. Sin esto, `npx`, `git`, `node` no se encuentran desde el proceso hijo.

```javascript
if (process.platform === 'win32') {
    process.env.PATH = [
        process.env.PATH,
        process.env.APPDATA ? require('path').join(process.env.APPDATA, 'npm') : '',
        'C:\\Program Files\\nodejs',
        'C:\\Program Files\\Git\\cmd',
        'C:\\Program Files\\Git\\bin',
        'C:\\Program Files\\Git\\usr\\bin'
    ].filter(Boolean).join(';');
} else {
    process.env.PATH = [
        process.env.PATH,
        '/usr/local/bin',
        '/opt/homebrew/bin',
        '/opt/homebrew/sbin',
        '/usr/bin',
        '/bin'
    ].filter(Boolean).join(':');
}
```

### 6.2 Usar PROJECT_DIR del entorno

```javascript
const rootDir = process.env.PROJECT_DIR || path.resolve(__dirname, '..');
let projectDir = rootDir;
```

### 6.3 Endpoint de health obligatorio

```javascript
app.get('/api/health', (req, res) => res.json({ ok: true }));
```

Sin esto, `waitForBackend()` nunca abre la ventana principal.

### 6.4 Shutdown limpio

```javascript
app.post('/api/shutdown', (req, res) => {
    res.json({ ok: true });
    setTimeout(() => process.exit(0), 300);
});
```

> ⚠️ **TRAMPA — lsof en Windows**: No uses `lsof` para matar procesos. No existe en Windows.
> Electron mata los procesos hijo automáticamente al cerrarse (via `will-quit`). Con `process.exit(0)` es suficiente.

### 6.5 Spawn de procesos — diferencias Windows/Mac

```javascript
const proc = spawn(executablePath, ['arg1', 'arg2'], {
    windowsVerbatimArguments: process.platform === 'win32'
});
```

> ⚠️ **TRAMPA**: No envuelvas el path del ejecutable en comillas manuales (`"${path}"`).
> En Windows, cmd.exe interpreta las comillas de forma diferente y el spawn falla.
> Usa el array de argumentos de spawn — Node lo escapa correctamente en ambas plataformas.

---

## 7. Modificaciones al frontend React

### 7.1 Cierre limpio de la app

❌ NO hagas esto — no cierra la ventana de Electron:
```javascript
window.location.href = 'about:blank';
```

✅ Haz esto:
```javascript
await fetch('http://localhost:3001/api/shutdown', { method: 'POST' }).catch(() => {});
window.electron?.quit();
```

### 7.2 Canvas con imágenes locales (file://)

❌ NO agregues esto — causa SecurityError en file://:
```javascript
img.crossOrigin = 'anonymous';
```

Cuando el canvas llama `getImageData()` sobre una imagen con `crossOrigin` en protocolo `file://`, el canvas queda "tainted" y lanza error.

✅ Simplemente no pongas `crossOrigin` si las imágenes son locales.

### 7.3 Rutas de imágenes

En desarrollo (Vite): `/logo.png` funciona.
En producción (file://): usa `./logo.png` (relativa).

Si tienes un solo componente que funciona en ambos contextos:
```javascript
const logoSrc = './logo.png';
```

### 7.4 Llamar a selectFolder desde React

```javascript
const folderPath = await window.electron?.selectFolder();
if (folderPath) {
    // usar folderPath
}
```

### 7.5 DELETE en fetch con IDs que contienen puntos

Express 5 tiene problemas con parámetros de ruta que contienen `.` (ej: `archivo.spec.js`).

❌ No hagas:
```javascript
fetch(`/api/resource/${id}`, { method: 'DELETE' })
```

✅ Haz:
```javascript
fetch(`/api/resource/${encodeURIComponent(id)}`, { method: 'DELETE' })
```

Y en el backend:
```javascript
app.delete('/api/resource/:id', (req, res) => {
    const id = decodeURIComponent(req.params.id);
    // ...
});
```

---

## 8. splash.html

Colócalo en `ui/public/splash.html` Y copia a `ui/dist/splash.html` manualmente (el `dist/` suele estar en `.gitignore`).

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            background: #ffffff;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            -webkit-app-region: drag;
        }
        .logo { width: 120px; height: 120px; margin-bottom: 24px; animation: pulse 2s infinite ease-in-out; }
        .spinner { width: 22px; height: 22px; border: 3px solid rgba(99,102,241,0.15); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; }
        .text { font-size: 11px; color: #6366f1; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-top: 10px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
    </style>
</head>
<body>
    <img src="favicon.png" class="logo">
    <div class="spinner"></div>
    <div class="text" id="status">Iniciando...</div>
</body>
</html>
```

---

## 9. GitHub Actions — build automático del EXE de Windows

Crea `.github/workflows/build-windows.yml`:

```yaml
name: Build Windows EXE

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-win:
    runs-on: windows-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install root dependencies
        run: npm install

      - name: Install UI dependencies
        run: npm install --prefix ui

      - name: Build React UI
        run: npm run build --prefix ui

      - name: Build Windows EXE
        run: npx electron-builder --win --publish never
        env:
          CSC_IDENTITY_AUTO_DISCOVERY: false

      - name: Upload EXE artifact
        uses: actions/upload-artifact@v4
        with:
          name: MiApp-Windows-EXE
          path: dist/*.exe
          retention-days: 30
```

> ⚠️ **TRAMPA — GH_TOKEN**: Si omites `--publish never`, electron-builder intenta publicar en GitHub Releases y falla con `GitHub Personal Access Token is not set`.

---

## 10. Construir el DMG de macOS

```bash
cd mi-proyecto

npm install
npm install --prefix ui
npm run build --prefix ui

CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder
```

El archivo generado estará en `dist/MiApp-1.0.0-arm64.dmg`.

> ⚠️ **TRAMPA — firma**: Sin certificado de Apple Developer, macOS bloquea el app.
> El usuario debe: clic derecho → Abrir → Abrir. Solo la primera vez.

---

## 11. SQLite con electron-builder

Si usas SQLite (`sqlite3`), electron-builder debe recompilar el módulo nativo para el arco correcto. Esto ocurre automáticamente, pero necesitas tener Xcode Command Line Tools en Mac y Visual Studio Build Tools en Windows.

Si el build falla con errores de `sqlite3`:
```bash
npm install --save-dev @electron/rebuild
npx electron-rebuild
```

---

## 12. Tabla de errores reales y soluciones

| Error | Causa | Solución |
|---|---|---|
| `Error 127: npx not found` | Electron no hereda PATH del shell | Extender `process.env.PATH` al inicio del backend (ver sección 6.1) |
| `Error while loading icon: invalid icon file` | NSIS recibe `.png` en lugar de `.ico` | Quitar `installerIcon` y `uninstallerIcon` del bloque `nsis` en package.json |
| `GitHub Personal Access Token is not set` | electron-builder intenta auto-publicar en CI | Agregar `--publish never` al comando de build |
| Canvas tainted / SecurityError | `crossOrigin = 'anonymous'` en imágenes locales con `file://` | Quitar el atributo `crossOrigin` |
| Dialog freeze en Mac | `dialog.showOpenDialog(mainWindow, {...})` | Llamar sin la ventana como argumento |
| `window.location.href = 'about:blank'` no cierra la app | No es una ventana de browser normal | Usar `window.electron.quit()` vía IPC |
| Ventana principal se abre vacía | Backend no arrancó antes del `loadFile` | Implementar `waitForBackend()` con polling a `/api/health` |
| `Cannot find module` en fork | Módulos dentro del ASAR no accesibles | Usar `asar: false` en package.json — nunca uses ASAR con `fork()` |
| DELETE retorna 500 con IDs con puntos | Express trunca `:id` en la parte del punto | `encodeURIComponent` en el fetch + `decodeURIComponent` en el handler |
| App no encuentra `.git` al distribuir | El CWD del DMG no es el repo | Subir niveles con un bucle buscando `.git` desde `app.getAppPath()` |
| Módulos nativos no compilan en Windows CI | Falta Visual Studio Build Tools | El runner `windows-latest` de GitHub Actions ya los tiene — no hay que instalar nada |
| `SQLITE_CORRUPT: database disk image is malformed` | DB corrupta (proceso interrumpido, disco lleno) | Eliminar el archivo `.sqlite` y reiniciar — se regenera automáticamente |
| `lsof: command not found` | `lsof` no existe en Windows | Reemplazar con `process.exit(0)` — Electron mata los hijos al cerrar |

---

## 13. Variables de entorno — flujo completo

```
main.js (Electron)
  └── fork(backend.js, [], { env: {
        PORT: '3001',
        PROJECT_DIR: '/ruta/al/repo',     ← Donde están los datos del usuario
        USER_DATA_DIR: '/ruta/userData',   ← AppData/Roaming en Windows, ~/Library en Mac
        ELECTRON_RUN_AS_NODE: '1'          ← OBLIGATORIO para que fork funcione
      }})
```

`ELECTRON_RUN_AS_NODE: '1'` le dice al binario de Electron que actúe como Node.js puro en el proceso hijo. Sin esto, el fork falla silenciosamente.

---

## 14. Checklist final antes de distribuir

- [ ] `asar: false` en package.json
- [ ] `preload.js` en el array `files` de package.json
- [ ] `ui/dist/**/*` en el array `files`
- [ ] `node_modules/**/*` en el array `files`
- [ ] `ELECTRON_RUN_AS_NODE: '1'` en el `env` del fork
- [ ] `execPath: process.execPath` en el fork
- [ ] `/api/health` endpoint existe en el backend
- [ ] PATH extendido al inicio del backend
- [ ] Sin `crossOrigin` en imágenes cargadas desde disco
- [ ] `./imagen.png` (relativa) en vez de `/imagen.png` (absoluta) en el frontend
- [ ] `--publish never` en el workflow de GitHub Actions
- [ ] Sin `installerIcon`/`uninstallerIcon` como `.png` en bloque `nsis`
- [ ] `splash.html` copiado a `ui/dist/` (está en `.gitignore`)
- [ ] Icono principal es `.png` para Mac, se convierte automáticamente para Windows

---

## 15. Orden de implementación recomendado para la IA

1. Instalar dependencias: `npm install --save-dev electron electron-builder concurrently`
2. Crear `preload.js`
3. Crear `main.js` (copiar plantilla de sección 4, ajustar paths)
4. Crear `ui/public/splash.html`
5. Modificar `package.json` (agregar sección `build`, script `electron:build`)
6. Modificar backend: PATH + PROJECT_DIR + `/api/health` + shutdown limpio
7. Modificar frontend: quit vía IPC + rutas relativas de imágenes
8. Crear `.github/workflows/build-windows.yml`
9. Probar en dev: `npx electron .`
10. Build Mac: `CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder`
11. Build Windows: push a GitHub → descargar artifact de Actions

---

*Documento generado el 26/04/2026 · Proyecto de referencia: AutoBotIA v2.1.0 · Pierre Gálvez — Seidor Perú*

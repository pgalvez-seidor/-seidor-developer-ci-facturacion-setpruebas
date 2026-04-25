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
        icon: path.join(__dirname, 'ui/public/favicon.png'),
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
        icon: path.join(__dirname, 'ui/public/favicon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js')
        },
        title: 'AutoBotIA - Seidor AI Vision'
    });

    if (isDev) {
        mainWindow.loadURL(process.env.ELECTRON_START_URL || 'http://localhost:5173');
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

// Espera real al backend: hace ping a /health hasta que responda o se agote el tiempo.
// Solo entonces abre la ventana principal.
function waitForBackend(attempts) {
    attempts = attempts || 0;
    const MAX = 40; // 40 x 300ms = 12 segundos máximo de espera
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
            createWindow(); // fallback: abrir igual aunque el backend no responda
        }
    }
}

function startBackend() {
    const { fork } = require('child_process');
    const os = require('os');

    // En producción los scripts están en app.asar.unpacked (no se pueden fork desde el ASAR)
    const serverPath = path.join(__dirname, 'scripts/ui-server.js')
        .replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep);

    const appPath = app.getAppPath();
    let projectDir = process.cwd();

    // Buscar .git subiendo hasta 7 niveles desde el bundle
    let lookup = appPath;
    for (let i = 0; i < 7; i++) {
        lookup = path.join(lookup, '..');
        if (fs.existsSync(path.join(lookup, '.git'))) { projectDir = lookup; break; }
    }

    // Leer ruta guardada por el usuario en Settings (tiene prioridad)
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

    const errLog = path.join(os.homedir(), 'autobot-backend-err.log');
    const outLog = path.join(os.homedir(), 'autobot-backend-out.log');

    serverProcess.stdout.on('data', (d) => { try { fs.appendFileSync(outLog, d.toString()); } catch (e) {} });
    serverProcess.stderr.on('data', (d) => { try { fs.appendFileSync(errLog, d.toString()); } catch (e) {} });
    serverProcess.on('exit', (code) => { try { fs.appendFileSync(errLog, `[BACKEND EXIT] code=${code}\n`); } catch (e) {} });
}

function ensurePlaywrightBrowsers() {
    return new Promise((resolve) => {
        const { execFileSync } = require('child_process');
        const markerFile = path.join(app.getPath('userData'), '.pw-installed');

        if (fs.existsSync(markerFile)) return resolve();

        try {
            const playwrightCli = path.join(__dirname, 'node_modules', 'playwright', 'cli.js');
            if (!fs.existsSync(playwrightCli)) return resolve();

            execFileSync(process.execPath, [playwrightCli, 'install', 'chromium'], {
                env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
                stdio: 'ignore',
                timeout: 120000
            });

            fs.writeFileSync(markerFile, new Date().toISOString());
        } catch (e) {
        }
        resolve();
    });
}

app.on('ready', async () => {
    app.setAboutPanelOptions({
        applicationName: 'AutoBotIA',
        applicationVersion: '2.1.0',
        version: 'Build 2026.04.25',
        copyright: 'Copyright © 2026 Pierre Gálvez - Seidor',
        authors: ['Pierre Gálvez'],
        website: 'https://seidor.com',
        iconPath: path.join(__dirname, 'ui/public/favicon.png')
    });

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
        title: 'Selecciona la carpeta de tu proyecto AutoBot',
        buttonLabel: 'Usar esta carpeta'
    });
    return (!result.canceled && result.filePaths.length > 0) ? result.filePaths[0] : null;
});

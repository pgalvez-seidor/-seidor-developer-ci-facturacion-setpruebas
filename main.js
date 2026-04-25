const { app, BrowserWindow, Notification, Tray, Menu, utilityProcess } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let splashWindow;
let serverProcess;

// Manejo de rutas portátil para Electron
const isDev = process.env.NODE_ENV === 'development' || !!process.env.ELECTRON_START_URL;

function getRootDir() {
    if (isDev) return __dirname;
    const appPath = app.getAppPath();
    const outsideBundle = path.join(appPath, '..', '..', '..', '..');
    if (fs.existsSync(path.join(outsideBundle, '.env'))) return outsideBundle;
    return process.cwd();
}

const rootDir = getRootDir();

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

    // En desarrollo usamos public/splash.html, en producción dist/splash.html
    const splashPath = isDev 
        ? path.join(__dirname, 'ui/public/splash.html') 
        : path.join(__dirname, 'ui/dist/splash.html');
        
    splashWindow.loadFile(splashPath);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false, // No mostrar hasta que el backend esté listo
        icon: path.join(__dirname, 'ui/public/favicon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'AutoBotIA - Seidor AI Vision'
    });

    if (isDev) {
        const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
        mainWindow.loadURL(startUrl);
    } else {
        mainWindow.loadFile(path.join(__dirname, 'ui/dist/index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        // Esperamos un poco más para asegurar que el backend respondió el primer latido
        setTimeout(() => {
            if (splashWindow) splashWindow.close();
            mainWindow.show();
            mainWindow.maximize();
        }, 2000);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startBackend() {
    console.log('🚀 Arrancando Backend de AutoBotIA (Child Process Fork)...');
    const { fork } = require('child_process');
    const serverPath = path.join(__dirname, 'scripts/ui-server.js');
    
    // Detectar la carpeta del proyecto (donde está el .git)
    const appPath = app.getAppPath();
    let projectDir = process.cwd();
    
    // Buscar .git subiendo hasta 7 niveles (común en dist/mac-arm64/App...)
    let currentLookup = appPath;
    for (let i = 0; i < 7; i++) {
        currentLookup = path.join(currentLookup, '..');
        if (fs.existsSync(path.join(currentLookup, '.git'))) {
            projectDir = currentLookup;
            break;
        }
    }

    const userDataPath = app.getPath('userData');
    
    // Cargar PROJECT_DIR persistido si existe
    const configPath = path.join(userDataPath, 'config', 'settings.json');
    if (fs.existsSync(configPath)) {
        try {
            const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (saved.projectDir && fs.existsSync(saved.projectDir)) {
                projectDir = saved.projectDir;
            }
        } catch(e){}
    }

    serverProcess = fork(serverPath, [], {
        env: { 
            ...process.env, 
            PORT: '3005',
            ROOT_DIR: userDataPath,
            PROJECT_DIR: projectDir,
            ELECTRON_RUN_AS_NODE: '1'
        },
        execPath: process.execPath,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });

    const os = require('os');
    const errLog = path.join(os.homedir(), 'autobot-backend-err.log');
    const outLog = path.join(os.homedir(), 'autobot-backend-out.log');

    serverProcess.stdout.on('data', (data) => {
        try { fs.appendFileSync(outLog, data.toString()); } catch(e){}
    });

    serverProcess.stderr.on('data', (data) => {
        try { fs.appendFileSync(errLog, data.toString()); } catch(e){}
    });

    serverProcess.on('exit', (code) => {
        try { fs.appendFileSync(errLog, `[BACKEND EXIT] Code: ${code}\n`); } catch(e){}
    });
}

app.on('ready', () => {
    // Configurar panel "Acerca de" personalizado
    app.setAboutPanelOptions({
        applicationName: 'AutoBotIA',
        applicationVersion: '2.0.0',
        version: 'Build 2026.04.24',
        copyright: 'Copyright © 2026 Pierre Gálvez - Seidor',
        authors: ['Pierre Gálvez'],
        website: 'https://seidor.com',
        iconPath: path.join(__dirname, 'ui/public/favicon.png')
    });

    createSplash();
    startBackend();
    
    // El backend tardará un poco en sincronizar Git
    // Intentamos cargar la ventana principal después de un pequeño delay
    setTimeout(createWindow, 1000);
});


app.on('window-all-closed', () => {
    app.quit();
});

app.on('will-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

const { ipcMain, dialog } = require('electron');
ipcMain.on('quit-app', () => {
    app.quit();
});

// Abrir selector nativo de carpeta (llamado desde la UI)
ipcMain.handle('select-folder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Selecciona la carpeta de tu proyecto AutoBot',
        buttonLabel: 'Usar esta carpeta'
    });
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

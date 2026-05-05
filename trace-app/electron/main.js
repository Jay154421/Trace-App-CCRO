const { app, BrowserWindow, ipcMain, dialog, nativeImage, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.ELECTRON_DEV === '1' || !app.isPackaged;

const PRELOAD_PATH = path.join(__dirname, 'preload.js');
const CCRO_ICON = 'ccro-logo.png';

function getAppIconPath() {
  if (isDev) {
    return path.join(__dirname, '..', 'public', CCRO_ICON);
  }
  return path.join(app.getAppPath(), 'public', CCRO_ICON);
}

function getWindowIcon() {
  const iconPath = getAppIconPath();
  if (!fs.existsSync(iconPath)) return undefined;
  const img = nativeImage.createFromPath(iconPath);
  return img.isEmpty() ? undefined : img;
}

function createWindow(url) {
  const icon = getWindowIcon();
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    ...(icon ? { icon } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: PRELOAD_PATH,
    },
  });
  win.loadURL(url);
  if (isDev) win.webContents.openDevTools();

  ipcMain.handle('save-field-position-pdf', async (_event, pdfBase64, suggestedFileName) => {
    let defaultPath = `field-position-${Date.now()}.pdf`;
    if (typeof suggestedFileName === 'string' && suggestedFileName.trim()) {
      let base = path.basename(suggestedFileName.trim());
      base = base.replace(/[<>:"|?*\u0000-\u001f]/g, '').trim();
      if (!base.toLowerCase().endsWith('.pdf')) base = `${base}.pdf`;
      if (base.length > 200) base = `${base.slice(0, 196)}.pdf`;
      if (base && base !== '.pdf') defaultPath = base;
    }
    const { filePath } = await dialog.showSaveDialog(win, {
      defaultPath,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (!filePath || !pdfBase64) return { ok: false };
    const buffer = Buffer.from(pdfBase64, 'base64');
    fs.writeFileSync(filePath, buffer);
    return { ok: true, filePath };
  });
}

function waitForServer(url, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    const check = (attempt) => {
      fetch(url)
        .then((r) => (r.ok ? resolve() : Promise.reject(new Error('Not ok'))))
        .catch(() => {
          if (attempt >= maxAttempts) return reject(new Error('Server did not start'));
          setTimeout(() => check(attempt + 1), 200);
        });
    };
    check(0);
  });
}

function startServerInProcess() {
  const resourcesPath = process.resourcesPath;
  // Server must live next to app.asar/node_modules so `require('express')` etc. resolve when installed
  // outside the dev tree (extraResources alone breaks module lookup under Program Files).
  const serverPath = path.join(app.getAppPath(), 'server', 'server.js');
  const staticDir = path.join(resourcesPath, 'dist');
  const dataDir = app.getPath('userData');

  if (!fs.existsSync(serverPath)) {
    console.error('Server not found at', serverPath);
    app.quit();
    return;
  }

  process.env.ELECTRON_SERVE = '1';
  process.env.STATIC_DIR = staticDir;
  process.env.DATA_DIR = dataDir;
  process.env.PORT = '3001';
  process.env.ELECTRON_STRICT_PORTS = '1';
  require(serverPath);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  if (isDev) {
    createWindow('http://localhost:5174');
    return;
  }

  startServerInProcess();
  waitForServer('http://127.0.0.1:3001/api/health')
    .then(() => createWindow('http://127.0.0.1:3001'))
    .catch((err) => {
      console.error(err);
      dialog.showErrorBox(
        'B-TRACE System',
        'The application could not start its local server. If port 3001 is already in use, close the other program or restart your computer and try again.\n\n' +
          String(err && err.message ? err.message : err)
      );
      app.quit();
    });
});

app.on('window-all-closed', () => {
  app.quit();
});

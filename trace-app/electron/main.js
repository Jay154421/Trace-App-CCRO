const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.ELECTRON_DEV === '1' || !app.isPackaged;

const PRELOAD_PATH = path.join(__dirname, 'preload.js');

function createWindow(url) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: PRELOAD_PATH,
    },
  });
  win.loadURL(url);
  if (isDev) win.webContents.openDevTools();

  ipcMain.handle('save-field-position-pdf', async () => {
    const { filePath } = await dialog.showSaveDialog(win, {
      defaultPath: `field-position-${Date.now()}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (!filePath) return { ok: false };
    // Legal: 8.5" x 14" (microns: 1 inch = 25400)
    const MICRONS_PER_INCH = 25400;
    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      marginsType: 1,
      pageSize: {
        width: Math.round(8.5 * MICRONS_PER_INCH),
        height: Math.round(14 * MICRONS_PER_INCH),
      },
    });
    fs.writeFileSync(filePath, pdfBuffer);
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
  const serverPath = path.join(resourcesPath, 'server', 'server.js');
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
  require(serverPath);
}

app.whenReady().then(() => {
  if (isDev) {
    createWindow('http://localhost:5174');
    return;
  }

  startServerInProcess();
  waitForServer('http://127.0.0.1:3001/api/health')
    .then(() => createWindow('http://127.0.0.1:3001'))
    .catch((err) => {
      console.error(err);
      app.quit();
    });
});

app.on('window-all-closed', () => {
  app.quit();
});

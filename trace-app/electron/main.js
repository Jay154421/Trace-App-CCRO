const { app, BrowserWindow, ipcMain, dialog, nativeImage, Menu, shell } = require('electron');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

function firstExistingPath(candidates) {
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function findEdgeExecutable() {
  const localAppData = process.env.LOCALAPPDATA;
  const programFiles = process.env.ProgramFiles;
  const programFilesX86 = process.env['ProgramFiles(x86)'];
  return firstExistingPath([
    localAppData && path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    programFiles && path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    programFilesX86 && path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ]);
}

function findChromeExecutable() {
  const localAppData = process.env.LOCALAPPDATA;
  const programFiles = process.env.ProgramFiles;
  const programFilesX86 = process.env['ProgramFiles(x86)'];
  return firstExistingPath([
    localAppData && path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    programFiles && path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    programFilesX86 && path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ]);
}

async function findExecutableOnPath(exeName) {
  try {
    const { stdout } = await execFileAsync('where.exe', [exeName], { windowsHide: true });
    const lines = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    return firstExistingPath(lines);
  } catch {
    return null;
  }
}

function pathToFileUrl(filePath) {
  const resolved = path.resolve(filePath);
  return `file:///${resolved.replace(/\\/g, '/')}`;
}

/** Open a local PDF with the given browser executable (Windows `start` is most reliable). */
function openPdfWithExecutable(browserExe, normalized) {
  const targets = [normalized, pathToFileUrl(normalized)];

  const tryOne = (target) =>
    new Promise((resolve) => {
      execFile('cmd.exe', ['/c', 'start', '', browserExe, target], { windowsHide: true }, (err) => {
        if (err) {
          execFile(browserExe, [target], { windowsHide: true }, (err2) => {
            resolve(err2 ? { ok: false, error: err2.message } : { ok: true });
          });
          return;
        }
        resolve({ ok: true });
      });
    });

  return targets.reduce(
    (chain, target) => chain.then((prev) => (prev?.ok ? prev : tryOne(target))),
    Promise.resolve({ ok: false })
  );
}

async function tryOpenWithBrowser(browserExe, normalized) {
  const result = await openPdfWithExecutable(browserExe, normalized);
  return result.ok ? { ok: true } : { ok: false };
}

async function resolveBrowserExecutable(browserChoice) {
  if (browserChoice === 'edge') {
    return findEdgeExecutable() || (await findExecutableOnPath('msedge.exe'));
  }
  if (browserChoice === 'chrome') {
    return findChromeExecutable() || (await findExecutableOnPath('chrome.exe'));
  }
  return null;
}

/** Open a local PDF in a specific browser (`edge` or `chrome`). */
async function openPdfInChosenBrowser(filePath, browserChoice) {
  if (browserChoice !== 'edge' && browserChoice !== 'chrome') {
    return { ok: false, error: 'Invalid browser choice.' };
  }
  if (typeof filePath !== 'string' || !filePath.trim()) {
    return { ok: false, error: 'No file path provided.' };
  }
  const normalized = path.normalize(filePath.trim());
  if (!fs.existsSync(normalized)) {
    return { ok: false, error: 'PDF file not found.' };
  }

  const browserExe = await resolveBrowserExecutable(browserChoice);
  const label = browserChoice === 'edge' ? 'Microsoft Edge' : 'Google Chrome';
  if (!browserExe) {
    return { ok: false, error: `${label} was not found on this computer.` };
  }

  const result = await tryOpenWithBrowser(browserExe, normalized);
  if (result.ok) {
    return { ok: true, browser: browserChoice };
  }
  return { ok: false, error: `Could not open in ${label}.` };
}

/** Open a local PDF in Microsoft Edge, or Google Chrome if Edge is missing or fails. */
async function openPdfInBrowser(filePath, browserChoice) {
  if (browserChoice === 'edge' || browserChoice === 'chrome') {
    return openPdfInChosenBrowser(filePath, browserChoice);
  }

  if (typeof filePath !== 'string' || !filePath.trim()) {
    return { ok: false, error: 'No file path provided.' };
  }
  const normalized = path.normalize(filePath.trim());
  if (!fs.existsSync(normalized)) {
    return { ok: false, error: 'PDF file not found.' };
  }

  const edge =
    findEdgeExecutable() || (await findExecutableOnPath('msedge.exe'));
  if (edge) {
    const edgeResult = await tryOpenWithBrowser(edge, normalized);
    if (edgeResult.ok) {
      return { ok: true, browser: 'edge' };
    }
  }

  const chrome =
    findChromeExecutable() || (await findExecutableOnPath('chrome.exe'));
  if (chrome) {
    const chromeResult = await tryOpenWithBrowser(chrome, normalized);
    if (chromeResult.ok) {
      return { ok: true, browser: 'chrome' };
    }
    return { ok: false, error: 'Could not open in Google Chrome.' };
  }

  if (edge) {
    return { ok: false, error: 'Could not open in Microsoft Edge, and Google Chrome was not found.' };
  }

  try {
    const openError = await shell.openPath(normalized);
    if (!openError) {
      return { ok: true, browser: 'default' };
    }
  } catch {
    // fall through
  }

  return {
    ok: false,
    error: 'Microsoft Edge and Google Chrome were not found on this computer.',
  };
}

ipcMain.handle('open-pdf-in-edge', (_event, filePath, browserChoice) =>
  openPdfInBrowser(filePath, browserChoice)
);

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

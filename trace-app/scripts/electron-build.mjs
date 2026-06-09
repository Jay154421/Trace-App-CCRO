/**
 * Production Electron build: Vite (electron mode) → AUSF/Witness PDF verify → electron-builder.
 * Set SKIP_PDF_VERIFY=1 to skip PDF checks (e.g. CI without Edge/Chrome).
 */
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
/** Dedicated port so verify does not collide with a running dev:server on 3001. */
const API_PORT = process.env.VERIFY_PORT || '3099';
/** Same as packaged Electron: Express serves dist + /api on one port. */
const APP_URL = process.env.VERIFY_APP_URL || `http://localhost:${API_PORT}`;
const API_URL = process.env.VERIFY_API_URL || `http://localhost:${API_PORT}`;
const DATA_DIR = process.env.DATA_DIR || join(ROOT, 'data');
const STATIC_DIR = join(ROOT, 'dist');

/** @type {import('child_process').ChildProcess[]} */
const backgroundChildren = [];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function run(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      shell: true,
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function waitForUrl(url, attempts = 90) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok || res.status < 500) return true;
    } catch {
      /* retry */
    }
    await sleep(1000);
  }
  return false;
}

function startBackground(command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: ROOT,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
  });
  child.stderr?.on('data', (chunk) => {
    const text = String(chunk);
    if (text.includes('EADDRINUSE') || text.includes('Failed to start')) {
      process.stderr.write(`[verify-server] ${text}`);
    }
  });
  backgroundChildren.push(child);
  return child;
}

function stopBackgroundChildren() {
  for (const child of backgroundChildren) {
    if (!child.pid) continue;
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], { shell: true, stdio: 'ignore' });
      } else {
        child.kill('SIGTERM');
      }
    } catch {
      /* ignore */
    }
  }
  backgroundChildren.length = 0;
}

async function ensureVerifyUser() {
  const username = process.env.VERIFY_USERNAME || 'admin';
  const password = process.env.VERIFY_PASSWORD || 'ccro123';
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const loginData = await loginRes.json().catch(() => ({}));
  if (loginData.user) return;

  const registerRes = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!registerRes.ok && registerRes.status !== 409) {
    const body = await registerRes.text().catch(() => '');
    throw new Error(`Could not create verify user "${username}": ${registerRes.status} ${body}`);
  }
}

async function verifyAusfWitnessPdfs() {
  console.log('\n[electron:build] Verifying AUSF + Witness PDF layout (production build)…\n');
  startBackground('node', ['server/server.js'], {
    PORT: API_PORT,
    ELECTRON_SERVE: '1',
    STATIC_DIR,
    DATA_DIR,
    ELECTRON_STRICT_PORTS: '1',
  });

  const appReady = await waitForUrl(APP_URL);
  const apiReady = await waitForUrl(`${API_URL}/api/health`);
  if (!appReady || !apiReady) {
    throw new Error(
      `App/API not ready (app=${appReady}, api=${apiReady}). Expected ${APP_URL} and ${API_URL}/api/health`,
    );
  }

  await ensureVerifyUser();

  await run('node', ['scripts/verify-ausf-witness-pdf.mjs'], {
    VERIFY_APP_URL: APP_URL,
    VERIFY_API_URL: API_URL,
    VERIFY_SKIP_SERVER_START: '1',
    VERIFY_USERNAME: process.env.VERIFY_USERNAME || 'admin',
    VERIFY_PASSWORD: process.env.VERIFY_PASSWORD || 'ccro123',
  });
}

async function main() {
  try {
    console.log('[electron:build] vite build --mode electron');
    await run('npx', ['vite', 'build', '--mode', 'electron']);

    if (process.env.SKIP_PDF_VERIFY !== '1') {
      await verifyAusfWitnessPdfs();
    } else {
      console.log('[electron:build] SKIP_PDF_VERIFY=1 — skipping PDF verification');
    }

    console.log('\n[electron:build] electron-builder');
    await run('npx', ['electron-builder']);
    console.log('\n[electron:build] Done.');
  } finally {
    stopBackgroundChildren();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

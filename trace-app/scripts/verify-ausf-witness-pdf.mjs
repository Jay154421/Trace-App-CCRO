/**
 * Generate AUSF + Witness affidavit PDFs via the app UI and verify page margins.
 * Usage: node scripts/verify-ausf-witness-pdf.mjs
 * Requires: dev server (5174) + API (3001) running, or starts them automatically.
 */
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(__dirname, 'output', 'pdf-verify');
const VITE_URL = process.env.VERIFY_APP_URL || 'http://localhost:5174';
const API_URL = process.env.VERIFY_API_URL || 'http://localhost:3001';
const SKIP_SERVER_START = process.env.VERIFY_SKIP_SERVER_START === '1';
const VERIFY_USERNAME = process.env.VERIFY_USERNAME || 'admin';
const VERIFY_PASSWORD = process.env.VERIFY_PASSWORD || 'ccro123';

const AUSF_CHILD_ID = '1';
/** Resolved after load (redirects to age-appropriate variant). */
let ausfPathSegment = 'ausf-only';
const WITNESS_CHILD_ID = '1';

/** Long bond: 8.5×13 in; CSS padding 0.3in sides 1in (07-17 long uses 0.15in top). */
const EXPECTED = {
  long: {
    pageAspect: 8.5 / 13,
    paddingSidesIn: 1,
    paddingTopIn07: 0.15,
    paddingTopInDefault: 0.3,
    toleranceIn: 0.08,
    letterboxTolerance: 0.02,
  },
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForUrl(url, attempts = 60) {
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

function startProcess(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    shell: true,
    stdio: 'ignore',
    detached: true,
  });
  child.unref();
  return child;
}

async function ensureServers() {
  if (SKIP_SERVER_START) {
    const viteOk = await waitForUrl(VITE_URL, 90);
    const apiOk = await waitForUrl(`${API_URL}/api/health`, 90);
    if (!viteOk || !apiOk) {
      throw new Error(
        `App/API not reachable at ${VITE_URL} and ${API_URL} (VERIFY_SKIP_SERVER_START=1)`,
      );
    }
    return null;
  }

  const viteOk = await waitForUrl(VITE_URL, 3);
  const apiOk = await waitForUrl(`${API_URL}/api/health`, 3).catch(() => false);
  if (viteOk && apiOk) return null;

  console.log('Starting dev server + Vite…');
  startProcess('npm', ['run', 'dev:server'], ROOT);
  startProcess('npm', ['run', 'dev:vite'], ROOT);

  const ready =
    (await waitForUrl(VITE_URL, 90)) &&
    (await waitForUrl(`${API_URL}/api/children/${AUSF_CHILD_ID}`, 90).catch(() => true));
  if (!ready) throw new Error('Dev servers did not become ready in time.');
  return true;
}

function parsePdfImagePlacement(pdfBuffer) {
  const text = pdfBuffer.toString('latin1');
  const pageMatch = text.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
  const pageW = pageMatch ? parseFloat(pageMatch[1]) : null;
  const pageH = pageMatch ? parseFloat(pageMatch[2]) : null;

  const imgMatches = [...text.matchAll(/(\d+\.?\d*)\s+0\s+0\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+cm[\s\S]*?\/Image/g)];
  let last = null;
  for (const m of imgMatches) {
    last = {
      drawW: parseFloat(m[1]),
      drawH: parseFloat(m[2]),
      x: parseFloat(m[3]),
      y: parseFloat(m[4]),
    };
  }
  if (!last && pageW) {
    const alt = text.match(/(\d+\.?\d*)\s+0\s+0\s+(\d+\.?\d*)\s+([\d.]+)\s+([\d.]+)\s+cm/);
    if (alt) {
      last = {
        drawW: parseFloat(alt[1]),
        drawH: parseFloat(alt[2]),
        x: parseFloat(alt[3]),
        y: parseFloat(alt[4]),
      };
    }
  }

  return { pageW, pageH, image: last };
}

function analyzePdfMargins(name, pdfPath, expectedPageAspect) {
  const buf = readFileSync(pdfPath);
  const { pageW, pageH, image } = parsePdfImagePlacement(buf);
  const issues = [];

  if (!pageW || !pageH) {
    issues.push('Could not read PDF MediaBox');
  } else {
    const aspect = pageW / pageH;
    if (Math.abs(aspect - expectedPageAspect) > 0.02) {
      issues.push(`Page aspect ${aspect.toFixed(3)} expected ~${expectedPageAspect.toFixed(3)}`);
    }
  }

  if (!image) {
    issues.push('Could not find embedded image placement in PDF');
  } else {
    const letterboxX = image.x;
    const letterboxY = image.y;
    if (pageW && letterboxX > EXPECTED.long.letterboxTolerance * pageW) {
      issues.push(`Horizontal letterbox ${letterboxX.toFixed(3)}in (content not full width)`);
    }
    if (pageH && letterboxY > EXPECTED.long.letterboxTolerance * pageH) {
      issues.push(`Vertical letterbox ${letterboxY.toFixed(3)}in (content not full height)`);
    }
    if (pageW && image.drawW < pageW * 0.98) {
      issues.push(`Image width ${image.drawW.toFixed(3)}in < page ${pageW.toFixed(3)}in`);
    }
  }

  return { name, pageW, pageH, image, issues, ok: issues.length === 0 };
}

async function login(page) {
  await page.goto(`${VITE_URL}/login`);
  await page.fill('#username', VERIFY_USERNAME);
  await page.fill('#password', VERIFY_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}

async function readDomMargins(page) {
  return page.evaluate(() => {
    const doc = document.querySelector('.ausf-doc.print-doc');
    if (!doc) return null;
    const style = getComputedStyle(doc);
    const article = doc.closest('article');
    const toIn = (px) => px / 96;
    const pad = {
      top: style.paddingTop,
      right: style.paddingRight,
      bottom: style.paddingBottom,
      left: style.paddingLeft,
    };
    const rect = doc.getBoundingClientRect();
    const articleRect = article?.getBoundingClientRect();
    return {
      pad,
      docClass: doc.className,
      docWidthIn: toIn(rect.width),
      docHeightIn: toIn(rect.height),
      articleWidthIn: articleRect ? toIn(articleRect.width) : null,
      articleHeightIn: articleRect ? toIn(articleRect.height) : null,
    };
  });
}

async function exportPdfFromPrintPage(page, outFile) {
  await page.waitForSelector('.ausf-doc.print-doc', { timeout: 20000 });
  await sleep(800);

  const previewBtn = page.getByRole('button', { name: /Preview PDF/i });
  await previewBtn.click();

  const iframe = page.locator('iframe[title*="PDF preview"], iframe[title*="preview"]');
  await iframe.waitFor({ state: 'attached', timeout: 120000 });

  const src = await iframe.getAttribute('src');
  let pdfBuf;
  if (src?.startsWith('blob:')) {
    const base64 = await page.evaluate(async (blobUrl) => {
      const res = await fetch(blobUrl);
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      bytes.forEach((b) => {
        binary += String.fromCharCode(b);
      });
      return btoa(binary);
    }, src);
    pdfBuf = Buffer.from(base64, 'base64');
  } else if (src?.startsWith('data:application/pdf')) {
    pdfBuf = Buffer.from(src.split(',')[1], 'base64');
  } else {
    throw new Error(`Preview iframe did not receive a PDF URL (got: ${src?.slice(0, 40) ?? 'none'})`);
  }
  writeFileSync(outFile, pdfBuf);

  await page.getByRole('button', { name: /^Close$/i }).click();
  return pdfBuf.length;
}

async function launchBrowser(chromium) {
  const launchOptions = { headless: true };
  for (const channel of ['msedge', 'chrome']) {
    try {
      return await chromium.launch({ ...launchOptions, channel });
    } catch {
      /* try next channel */
    }
  }
  return chromium.launch(launchOptions);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  await ensureServers();

  const { chromium } = await import('playwright');
  const browser = await launchBrowser(chromium);
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();

  const results = [];

  try {
    await login(page);

    const ausfEntryUrl = `${VITE_URL}/children/${AUSF_CHILD_ID}/ausf-0-6`;
    console.log(`AUSF: ${ausfEntryUrl}`);
    await page.goto(ausfEntryUrl, { waitUntil: 'networkidle' });
    await page.waitForURL(/\/ausf-/, { timeout: 30000 });
    await page.waitForSelector('input[name="ausf-paper-size"], .ausf-doc.print-doc', { timeout: 30000 });
    await page.locator('label:has-text("Long") input').first().check({ force: true }).catch(() => {});

    ausfPathSegment = new URL(page.url()).pathname.split('/').pop() || ausfPathSegment;
    const ausfDom = await readDomMargins(page);
    const ausfPdfPath = join(OUT_DIR, `ausf-${ausfPathSegment}-long.pdf`);
    const ausfBytes = await exportPdfFromPrintPage(page, ausfPdfPath);
    const ausfLabel = `AUSF (${ausfPathSegment}) Long`;
    const ausfPdf = analyzePdfMargins(ausfLabel, ausfPdfPath, EXPECTED.long.pageAspect);

    const is0717 = ausfDom?.docClass?.includes('ausf-07-17-doc');
    const expectedTop = is0717 ? '14.4px' : '28.8px';
    if (ausfDom?.pad?.top !== expectedTop && ausfDom?.pad?.top !== (is0717 ? '0.15in' : '0.3in')) {
      ausfPdf.issues.push(
        `${ausfLabel} top padding is ${ausfDom?.pad?.top} (expected ${is0717 ? '0.15in' : '0.3in'})`,
      );
      ausfPdf.ok = ausfPdf.issues.length === 0;
    }

    results.push({ ...ausfPdf, dom: ausfDom, bytes: ausfBytes, path: ausfPdfPath });

    const witnessUrl = `${VITE_URL}/children/${WITNESS_CHILD_ID}/witness-affidavit/print`;
    console.log(`Witness: ${witnessUrl}`);
    await page.goto(witnessUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('input[name="witness-paper-size"]', { timeout: 15000 }).catch(() => {});
    await page.locator('label:has-text("Long") input').first().check({ force: true }).catch(() => {});

    const witDom = await readDomMargins(page);
    const witPdfPath = join(OUT_DIR, 'witness-affidavit-long.pdf');
    const witBytes = await exportPdfFromPrintPage(page, witPdfPath);
    const witPdf = analyzePdfMargins('Witness Affidavit Long', witPdfPath, EXPECTED.long.pageAspect);

    results.push({ ...witPdf, dom: witDom, bytes: witBytes, path: witPdfPath });
  } finally {
    await browser.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    results,
  };
  const reportPath = join(OUT_DIR, 'report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n--- PDF verification report ---\n');
  for (const r of results) {
    console.log(`${r.name}: ${r.ok ? 'PASS' : 'FAIL'} (${r.bytes} bytes)`);
    console.log(`  File: ${r.path}`);
    if (r.pageW) console.log(`  Page: ${r.pageW}×${r.pageH} pt`);
    if (r.image) {
      console.log(
        `  Image: ${r.image.drawW.toFixed(3)}×${r.image.drawH.toFixed(3)} in @ (${r.image.x.toFixed(3)}, ${r.image.y.toFixed(3)})`,
      );
    }
    if (r.dom) {
      console.log(
        `  DOM padding: top=${r.dom.pad.top} right=${r.dom.pad.right} bottom=${r.dom.pad.bottom} left=${r.dom.pad.left}`,
      );
      console.log(`  DOM size: ${r.dom.docWidthIn?.toFixed(2)}×${r.dom.docHeightIn?.toFixed(2)} in`);
    }
    for (const issue of r.issues) console.log(`  ! ${issue}`);
    console.log('');
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error(`${failed.length} document(s) failed margin/layout checks. See ${reportPath}`);
    process.exit(1);
  }
  console.log(`All checks passed. Report: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

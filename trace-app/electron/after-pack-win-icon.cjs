const fs = require('fs');
const os = require('os');
const path = require('path');
const png2icons = require('png2icons');

/**
 * Embeds the CCRO logo into the Windows .exe. With `signAndEditExecutable: false`,
 * electron-builder skips rcedit, so the taskbar / shortcut still show the default
 * Electron icon unless we patch the executable here.
 */
module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const projectDir = context.packager.projectDir;
  const pngPath = path.join(projectDir, 'public', 'ccro-logo.png');
  if (!fs.existsSync(pngPath)) {
    console.warn('[afterPack] CCRO icon not found:', pngPath);
    return;
  }

  const productName = context.packager.appInfo.productFilename;
  const exePath = path.join(context.appOutDir, `${productName}.exe`);
  if (!fs.existsSync(exePath)) {
    console.warn('[afterPack] exe not found:', exePath);
    return;
  }

  const input = fs.readFileSync(pngPath);
  // All-PNG ICO + BEZIER resampling: sharper than BMP chunks used for 16–48px in forWinExe mode.
  let icoBuffer = png2icons.createICO(input, png2icons.BEZIER, 0, true, false);
  if (!icoBuffer) {
    icoBuffer = png2icons.createICO(input, png2icons.BICUBIC2, 0, false, true);
  }
  if (!icoBuffer) {
    console.warn('[afterPack] failed to build ICO from PNG');
    return;
  }

  const icoPath = path.join(os.tmpdir(), `btrace-embed-icon-${Date.now()}.ico`);
  fs.writeFileSync(icoPath, icoBuffer);

  try {
    const { rcedit } = await import('rcedit');
    await rcedit(exePath, { icon: icoPath });
  } finally {
    try {
      fs.unlinkSync(icoPath);
    } catch {
      /* ignore */
    }
  }
};

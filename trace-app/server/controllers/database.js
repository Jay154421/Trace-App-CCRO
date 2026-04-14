const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const {
  flushToDisk,
  reloadFromDisk,
  getDbPath,
  getAttachmentsDir,
  isSqliteFile,
} = require('../db');

function getInfo(req, res) {
  try {
    const dbFile = getDbPath();
    const attachmentsDir = getAttachmentsDir();
    res.json({
      dbPath: path.resolve(dbFile),
      dataDir: path.resolve(path.dirname(dbFile)),
      dbExists: fs.existsSync(dbFile),
      attachmentsDir: path.resolve(attachmentsDir),
    });
  } catch (err) {
    console.error('Get database info error:', err);
    res.status(500).json({ error: err.message || 'Failed to read database info.' });
  }
}

function exportDatabase(req, res) {
  try {
    flushToDisk();
    const dbFile = getDbPath();
    const attachmentsDir = getAttachmentsDir();
    if (!fs.existsSync(dbFile)) {
      return res.status(404).json({
        error: 'No database file found to export.',
        dbPath: path.resolve(dbFile),
      });
    }
    const zip = new JSZip();
    zip.file('trace.db', fs.readFileSync(dbFile));

    const attachmentsFolder = zip.folder('attachments');
    if (fs.existsSync(attachmentsDir)) {
      for (const name of fs.readdirSync(attachmentsDir)) {
        const filePath = path.join(attachmentsDir, name);
        if (fs.statSync(filePath).isFile()) {
          attachmentsFolder.file(name, fs.readFileSync(filePath));
        }
      }
    }

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const filename = `trace-backup-${stamp}.zip`;
    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
      .then((buf) => {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buf);
      })
      .catch((err) => {
        console.error('Export database zip error:', err);
        res.status(500).json({ error: err.message || 'Export failed.' });
      });
  } catch (err) {
    console.error('Export database error:', err);
    res.status(500).json({ error: err.message || 'Export failed.' });
  }
}

async function importDatabase(req, res) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Upload a .zip backup file (field name: file).' });
    }
    const zip = await JSZip.loadAsync(req.file.buffer);
    const dbEntry = zip.file('trace.db');
    if (!dbEntry) {
      return res.status(400).json({ error: 'Backup zip must contain trace.db at root.' });
    }
    const dbBuf = Buffer.from(await dbEntry.async('uint8array'));
    if (!isSqliteFile(dbBuf)) {
      return res.status(400).json({ error: 'Uploaded file is not a valid SQLite database.' });
    }
    const dbFile = getDbPath();
    const attachmentsDir = getAttachmentsDir();
    const dataDir = path.dirname(dbFile);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(attachmentsDir)) fs.mkdirSync(attachmentsDir, { recursive: true });

    for (const name of fs.readdirSync(attachmentsDir)) {
      const filePath = path.join(attachmentsDir, name);
      if (fs.statSync(filePath).isFile()) fs.unlinkSync(filePath);
    }

    for (const [entryPath, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      const normalized = entryPath.replace(/\\/g, '/');
      if (!normalized.startsWith('attachments/')) continue;
      const name = normalized.slice('attachments/'.length);
      if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) continue;
      if (!/^[a-zA-Z0-9._-]+$/.test(name)) continue;
      const content = await entry.async('nodebuffer');
      fs.writeFileSync(path.join(attachmentsDir, name), content);
    }

    fs.writeFileSync(dbFile, dbBuf);
    reloadFromDisk();
    res.json({ ok: true });
  } catch (err) {
    console.error('Import database error:', err);
    res.status(500).json({ error: err.message || 'Import failed.' });
  }
}

module.exports = { getInfo, exportDatabase, importDatabase };

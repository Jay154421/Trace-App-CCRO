const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const JSZip = require('jszip');
const {
  flushToDisk,
  getDb,
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
  let importedDb = null;
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

    const SQL = await initSqlJs();
    importedDb = new SQL.Database(new Uint8Array(dbBuf));
    const importedChildren = selectAll(importedDb, 'SELECT * FROM children ORDER BY id');
    const importedChecklist = selectAll(importedDb, 'SELECT * FROM checklist_items ORDER BY id');

    const db = getDb();
    const existingChildren = db.prepare('SELECT * FROM children').all();
    const existingChildIdByKey = new Map(existingChildren.map((row) => [buildApplicantKey(row), Number(row.id)]));
    const importedToCurrentChildId = new Map();

    const attachmentsDir = getAttachmentsDir();
    if (!fs.existsSync(attachmentsDir)) fs.mkdirSync(attachmentsDir, { recursive: true });

    const existingChecklistRows = db.prepare(
      'SELECT id, child_id, category, label, required, checked, notes, attachment FROM checklist_items'
    ).all();
    const checklistByChildKey = new Map();
    for (const row of existingChecklistRows) {
      const key = buildChecklistKey(row.category, row.label);
      if (!key) continue;
      checklistByChildKey.set(`${Number(row.child_id)}|${key}`, row);
    }

    let addedApplicants = 0;
    let skippedApplicants = 0;
    let addedChecklistItems = 0;
    let copiedAttachments = 0;

    for (const child of importedChildren) {
      const key = buildApplicantKey(child);
      const existingId = existingChildIdByKey.get(key);
      if (existingId) {
        importedToCurrentChildId.set(Number(child.id), existingId);
        skippedApplicants += 1;
        continue;
      }

      const inserted = db.prepare(
        `INSERT INTO children (
          first_name, middle_name, last_name, date_of_birth, place_of_birth, contact_no, age_group,
          registrant_deceased, hilot_deceased, parent_foreigner, certificate_of_live_birth, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        toNullableString(child.first_name),
        toNullableString(child.middle_name),
        toNullableString(child.last_name),
        toNullableString(child.date_of_birth),
        toNullableString(child.place_of_birth),
        toNullableString(child.contact_no),
        toNullableString(child.age_group),
        toIntBool(child.registrant_deceased),
        toIntBool(child.hilot_deceased),
        toIntBool(child.parent_foreigner),
        toNullableString(child.certificate_of_live_birth),
        toNullableString(child.created_at),
        toNullableString(child.updated_at)
      );
      const newId = Number(inserted.lastInsertRowid);
      importedToCurrentChildId.set(Number(child.id), newId);
      existingChildIdByKey.set(key, newId);
      addedApplicants += 1;
    }

    const attachmentNameMap = new Map();
    let mergedChecklistItems = 0;
    for (const row of importedChecklist) {
      const targetChildId = importedToCurrentChildId.get(Number(row.child_id));
      if (!targetChildId) continue;

      const attachmentNames = parseAttachmentColumn(row.attachment);
      const resolvedAttachmentNames = [];
      for (const oldName of attachmentNames) {
        if (!/^[a-zA-Z0-9._-]+$/.test(oldName)) continue;
        if (!attachmentNameMap.has(oldName)) {
          const zipEntry = zip.file(`attachments/${oldName}`);
          if (!zipEntry) {
            if (fs.existsSync(path.join(attachmentsDir, oldName))) {
              attachmentNameMap.set(oldName, oldName);
            } else {
              continue;
            }
          } else {
            const newName = reserveUniqueAttachmentName(attachmentsDir, oldName);
            const content = await zipEntry.async('nodebuffer');
            fs.writeFileSync(path.join(attachmentsDir, newName), content);
            attachmentNameMap.set(oldName, newName);
            copiedAttachments += 1;
          }
        }
        resolvedAttachmentNames.push(attachmentNameMap.get(oldName));
      }

      const category = toNullableString(row.category);
      const label = toNullableString(row.label);
      const checklistKey = buildChecklistKey(category, label);
      const existingChecklist = checklistByChildKey.get(`${targetChildId}|${checklistKey}`);

      if (!existingChecklist) {
        db.prepare(
          `INSERT INTO checklist_items (child_id, category, label, required, checked, notes, attachment)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          targetChildId,
          category,
          label,
          toIntBool(row.required),
          toIntBool(row.checked),
          toNullableString(row.notes),
          serializeAttachmentColumn(resolvedAttachmentNames)
        );
        const insertedChecklist = db.prepare(
          'SELECT id, child_id, category, label, required, checked, notes, attachment FROM checklist_items WHERE child_id = ? AND category = ? AND label = ? ORDER BY id DESC LIMIT 1'
        ).get(targetChildId, category, label);
        if (insertedChecklist && checklistKey) {
          checklistByChildKey.set(`${targetChildId}|${checklistKey}`, insertedChecklist);
        }
        addedChecklistItems += 1;
        continue;
      }

      const existingAttachmentNames = parseAttachmentColumn(existingChecklist.attachment);
      const mergedAttachmentNames = uniqueStrings([...existingAttachmentNames, ...resolvedAttachmentNames]);
      if (mergedAttachmentNames.length !== existingAttachmentNames.length) {
        // Non-destructive merge: keep existing row values; append only new attachments.
        db.prepare('UPDATE checklist_items SET attachment = ? WHERE id = ?').run(
          serializeAttachmentColumn(mergedAttachmentNames),
          Number(existingChecklist.id)
        );
        checklistByChildKey.set(`${targetChildId}|${checklistKey}`, {
          ...existingChecklist,
          attachment: serializeAttachmentColumn(mergedAttachmentNames),
        });
        mergedChecklistItems += 1;
      }
    }

    res.json({
      ok: true,
      summary: {
        addedApplicants,
        skippedApplicants,
        addedChecklistItems,
        mergedChecklistItems,
        copiedAttachments,
      },
    });
  } catch (err) {
    console.error('Import database error:', err);
    res.status(500).json({ error: err.message || 'Import failed.' });
  } finally {
    if (importedDb) {
      try {
        importedDb.close();
      } catch (_) {
        // ignore close failure
      }
    }
  }
}

function selectAll(sqlDb, sql) {
  const stmt = sqlDb.prepare(sql);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function toNullableString(value) {
  const str = String(value ?? '').trim();
  return str ? str : null;
}

function toIntBool(value) {
  return Number(value) ? 1 : 0;
}

function buildApplicantKey(row) {
  const normalizedDob = normalizeDateOnly(row.date_of_birth);
  return [
    normalizeText(row.first_name),
    normalizeText(row.middle_name),
    normalizeText(row.last_name),
    normalizedDob,
    normalizeText(row.place_of_birth),
  ].join('|');
}

function normalizeDateOnly(value) {
  const text = String(value || '').trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = new Date(text);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return normalizeText(text);
}

function parseAttachmentColumn(attachment) {
  if (!attachment) return [];
  if (typeof attachment === 'string' && attachment.startsWith('[')) {
    try {
      return JSON.parse(attachment).filter((v) => typeof v === 'string' && v.trim());
    } catch {
      return [];
    }
  }
  if (typeof attachment === 'string' && attachment.trim()) return [attachment.trim()];
  return [];
}

function serializeAttachmentColumn(filenames) {
  if (!Array.isArray(filenames) || filenames.length === 0) return null;
  if (filenames.length === 1) return filenames[0];
  return JSON.stringify(filenames);
}

function reserveUniqueAttachmentName(attachmentsDir, filename) {
  let candidate = filename;
  const parsed = path.parse(filename);
  let i = 1;
  while (fs.existsSync(path.join(attachmentsDir, candidate))) {
    candidate = `${parsed.name}_${i}${parsed.ext}`;
    i += 1;
  }
  return candidate;
}

function uniqueStrings(values) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    const v = String(value || '').trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function buildChecklistKey(category, label) {
  const c = normalizeText(category);
  const l = normalizeText(label);
  if (!c || !l) return '';
  return `${c}|${l}`;
}

module.exports = { getInfo, exportDatabase, importDatabase };

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
    const db = getDb();
    const totals = db.prepare('SELECT COUNT(*) AS total FROM children').get();
    const applicantCount = Number(totals?.total || 0);
    if (applicantCount === 0) {
      return res.status(400).json({ error: 'Nothing to export yet. No applicants found in the system.' });
    }
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

    const result = await db.transaction(async () => {
      let addedApplicants = 0;
      let skippedApplicants = 0;
      let addedChecklistItems = 0;
      let copiedAttachments = 0;
      let mergedChecklistItems = 0;

      for (const child of importedChildren) {
        const normalizedChild = normalizeImportChildRow(child);
        if (!normalizedChild) {
          skippedApplicants += 1;
          continue;
        }
        const key = buildApplicantKey(normalizedChild);
        const existingId = existingChildIdByKey.get(key);
        if (existingId) {
          importedToCurrentChildId.set(Number(child.id), existingId);
          skippedApplicants += 1;
          continue;
        }

        const inserted = db.prepare(
          `INSERT INTO children (
            first_name, middle_name, last_name, date_of_birth, place_of_birth, contact_no, age_group,
            registrant_deceased, hilot_deceased, parent_foreigner, out_of_town, has_marriage_certificate, certificate_of_live_birth,
            paternity_affidavit, delayed_registration_affidavit,
            staff_process_status, created_at, updated_at, application_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          normalizedChild.first_name,
          normalizedChild.middle_name,
          normalizedChild.last_name,
          normalizedChild.date_of_birth,
          normalizedChild.place_of_birth,
          normalizedChild.contact_no,
          normalizedChild.age_group,
          normalizedChild.registrant_deceased,
          normalizedChild.hilot_deceased,
          normalizedChild.parent_foreigner,
          normalizedChild.out_of_town,
          normalizedChild.has_marriage_certificate,
          normalizedChild.certificate_of_live_birth,
          normalizedChild.paternity_affidavit,
          normalizedChild.delayed_registration_affidavit,
          normalizedChild.staff_process_status,
          normalizedChild.created_at,
          normalizedChild.updated_at,
          normalizedChild.application_type
        );
        const newId = Number(inserted.lastInsertRowid);
        importedToCurrentChildId.set(Number(child.id), newId);
        existingChildIdByKey.set(key, newId);
        addedApplicants += 1;
      }

      const attachmentNameMap = new Map();
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

      return {
        addedApplicants,
        skippedApplicants,
        addedChecklistItems,
        mergedChecklistItems,
        copiedAttachments,
      };
    });

    res.json({
      ok: true,
      summary: result,
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

function normalizeOptionalText(value) {
  const str = String(value ?? '').trim();
  return str.length > 0 ? str : null;
}

function normalizeRequiredText(value, fallback = '') {
  const str = String(value ?? '').trim();
  return str.length > 0 ? str : fallback;
}

function normalizeImportChildRow(child) {
  const firstName = normalizeRequiredText(child.first_name);
  const lastName = normalizeRequiredText(child.last_name);
  const dateOfBirth = normalizeDateOnly(child.date_of_birth || '');
  if (!firstName || !lastName || !dateOfBirth) return null;
  const rawStaff = child.staff_process_status;
  const staff_process_status =
    rawStaff === 'under_process' || rawStaff === 'verified' ? rawStaff : null;
  const rawAppType = String(child.application_type || '').trim().toLowerCase();
  const application_type = rawAppType === 'colb_brap' ? 'colb_brap' : 'applicant';
  const age_group =
    application_type === 'colb_brap' ? null : normalizeOptionalText(child.age_group);

  return {
    first_name: firstName,
    middle_name: normalizeOptionalText(child.middle_name),
    last_name: lastName,
    date_of_birth: dateOfBirth,
    place_of_birth: normalizeOptionalText(child.place_of_birth),
    contact_no: normalizeOptionalText(child.contact_no),
    age_group,
    registrant_deceased: toIntBool(child.registrant_deceased),
    hilot_deceased: toIntBool(child.hilot_deceased),
    parent_foreigner: toIntBool(child.parent_foreigner),
    out_of_town: toIntBool(child.out_of_town),
    has_marriage_certificate: toIntBool(child.has_marriage_certificate),
    certificate_of_live_birth: normalizeOptionalText(child.certificate_of_live_birth),
    paternity_affidavit: normalizeOptionalText(child.paternity_affidavit),
    delayed_registration_affidavit: normalizeOptionalText(child.delayed_registration_affidavit),
    staff_process_status,
    created_at: normalizeOptionalText(child.created_at),
    updated_at: normalizeOptionalText(child.updated_at),
    application_type,
  };
}

function toIntBool(value) {
  return Number(value) ? 1 : 0;
}

function buildApplicantKey(row) {
  const normalizedDob = normalizeDateOnly(row.date_of_birth || '');
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

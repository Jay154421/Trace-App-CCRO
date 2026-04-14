const path = require('path');
const fs = require('fs');
const childModel = require('../models/child');
const requirementsModel = require('../models/requirements');
const { getDb, getAttachmentsDir } = require('../db');

function safeAttachmentFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function buildStoredAttachmentFilename(rawFilename, fallbackBase, duplicateIndex) {
  const parsed = path.parse(rawFilename || '');
  const safeBase = safeAttachmentFilename(parsed.name || fallbackBase || 'attachment');
  const safeExt = safeAttachmentFilename(parsed.ext || '.jpg');
  if (duplicateIndex > 0) {
    return `${safeBase}_${duplicateIndex}${safeExt}`;
  }
  return `${safeBase}${safeExt}`;
}

function list(req, res) {
  try {
    const rows = childModel.all();
    res.json(rows);
  } catch (err) {
    console.error('List children error:', err);
    res.status(500).json({ error: 'Failed to list children' });
  }
}

function get(req, res) {
  const id = Number(req.params.id);
  const row = childModel.findById(id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const reqs = requirementsModel.getRequirementsForChild(row);
  const db = getDb();
  const checklist = db.prepare('SELECT * FROM checklist_items WHERE child_id = ? ORDER BY category, id').all(id);
  const allowedChecklistKeys = new Set(
    (reqs?.all || []).map((requirement) => `${requirement.category}:${requirement.label}`)
  );
  const filteredChecklist = checklist.filter((item) =>
    allowedChecklistKeys.has(`${item.category}:${item.label}`)
  );
  res.json({ ...row, requirements: reqs, checklist: filteredChecklist });
}

function create(req, res) {
  try {
    const id = childModel.create(req.body);
    res.status(201).json({ id });
  } catch (err) {
    console.error('Create child error:', err);
    res.status(500).json({ error: 'Failed to create child' });
  }
}

function update(req, res) {
  const id = Number(req.params.id);
  const ok = childModel.update(id, req.body);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
}

function remove(req, res) {
  try {
    const id = Number(req.params.id);
    const ok = childModel.remove(id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Remove child error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete applicant' });
  }
}

function updateChecklist(req, res) {
  try {
    const childId = Number(req.params.id);
    const child = childModel.findById(childId);
    if (!child) return res.status(404).json({ error: 'Not found' });
    const items = req.body?.items;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });
    const attachmentsDir = getAttachmentsDir();
    if (!fs.existsSync(attachmentsDir)) fs.mkdirSync(attachmentsDir, { recursive: true });
    const db = getDb();
    db.prepare('DELETE FROM checklist_items WHERE child_id = ?').run(childId);
    const insertSql = 'INSERT INTO checklist_items (child_id, category, label, required, checked, notes, attachment) VALUES (?, ?, ?, ?, ?, ?, ?)';
    for (const it of items) {
      const existingFilenames = Array.isArray(it.attachmentFilenames)
        ? it.attachmentFilenames.filter((f) => typeof f === 'string' && /^[a-zA-Z0-9._-]+$/.test(f))
        : typeof it.attachment === 'string' && /^[a-zA-Z0-9._-]+$/.test(it.attachment)
          ? [it.attachment]
          : [];
      const newFiles = Array.isArray(it.attachments) ? it.attachments : [];
      if (it.attachmentBase64 && it.attachmentFilename) {
        newFiles.push({ attachmentBase64: it.attachmentBase64, attachmentFilename: it.attachmentFilename });
      }
      const fallbackBase = `${childId}_${safeAttachmentFilename(it.category || 'general')}_${safeAttachmentFilename(it.label || 'doc')}`;
      const savedFilenames = [];
      for (let i = 0; i < newFiles.length; i++) {
        const f = newFiles[i];
        if (!f.attachmentBase64 || !f.attachmentFilename) continue;
        let duplicateIndex = 0;
        let filename = buildStoredAttachmentFilename(f.attachmentFilename, fallbackBase, duplicateIndex);
        let filePath = path.join(attachmentsDir, filename);
        while (fs.existsSync(filePath)) {
          duplicateIndex += 1;
          filename = buildStoredAttachmentFilename(f.attachmentFilename, fallbackBase, duplicateIndex);
          filePath = path.join(attachmentsDir, filename);
        }
        const buf = Buffer.from(f.attachmentBase64, 'base64');
        fs.writeFileSync(filePath, buf);
        savedFilenames.push(filename);
      }
      const allFilenames = [...existingFilenames, ...savedFilenames];
      const attachmentPath = allFilenames.length === 0 ? null : allFilenames.length === 1 ? allFilenames[0] : JSON.stringify(allFilenames);
      db.prepare(insertSql).run(
        childId,
        it.category || 'general',
        it.label || '',
        it.required ? 1 : 0,
        it.checked ? 1 : 0,
        it.notes ?? null,
        attachmentPath
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('updateChecklist error:', err);
    res.status(500).json({ error: err.message || 'Failed to save checklist' });
  }
}

function parseAttachmentColumn(attachment) {
  if (!attachment) return [];
  if (typeof attachment === 'string' && attachment.startsWith('[')) {
    try {
      return JSON.parse(attachment);
    } catch {
      return [attachment];
    }
  }
  return [attachment];
}

function getChecklistAttachment(req, res) {
  const childId = Number(req.params.id);
  const filename = req.params.filename;
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) return res.status(400).json({ error: 'Invalid filename' });
  const child = childModel.findById(childId);
  if (!child) return res.status(404).json({ error: 'Not found' });
  const db = getDb();
  const rows = db.prepare('SELECT attachment FROM checklist_items WHERE child_id = ?').all(childId);
  const hasFile = rows.some((row) => {
    const list = parseAttachmentColumn(row.attachment);
    return list.includes(filename);
  });
  if (!hasFile) return res.status(404).json({ error: 'Attachment not found' });
  const filePath = path.join(getAttachmentsDir(), filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.sendFile(path.resolve(filePath));
}

function updateCertificateOfLiveBirth(req, res) {
  const id = Number(req.params.id);
  const child = childModel.findById(id);
  if (!child) return res.status(404).json({ error: 'Not found' });
  const data = req.body && typeof req.body === 'object' ? req.body : {};
  const ok = childModel.updateCertificateOfLiveBirth(id, data);
  if (!ok) return res.status(500).json({ error: 'Failed to save certificate' });
  res.json({ ok: true });
}

module.exports = { list, get, create, update, remove, updateChecklist, getChecklistAttachment, updateCertificateOfLiveBirth };

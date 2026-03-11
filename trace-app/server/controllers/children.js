const path = require('path');
const fs = require('fs');
const childModel = require('../models/child');
const requirementsModel = require('../models/requirements');
const { getDb } = require('../db');

const ATTACHMENTS_DIR = path.join(__dirname, '../../data/attachments');

function safeAttachmentFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
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
  const reqs = requirementsModel.getRequirementsForAgeGroup(row.age_group);
  const db = getDb();
  const checklist = db.prepare('SELECT * FROM checklist_items WHERE child_id = ? ORDER BY category, id').all(id);
  res.json({ ...row, requirements: reqs, checklist });
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
  const id = Number(req.params.id);
  const ok = childModel.remove(id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
}

function updateChecklist(req, res) {
  try {
    const childId = Number(req.params.id);
    const child = childModel.findById(childId);
    if (!child) return res.status(404).json({ error: 'Not found' });
    const items = req.body?.items;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });
    if (!fs.existsSync(ATTACHMENTS_DIR)) fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
    const db = getDb();
    db.prepare('DELETE FROM checklist_items WHERE child_id = ?').run(childId);
    const insertSql = 'INSERT INTO checklist_items (child_id, category, label, required, checked, notes, attachment) VALUES (?, ?, ?, ?, ?, ?, ?)';
    for (const it of items) {
      let attachmentPath = null;
      if (it.attachmentBase64 && it.attachmentFilename) {
        const base = `${childId}_${safeAttachmentFilename(it.category || 'general')}_${safeAttachmentFilename(it.label || 'doc')}`;
        const ext = path.extname(it.attachmentFilename) || '';
        const filename = `${base}_${Date.now()}${ext}`;
        const filePath = path.join(ATTACHMENTS_DIR, filename);
        const buf = Buffer.from(it.attachmentBase64, 'base64');
        fs.writeFileSync(filePath, buf);
        attachmentPath = filename;
      } else if (typeof it.attachment === 'string' && /^[a-zA-Z0-9._-]+$/.test(it.attachment)) {
        attachmentPath = it.attachment;
      }
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

function getChecklistAttachment(req, res) {
  const childId = Number(req.params.id);
  const filename = req.params.filename;
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) return res.status(400).json({ error: 'Invalid filename' });
  const child = childModel.findById(childId);
  if (!child) return res.status(404).json({ error: 'Not found' });
  const db = getDb();
  const row = db.prepare('SELECT 1 FROM checklist_items WHERE child_id = ? AND attachment = ?').get(childId, filename);
  if (!row) return res.status(404).json({ error: 'Attachment not found' });
  const filePath = path.join(ATTACHMENTS_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.sendFile(path.resolve(filePath));
}

module.exports = { list, get, create, update, remove, updateChecklist, getChecklistAttachment };

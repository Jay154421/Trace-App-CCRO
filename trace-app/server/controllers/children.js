const childModel = require('../models/child');
const requirementsModel = require('../models/requirements');
const { getDb } = require('../db');

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
  const childId = Number(req.params.id);
  const child = childModel.findById(childId);
  if (!child) return res.status(404).json({ error: 'Not found' });
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });
  const db = getDb();
  db.prepare('DELETE FROM checklist_items WHERE child_id = ?').run(childId);
  const insert = db.prepare('INSERT INTO checklist_items (child_id, category, label, required, checked, notes) VALUES (?, ?, ?, ?, ?, ?)');
  for (const it of items) {
    insert.run(childId, it.category || 'general', it.label || '', it.required ? 1 : 0, it.checked ? 1 : 0, it.notes || null);
  }
  res.json({ ok: true });
}

module.exports = { list, get, create, update, remove, updateChecklist };

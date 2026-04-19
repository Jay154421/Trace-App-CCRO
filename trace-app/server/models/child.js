const { getDb } = require('../db');

function getAgeGroup(ageYears) {
  if (ageYears <= 6) return '1m1d_to_6';
  if (ageYears <= 17) return '7_to_17';
  if (ageYears < 60) return '18_to_59';
  return '60_plus';
}

function calculateAge(dob) {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function all() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM children ORDER BY updated_at DESC').all();
  const progressRows = db.prepare(
    'SELECT child_id, COUNT(*) AS total, SUM(checked) AS checked FROM checklist_items GROUP BY child_id'
  ).all();
  db.close();
  const progressByChild = Object.fromEntries(
    progressRows.map((p) => [p.child_id, { checklist_total: p.total, checklist_checked: p.checked ?? 0 }])
  );
  return rows.map((r) => {
    const progress = progressByChild[r.id] || { checklist_total: 0, checklist_checked: 0 };
    return {
      ...r,
      age: calculateAge(r.date_of_birth),
      age_group: r.age_group || getAgeGroup(calculateAge(r.date_of_birth)),
      checklist_total: progress.checklist_total,
      checklist_checked: progress.checklist_checked,
    };
  });
}

function findById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM children WHERE id = ?').get(id);
  db.close();
  if (!row) return null;
  let certificate_of_live_birth = {};
  if (row.certificate_of_live_birth) {
    try {
      certificate_of_live_birth = JSON.parse(row.certificate_of_live_birth);
    } catch (e) {
      certificate_of_live_birth = {};
    }
  }
  return {
    ...row,
    certificate_of_live_birth,
    age: calculateAge(row.date_of_birth),
    age_group: row.age_group || getAgeGroup(calculateAge(row.date_of_birth)),
  };
}

function updateCertificateOfLiveBirth(id, data) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM children WHERE id = ?').get(id);
  if (!existing) {
    db.close();
    return false;
  }
  const json = JSON.stringify(data || {});
  db.prepare('UPDATE children SET certificate_of_live_birth = ?, updated_at = datetime(\'now\') WHERE id = ?').run(json, id);
  db.close();
  return true;
}

function create(data) {
  const age = calculateAge(data.date_of_birth);
  const age_group = getAgeGroup(age);
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO children (first_name, middle_name, last_name, date_of_birth, place_of_birth, contact_no, age_group, registrant_deceased, hilot_deceased, parent_foreigner, out_of_town)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.first_name,
    data.middle_name || null,
    data.last_name,
    data.date_of_birth,
    data.place_of_birth || null,
    data.contact_no || null,
    age_group,
    data.registrant_deceased ? 1 : 0,
    data.hilot_deceased ? 1 : 0,
    data.parent_foreigner ? 1 : 0,
    data.out_of_town ? 1 : 0
  );
  db.close();
  return result.lastInsertRowid;
}

function update(id, data) {
  const age = data.date_of_birth ? calculateAge(data.date_of_birth) : null;
  const age_group = age != null ? getAgeGroup(age) : null;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM children WHERE id = ?').get(id);
  if (!existing) { db.close(); return false; }
  const registrantDeceased = data.registrant_deceased !== undefined ? (data.registrant_deceased ? 1 : 0) : (existing.registrant_deceased ? 1 : 0);
  const hilotDeceased = data.hilot_deceased !== undefined ? (data.hilot_deceased ? 1 : 0) : (existing.hilot_deceased ? 1 : 0);
  const parentForeigner = data.parent_foreigner !== undefined ? (data.parent_foreigner ? 1 : 0) : (existing.parent_foreigner ? 1 : 0);
  const outOfTown = data.out_of_town !== undefined ? (data.out_of_town ? 1 : 0) : (existing.out_of_town ? 1 : 0);
  const stmt = db.prepare(`
    UPDATE children SET
      first_name = ?, middle_name = ?, last_name = ?,
      date_of_birth = ?, place_of_birth = ?, contact_no = ?,
      age_group = COALESCE(?, age_group),
      registrant_deceased = ?, hilot_deceased = ?, parent_foreigner = ?, out_of_town = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(
    data.first_name ?? existing.first_name,
    data.middle_name !== undefined ? data.middle_name : existing.middle_name,
    data.last_name ?? existing.last_name,
    data.date_of_birth ?? existing.date_of_birth,
    data.place_of_birth !== undefined ? data.place_of_birth : existing.place_of_birth,
    data.contact_no !== undefined ? data.contact_no : existing.contact_no,
    age_group,
    registrantDeceased,
    hilotDeceased,
    parentForeigner,
    outOfTown,
    id
  );
  db.close();
  return true;
}

function remove(id) {
  const db = getDb();
  // sql.js only allows one active prepared statement per database; run each DELETE immediately.
  db.prepare('DELETE FROM documents WHERE child_id = ?').run(id);
  db.prepare('DELETE FROM checklist_items WHERE child_id = ?').run(id);
  const result = db.prepare('DELETE FROM children WHERE id = ?').run(id);
  db.close();
  return result.changes > 0;
}

function bulkRemove(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  const db = getDb();
  return db.transaction(() => {
    let deleted = 0;
    for (const id of ids) {
      db.prepare('DELETE FROM documents WHERE child_id = ?').run(id);
      db.prepare('DELETE FROM checklist_items WHERE child_id = ?').run(id);
      const result = db.prepare('DELETE FROM children WHERE id = ?').run(id);
      deleted += result.changes;
    }
    return deleted;
  });
}

module.exports = { all, findById, create, update, remove, bulkRemove, getAgeGroup, calculateAge, updateCertificateOfLiveBirth };

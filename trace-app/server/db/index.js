const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'trace.db');
let SQL = null;
let db = null;

function ensureDataDir() {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadDb(SQL) {
  ensureDataDir();
  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    return new SQL.Database(new Uint8Array(buf));
  }
  return new SQL.Database();
}

function saveDb() {
  if (!db) return;
  ensureDataDir();
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

async function init() {
  SQL = await initSqlJs();
  db = loadDb(SQL);
  db.save = saveDb;

  db.exec(`
    CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      middle_name TEXT,
      last_name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      place_of_birth TEXT,
      contact_no TEXT,
      age_group TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL,
      doc_type TEXT NOT NULL,
      doc_label TEXT,
      required INTEGER DEFAULT 1,
      provided INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (child_id) REFERENCES children(id)
    );
    CREATE TABLE IF NOT EXISTS checklist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      label TEXT NOT NULL,
      required INTEGER DEFAULT 1,
      checked INTEGER DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (child_id) REFERENCES children(id)
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_documents_child ON documents(child_id);
    CREATE INDEX IF NOT EXISTS idx_checklist_child ON checklist_items(child_id);
  `);
  try {
    db.exec(`ALTER TABLE checklist_items ADD COLUMN attachment TEXT`);
  } catch (e) {
    if (!/duplicate column name/i.test(e.message)) throw e;
  }
  for (const col of [
    'registrant_deceased',
    'hilot_deceased',
    'parent_foreigner',
    'out_of_town',
    'has_marriage_certificate',
    'colb_requires_parent_id',
    'has_muslim_attachment',
  ]) {
    try {
      db.exec(`ALTER TABLE children ADD COLUMN ${col} INTEGER DEFAULT 0`);
    } catch (e) {
      if (!/duplicate column name/i.test(e.message)) throw e;
    }
  }
  try {
    db.exec(`ALTER TABLE children ADD COLUMN certificate_of_live_birth TEXT`);
  } catch (e) {
    if (!/duplicate column name/i.test(e.message)) throw e;
  }
  try {
    db.exec(`ALTER TABLE children ADD COLUMN paternity_affidavit TEXT`);
  } catch (e) {
    if (!/duplicate column name/i.test(e.message)) throw e;
  }
  try {
    db.exec(`ALTER TABLE children ADD COLUMN delayed_registration_affidavit TEXT`);
  } catch (e) {
    if (!/duplicate column name/i.test(e.message)) throw e;
  }
  try {
    db.exec(`ALTER TABLE children ADD COLUMN witness_affidavit TEXT`);
  } catch (e) {
    if (!/duplicate column name/i.test(e.message)) throw e;
  }
  try {
    db.exec(`ALTER TABLE children ADD COLUMN out_of_town_informant_is_owner INTEGER`);
  } catch (e) {
    if (!/duplicate column name/i.test(e.message)) throw e;
  }
  try {
    db.exec(`ALTER TABLE children ADD COLUMN out_of_town_affidavit TEXT`);
  } catch (e) {
    if (!/duplicate column name/i.test(e.message)) throw e;
  }
  try {
    db.exec(`ALTER TABLE children ADD COLUMN staff_process_status TEXT`);
  } catch (e) {
    if (!/duplicate column name/i.test(e.message)) throw e;
  }
  try {
    db.exec(`ALTER TABLE children ADD COLUMN application_type TEXT DEFAULT 'applicant'`);
  } catch (e) {
    if (!/duplicate column name/i.test(e.message)) throw e;
  }
  try {
    db.exec(`ALTER TABLE children ADD COLUMN gender TEXT`);
  } catch (e) {
    if (!/duplicate column name/i.test(e.message)) throw e;
  }
  try {
    db.exec(`UPDATE children SET application_type = 'applicant' WHERE application_type IS NULL OR application_type = ''`);
  } catch (e) {
    /* ignore if column missing in very old state */
  }
  ensureDataDir();
  const attachmentsDir = path.join(path.dirname(dbPath), 'attachments');
  if (!fs.existsSync(attachmentsDir)) fs.mkdirSync(attachmentsDir, { recursive: true });
  saveDb();
}

function getDb() {
  if (!db) throw new Error('DB not initialized; call init() first');
  return {
    close() { /* no-op: single in-memory db, no connection to close */ },
    prepare(sql) {
      const stmt = db.prepare(sql);
      const run = (...params) => {
        if (params.length) stmt.bind(params);
        while (stmt.step()) {}
        stmt.free();
        let lastInsertRowid = 0;
        let changes = 0;
        try {
          const metaStmt = db.prepare('SELECT last_insert_rowid() AS id, changes() AS c');
          if (metaStmt.step()) {
            const row = metaStmt.get(null);
            if (Array.isArray(row) && row.length >= 2) {
              lastInsertRowid = Number(row[0]) || 0;
              changes = Number(row[1]) || 0;
            }
          }
          metaStmt.free();
        } catch (e) {
          console.error('Db run: lastInsertRowid/changes read error', e);
        }
        if (!db._inBatch) saveDb();
        return { lastInsertRowid, changes };
      };
      const get = (...params) => {
        if (params.length) stmt.bind(params);
        const row = stmt.step() ? stmt.getAsObject() : null;
        stmt.free();
        return row;
      };
      const all = (...params) => {
        if (params.length) stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      };
      return { run, get, all };
    },
    exec(sql) {
      db.run(sql);
      if (!db._inBatch) saveDb();
    },
    transaction(fn) {
      const prev = !!db._inBatch;
      db._inBatch = true;
      try {
        db.run('BEGIN TRANSACTION');
        const result = fn();
        db.run('COMMIT');
        return result;
      } catch (e) {
        db.run('ROLLBACK');
        throw e;
      } finally {
        db._inBatch = prev;
        if (!db._inBatch) saveDb();
      }
    },
  };
}

function initDb() {
  return init();
}

function flushToDisk() {
  saveDb();
}

function getDbPath() {
  return dbPath;
}

function getAttachmentsDir() {
  return path.join(path.dirname(dbPath), 'attachments');
}

function reloadFromDisk() {
  if (!SQL) throw new Error('Database not initialized');
  if (db) {
    try {
      db.close();
    } catch (_) {
      /* ignore close failures from already closed instances */
    }
    db = null;
  }
  db = loadDb(SQL);
  db.save = saveDb;
}

function isSqliteFile(buf) {
  if (!buf || buf.length < 16) return false;
  return buf.subarray(0, 15).toString('ascii') === 'SQLite format 3';
}

module.exports = {
  getDb,
  initDb,
  init,
  flushToDisk,
  getDbPath,
  reloadFromDisk,
  isSqliteFile,
  getAttachmentsDir,
};
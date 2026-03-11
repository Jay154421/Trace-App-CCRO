const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../data/trace.db');
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
  const SQL = await initSqlJs();
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
    CREATE INDEX IF NOT EXISTS idx_documents_child ON documents(child_id);
    CREATE INDEX IF NOT EXISTS idx_checklist_child ON checklist_items(child_id);
  `);
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
        saveDb();
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
      saveDb();
    },
  };
}

function initDb() {
  return init();
}

module.exports = { getDb, initDb, init };
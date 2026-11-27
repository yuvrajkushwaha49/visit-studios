const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { schemaSQL } = require('./schema');

// Ensure database directory exists
const dbDir = path.dirname(config.DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(config.DB_PATH);

// Enable foreign keys, WAL mode, in-memory temp tables, and 64MB cache for sub-millisecond execution
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA cache_size = -64000;');
db.exec('PRAGMA temp_store = MEMORY;');
db.exec('PRAGMA mmap_size = 268435456;');

// Initialize tables
db.exec(schemaSQL);

// Automatic non-destructive schema migrations for existing databases
const migrationStatements = [
  'ALTER TABLE invitations ADD COLUMN theme TEXT;',
  'ALTER TABLE customers ADD COLUMN normalized_mobile TEXT;',
  'ALTER TABLE customers ADD COLUMN city TEXT;',
  'ALTER TABLE customers ADD COLUMN original_source TEXT;',
  'ALTER TABLE followups ADD COLUMN lead_id TEXT;',
  'ALTER TABLE followups ADD COLUMN completed_at DATETIME;',
  'ALTER TABLE followups ADD COLUMN reminder_sent_at DATETIME;'
];

for (const stmt of migrationStatements) {
  try {
    db.exec(stmt);
  } catch (_) {
    // Column already exists or already migrated
  }
}

try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_customers_norm_mobile ON customers(organization_id, normalized_mobile);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_followups_lead ON followups(lead_id);');
} catch (_) {}

// Backfill normalized_mobile for existing customers where missing
try {
  const missingNorm = db.prepare("SELECT id, mobile_number FROM customers WHERE normalized_mobile IS NULL OR normalized_mobile = ''").all();
  if (missingNorm.length > 0) {
    const upd = db.prepare('UPDATE customers SET normalized_mobile = ? WHERE id = ?');
    for (const row of missingNorm) {
      const digits = String(row.mobile_number || '').replace(/\D/g, '');
      const norm = digits.length >= 10 ? digits.slice(-10) : digits;
      upd.run(norm, row.id);
    }
  }
} catch (_) {}

const { executeMySQL, syncAllFromSQLite, syncFromMySQLToSQLite, testConnection } = require('./mysql');

let pendingTxMySQLQueue = null;

// Database helper functions with parameter normalization & real-time MySQL synchronization
const query = {
  all(sql, params = []) {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  },
  get(sql, params = []) {
    const stmt = db.prepare(sql);
    return stmt.get(...params);
  },
  run(sql, params = []) {
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    if (pendingTxMySQLQueue) {
      pendingTxMySQLQueue.push({ sql, params });
    } else {
      // Real-time asynchronous write-through to MySQL visit_studio_db
      executeMySQL(sql, params).catch(() => {});
    }
    return result;
  },
  exec(sql) {
    const res = db.exec(sql);
    if (pendingTxMySQLQueue) {
      pendingTxMySQLQueue.push({ sql, params: [] });
    } else {
      executeMySQL(sql).catch(() => {});
    }
    return res;
  },
  transaction(fn) {
    if (pendingTxMySQLQueue) {
      // Already inside an outer transaction
      return fn();
    }
    pendingTxMySQLQueue = [];
    db.exec('BEGIN IMMEDIATE;');
    try {
      const result = fn();
      db.exec('COMMIT;');
      const queued = pendingTxMySQLQueue;
      pendingTxMySQLQueue = null;
      for (const op of queued) {
        executeMySQL(op.sql, op.params).catch(() => {});
      }
      return result;
    } catch (err) {
      pendingTxMySQLQueue = null;
      try {
        db.exec('ROLLBACK;');
      } catch (_) {}
      throw err;
    }
  },
  raw: db
};

// Initialize MySQL connection and auto-sync remote data into local database on boot
testConnection().then(async connected => {
  if (connected) {
    await syncFromMySQLToSQLite(db);
  }
}).catch(err => {
  console.log('MySQL auto-sync deferred:', err.message);
});

module.exports = query;

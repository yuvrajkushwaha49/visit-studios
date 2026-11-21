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

const { executeMySQL, syncAllFromSQLite, syncFromMySQLToSQLite, testConnection } = require('./mysql');

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
    // Real-time asynchronous write-through to MySQL visit_studio_db
    executeMySQL(sql, params).catch(() => {});
    return result;
  },
  exec(sql) {
    const res = db.exec(sql);
    executeMySQL(sql).catch(() => {});
    return res;
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

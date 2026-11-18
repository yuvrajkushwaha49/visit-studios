const mysql = require('mysql2/promise');

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'visit_studio_db',
      waitForConnections: true,
      connectionLimit: 15,
      maxIdle: 10,
      idleTimeout: 60000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      queueLimit: 0,
      multipleStatements: true
    });
  }
  return pool;
}

// Convert SQLite-specific syntax to MySQL
function convertToMySQL(sql) {
  let mySql = sql
    .replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'REPLACE INTO')
    .replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT IGNORE INTO');
  return mySql;
}

async function executeMySQL(sql, params = []) {
  try {
    const p = getPool();
    const mySql = convertToMySQL(sql);
    const cleanParams = params.map(val => (val === undefined ? null : val));
    await p.query(mySql, cleanParams);
  } catch (err) {
    console.error('MySQL Async Sync Warning:', err.message, '\nSQL:', sql);
  }
}

async function testConnection() {
  try {
    const p = getPool();
    const [rows] = await p.query('SELECT 1 + 1 as test');
    console.log('✓ MySQL Database Connected Successfully to ' + (process.env.MYSQL_DATABASE || 'visit_studio_db'));
    return true;
  } catch (err) {
    console.error('MySQL connection failed:', err.message);
    return false;
  }
}

async function syncAllFromSQLite(sqliteDb) {
  try {
    const p = getPool();
    const tables = [
      'organizations',
      'organization_settings',
      'users',
      'developers',
      'projects',
      'project_configurations',
      'customers',
      'customer_interactions',
      'invitations',
      'site_visits',
      'followups',
      'feedback',
      'whatsapp_templates',
      'whatsapp_logs'
    ];

    await p.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of tables) {
      let rows = [];
      try {
        rows = sqliteDb.prepare('SELECT * FROM ' + table).all();
      } catch (e) {
        continue;
      }

      if (rows.length === 0) continue;

      const cols = Object.keys(rows[0]);
      const placeholders = cols.map(() => '?').join(', ');
      const updateClause = cols.map(c => `\`${c}\` = VALUES(\`${c}\`)`).join(', ');
      const upsertSQL = `INSERT INTO \`${table}\` (\`${cols.join('`, `')}\`) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`;

      for (const row of rows) {
        const vals = cols.map(c => (row[c] === undefined ? null : row[c]));
        await p.query(upsertSQL, vals);
      }
    }

    await p.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✓ MySQL Data Synchronized in visit_studio_db');
  } catch (err) {
    console.error('MySQL Sync Warning:', err.message);
  }
}

module.exports = {
  getPool,
  executeMySQL,
  testConnection,
  convertToMySQL,
  syncAllFromSQLite
};

const mysql = require('mysql2/promise');

let pool = null;

function getPool() {
  if (!pool) {
    let cleanHost = (process.env.MYSQL_HOST || 'localhost').trim();
    // Auto-strip accidental http://, https:// or trailing slashes
    cleanHost = cleanHost.replace(/^https?:\/\//i, '').replace(/\/+.*$/, '');

    pool = mysql.createPool({
      host: cleanHost,
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
    .replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT IGNORE INTO')
    .replace(/datetime\('now',\s*'\+1\s*hour'\)/gi, 'DATE_ADD(NOW(), INTERVAL 1 HOUR)')
    .replace(/datetime\('now'\)/gi, 'NOW()');

  // Handle password_resets DDL compatibility with MySQL
  if (/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+password_resets/i.test(mySql)) {
    return `
      CREATE TABLE IF NOT EXISTS \`password_resets\` (
        \`id\` VARCHAR(255) PRIMARY KEY,
        \`user_id\` VARCHAR(255) NOT NULL,
        \`token\` VARCHAR(255) UNIQUE NOT NULL,
        \`temp_password\` TEXT,
        \`expires_at\` DATETIME NOT NULL,
        \`is_used\` INT DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
  }

  return mySql;
}

// Automatically ensure MySQL tables have required columns (e.g. short_code, theme)
async function ensureMySQLSchema() {
  try {
    const p = getPool();
    // 1. Check & add short_code to invitations if missing
    try {
      const [cols] = await p.query("SHOW COLUMNS FROM `invitations` LIKE 'short_code'");
      if (!cols || cols.length === 0) {
        await p.query("ALTER TABLE `invitations` ADD COLUMN `short_code` VARCHAR(64) NULL AFTER `token`");
        console.log('✓ Added missing `short_code` column to MySQL `invitations` table');
      }
    } catch (_) {}

    // 2. Check & add theme to invitations if missing
    try {
      const [cols] = await p.query("SHOW COLUMNS FROM `invitations` LIKE 'theme'");
      if (!cols || cols.length === 0) {
        await p.query("ALTER TABLE `invitations` ADD COLUMN `theme` VARCHAR(64) NULL AFTER `qr_code_data`");
        console.log('✓ Added missing `theme` column to MySQL `invitations` table');
      }
    } catch (_) {}

    // 3. Ensure password_resets table exists
    try {
      await p.query(`
        CREATE TABLE IF NOT EXISTS \`password_resets\` (
          \`id\` VARCHAR(255) PRIMARY KEY,
          \`user_id\` VARCHAR(255) NOT NULL,
          \`token\` VARCHAR(255) UNIQUE NOT NULL,
          \`temp_password\` TEXT,
          \`expires_at\` DATETIME NOT NULL,
          \`is_used\` INT DEFAULT 0,
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    } catch (_) {}
  } catch (err) {
    console.warn('ensureMySQLSchema notice:', err.message);
  }
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
    await ensureMySQLSchema();
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

async function syncFromMySQLToSQLite(sqliteDb) {
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

    console.log('🔄 Checking MySQL for remote data sync...');
    let totalImported = 0;
    for (const table of tables) {
      try {
        const [rows] = await p.query('SELECT * FROM `' + table + '`');
        if (!rows || rows.length === 0) continue;

        console.log(`📥 Syncing ${rows.length} rows from MySQL table: ${table}`);
        const cols = Object.keys(rows[0]);
        const placeholders = cols.map(() => '?').join(', ');
        const insertSQL = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;

        for (const row of rows) {
          const vals = cols.map(c => {
            const v = row[c];
            if (v instanceof Date) return v.toISOString().slice(0, 19).replace('T', ' ');
            return v === undefined ? null : v;
          });
          sqliteDb.prepare(insertSQL).run(...vals);
          totalImported++;
        }
      } catch (err) {
        // Table may not exist yet in MySQL
        continue;
      }
    }
    console.log(`✅ Remote MySQL data sync complete (${totalImported} records processed)!`);
  } catch (err) {
    console.error('MySQL to SQLite sync error:', err.message);
  }
}

module.exports = {
  getPool,
  executeMySQL,
  testConnection,
  convertToMySQL,
  syncAllFromSQLite,
  syncFromMySQLToSQLite
};

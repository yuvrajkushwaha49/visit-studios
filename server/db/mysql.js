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

    // 4. Additive Lead Management columns on customers & followups
    const alterStatements = [
      "ALTER TABLE `customers` ADD COLUMN `normalized_mobile` VARCHAR(32) NULL",
      "ALTER TABLE `customers` ADD COLUMN `city` VARCHAR(120) NULL",
      "ALTER TABLE `customers` ADD COLUMN `original_source` VARCHAR(120) NULL",
      "ALTER TABLE `followups` ADD COLUMN `lead_id` VARCHAR(64) NULL",
      "ALTER TABLE `followups` ADD COLUMN `completed_at` DATETIME NULL",
      "ALTER TABLE `followups` ADD COLUMN `reminder_sent_at` DATETIME NULL",
      "ALTER TABLE `tracking_links` ADD COLUMN `link_type` VARCHAR(40) DEFAULT 'advisor'",
      "ALTER TABLE `tracking_links` ADD COLUMN `advisor_display_name` VARCHAR(120) NULL",
      "ALTER TABLE `tracking_links` ADD COLUMN `advisor_display_phone` VARCHAR(32) NULL"
    ];
    for (const stmt of alterStatements) {
      try { await p.query(stmt); } catch (_) {}
    }

    // 5. Ensure Lead Management tables exist in MySQL
    const leadDDL = [
      `CREATE TABLE IF NOT EXISTS \`campaigns\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`organization_id\` VARCHAR(64) NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`code\` VARCHAR(100),
        \`source_channel\` VARCHAR(100) DEFAULT 'Digital',
        \`description\` TEXT,
        \`status\` VARCHAR(32) DEFAULT 'active',
        \`start_date\` VARCHAR(32),
        \`end_date\` VARCHAR(32),
        \`created_by\` VARCHAR(64),
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_campaigns_org\` (\`organization_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
      `CREATE TABLE IF NOT EXISTS \`tracking_links\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`token\` VARCHAR(128) UNIQUE NOT NULL,
        \`short_code\` VARCHAR(32) UNIQUE NOT NULL,
        \`organization_id\` VARCHAR(64) NOT NULL,
        \`creator_user_id\` VARCHAR(64) NOT NULL,
        \`creator_role\` VARCHAR(40) NOT NULL,
        \`owner_associate_id\` VARCHAR(64),
        \`owner_sales_head_id\` VARCHAR(64),
        \`project_id\` VARCHAR(64),
        \`campaign_id\` VARCHAR(64),
        \`title\` VARCHAR(255),
        \`source_name\` VARCHAR(120) DEFAULT 'Enquiry Link',
        \`link_type\` VARCHAR(40) DEFAULT 'advisor',
        \`advisor_display_name\` VARCHAR(120) NULL,
        \`advisor_display_phone\` VARCHAR(32) NULL,
        \`is_active\` TINYINT DEFAULT 1,
        \`expires_at\` DATETIME NULL,
        \`deactivated_at\` DATETIME NULL,
        \`deactivated_by\` VARCHAR(64),
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_tl_org\` (\`organization_id\`),
        INDEX \`idx_tl_assoc\` (\`owner_associate_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
      `CREATE TABLE IF NOT EXISTS \`lead_settings\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`organization_id\` VARCHAR(64) UNIQUE NOT NULL,
        \`campaigns_enabled\` TINYINT DEFAULT 1,
        \`admin_link_assignment_policy\` VARCHAR(40) DEFAULT 'unassigned',
        \`sales_head_link_assignment_policy\` VARCHAR(40) DEFAULT 'team_pool',
        \`duplicate_policy\` VARCHAR(64) DEFAULT 'link_existing_customer_preserve_owner',
        \`timezone\` VARCHAR(64) DEFAULT 'Asia/Kolkata',
        \`strict_stage_transitions\` TINYINT DEFAULT 1,
        \`stages_json\` LONGTEXT,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
      `CREATE TABLE IF NOT EXISTS \`leads\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`enquiry_ref\` VARCHAR(64) UNIQUE NOT NULL,
        \`organization_id\` VARCHAR(64) NOT NULL,
        \`customer_id\` VARCHAR(64) NOT NULL,
        \`project_id\` VARCHAR(64),
        \`configuration_id\` VARCHAR(64),
        \`apartment_size\` VARCHAR(120),
        \`budget\` VARCHAR(120),
        \`purchase_timeline\` VARCHAR(120),
        \`preferred_callback_time\` VARCHAR(120),
        \`city\` VARCHAR(120),
        \`requirements\` TEXT,
        \`contact_consent\` TINYINT DEFAULT 1,
        \`consent_timestamp\` DATETIME NULL,
        \`tracking_link_id\` VARCHAR(64),
        \`campaign_id\` VARCHAR(64),
        \`enquiry_source\` VARCHAR(120) DEFAULT 'Enquiry Link',
        \`attribution_locked\` TINYINT DEFAULT 1,
        \`original_link_owner_id\` VARCHAR(64),
        \`original_associate_id\` VARCHAR(64),
        \`original_sales_head_id\` VARCHAR(64),
        \`assigned_associate_id\` VARCHAR(64),
        \`assigned_sales_head_id\` VARCHAR(64),
        \`stage\` VARCHAR(40) DEFAULT 'new_lead',
        \`loss_reason\` TEXT,
        \`duplicate_status\` VARCHAR(64) DEFAULT 'unique',
        \`duplicate_of_lead_id\` VARCHAR(64),
        \`invitation_id\` VARCHAR(64),
        \`site_visit_id\` VARCHAR(64),
        \`submitted_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_leads_org\` (\`organization_id\`),
        INDEX \`idx_leads_customer\` (\`customer_id\`),
        INDEX \`idx_leads_stage\` (\`organization_id\`, \`stage\`),
        INDEX \`idx_leads_assoc\` (\`assigned_associate_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
      `CREATE TABLE IF NOT EXISTS \`campaign_events\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`organization_id\` VARCHAR(64) NOT NULL,
        \`tracking_link_id\` VARCHAR(64) NOT NULL,
        \`campaign_id\` VARCHAR(64),
        \`lead_id\` VARCHAR(64),
        \`event_type\` VARCHAR(48) NOT NULL,
        \`visitor_hash\` VARCHAR(128),
        \`session_id\` VARCHAR(128),
        \`metadata\` TEXT,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_ce_link\` (\`tracking_link_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
      `CREATE TABLE IF NOT EXISTS \`lead_stage_history\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`organization_id\` VARCHAR(64) NOT NULL,
        \`lead_id\` VARCHAR(64) NOT NULL,
        \`previous_stage\` VARCHAR(40),
        \`new_stage\` VARCHAR(40) NOT NULL,
        \`changed_by\` VARCHAR(64),
        \`notes\` TEXT,
        \`loss_reason\` TEXT,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_lsh_lead\` (\`lead_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
      `CREATE TABLE IF NOT EXISTS \`lead_assignments\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`organization_id\` VARCHAR(64) NOT NULL,
        \`lead_id\` VARCHAR(64) NOT NULL,
        \`previous_owner_id\` VARCHAR(64),
        \`new_owner_id\` VARCHAR(64),
        \`previous_sales_head_id\` VARCHAR(64),
        \`new_sales_head_id\` VARCHAR(64),
        \`changed_by\` VARCHAR(64),
        \`reason\` TEXT,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_la_lead\` (\`lead_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
      `CREATE TABLE IF NOT EXISTS \`notifications\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`organization_id\` VARCHAR(64),
        \`user_id\` VARCHAR(64) NOT NULL,
        \`event_type\` VARCHAR(64) NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`message\` TEXT NOT NULL,
        \`entity_type\` VARCHAR(64),
        \`entity_id\` VARCHAR(64),
        \`is_read\` TINYINT DEFAULT 0,
        \`read_at\` DATETIME NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_notif_user\` (\`user_id\`, \`is_read\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
      `CREATE TABLE IF NOT EXISTS \`notification_preferences\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`user_id\` VARCHAR(64) UNIQUE NOT NULL,
        \`in_app_enabled\` TINYINT DEFAULT 1,
        \`email_enabled\` TINYINT DEFAULT 1,
        \`whatsapp_enabled\` TINYINT DEFAULT 0,
        \`events_json\` LONGTEXT,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
      `CREATE TABLE IF NOT EXISTS \`notification_logs\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`organization_id\` VARCHAR(64),
        \`notification_id\` VARCHAR(64),
        \`user_id\` VARCHAR(64),
        \`channel\` VARCHAR(32) NOT NULL,
        \`event_type\` VARCHAR(64) NOT NULL,
        \`dedupe_key\` VARCHAR(191),
        \`status\` VARCHAR(32) DEFAULT 'pending',
        \`attempts\` INT DEFAULT 0,
        \`max_attempts\` INT DEFAULT 3,
        \`next_retry_at\` DATETIME NULL,
        \`error_message\` TEXT,
        \`payload\` LONGTEXT,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    ];
    for (const ddl of leadDDL) {
      try { await p.query(ddl); } catch (_) {}
    }
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
      'whatsapp_logs',
      'campaigns',
      'tracking_links',
      'lead_settings',
      'leads',
      'campaign_events',
      'lead_stage_history',
      'lead_assignments',
      'notifications',
      'notification_preferences',
      'notification_logs'
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
      'whatsapp_logs',
      'campaigns',
      'tracking_links',
      'lead_settings',
      'leads',
      'campaign_events',
      'lead_stage_history',
      'lead_assignments',
      'notifications',
      'notification_preferences',
      'notification_logs'
    ];

    console.log('🔄 Checking MySQL for remote data sync...');
    let totalImported = 0;
    sqliteDb.exec('PRAGMA foreign_keys = OFF;');
    try {
      for (const table of tables) {
        try {
          const [rows] = await p.query('SELECT * FROM `' + table + '`');
          if (!rows || rows.length === 0) continue;

          console.log(`📥 Syncing ${rows.length} rows from MySQL table: ${table}`);
          const cols = Object.keys(rows[0]);
          const placeholders = cols.map(() => '?').join(', ');
          const updateCols = cols.filter(c => c !== 'id').map(c => `${c} = excluded.${c}`).join(', ');
          const insertSQL = cols.includes('id') && updateCols
            ? `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updateCols}`
            : `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;

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
    } finally {
      sqliteDb.exec('PRAGMA foreign_keys = ON;');
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

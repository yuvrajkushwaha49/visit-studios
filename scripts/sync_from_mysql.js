require('dotenv').config();
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const config = require('../server/config');
const { getPool, testConnection, syncFromMySQLToSQLite } = require('../server/db/mysql');

async function run() {
  console.log('\n======================================================');
  console.log('   🔄 VISIT STUDIO - MYSQL TO SQLITE DATA SYNC');
  console.log('======================================================\n');

  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Cannot connect to MySQL. Please verify your .env settings.');
    process.exit(1);
  }

  const db = new DatabaseSync(config.DB_PATH);
  console.log('📂 Target SQLite DB:', config.DB_PATH);

  // Optional: check if user passed --clean flag to wipe and rebuild from MySQL
  const cleanMode = process.argv.includes('--clean');
  if (cleanMode) {
    console.log('🧹 Clean Mode Active: Clearing existing tables before import...');
    const tables = [
      'customer_interactions', 'feedback', 'followups', 'site_visits', 'invitations',
      'customers', 'project_configurations', 'projects', 'developers', 'users',
      'organization_settings', 'organizations'
    ];
    for (const t of tables) {
      try { db.exec(`DELETE FROM ${t};`); } catch (e) {}
    }
  }

  await syncFromMySQLToSQLite(db);

  console.log('\n🎉 ALL DONE! Your database is now completely up-to-date with MySQL.\n');
  process.exit(0);
}

run();

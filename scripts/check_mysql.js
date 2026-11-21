require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkDatabase() {
  console.log('\n======================================================');
  console.log('   🔍 VISIT STUDIO - MYSQL CONNECTION TEST DIAGNOSTIC');
  console.log('======================================================\n');

  let rawHost = process.env.MYSQL_HOST || 'localhost';
  let cleanHost = rawHost.replace(/^https?:\/\//i, '').replace(/\/+.*$/, '');

  const config = {
    host: cleanHost,
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'visit_studio_db',
    connectTimeout: 5000
  };

  console.log('📋 Current Config from .env:');
  console.log(`   • Host:     ${config.host} ${rawHost !== cleanHost ? `(Auto-cleaned from: ${rawHost})` : ''}`);
  console.log(`   • Port:     ${config.port}`);
  console.log(`   • User:     ${config.user}`);
  console.log(`   • Password: ${config.password ? '********' : '(empty)'}`);
  console.log(`   • Database: ${config.database}\n`);

  console.log('⏳ Connecting to MySQL server...');

  try {
    const conn = await mysql.createConnection(config);
    console.log('\n✅ SUCCESS: MySQL Connected Successfully!');
    
    const [rows] = await conn.query('SELECT DATABASE() as db, VERSION() as version');
    console.log(`   • Connected DB:      ${rows[0].db}`);
    console.log(`   • Server Version:    ${rows[0].version}`);

    const [tables] = await conn.query('SHOW TABLES');
    const tableList = tables.map(t => Object.values(t)[0]);
    console.log(`   • Tables Found (${tableList.length}): ${tableList.slice(0, 10).join(', ')}${tableList.length > 10 ? '...' : ''}`);

    await conn.end();
    console.log('\n🎉 Connection is 100% WORKING!\n');
    process.exit(0);
  } catch (err) {
    console.log('\n❌ FAILED: Could not connect to MySQL.');
    console.log(`   • Error Code:    ${err.code || 'UNKNOWN'}`);
    console.log(`   • Error Message: ${err.message}\n`);

    console.log('💡 DIAGNOSIS & HOW TO FIX:');
    if (err.code === 'ECONNREFUSED') {
      console.log('   -> Server refuse kar raha hai. Check karein ki MySQL server chal raha hai aur port 3306 open hai.');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('   -> Username ya Password galat hai, ya is IP se user ko access allow nahi hai.');
      console.log('   -> Agar Hostinger database hai, toh Remote MySQL me apna public IP allow karein.');
    } else if (err.code === 'ENOTFOUND') {
      console.log('   -> Hostname resolve nahi ho raha hai. Host me "http://" ya slashes mat lagaiye (sirf IP ya domain daalein).');
    } else if (err.code === 'ETIMEDOUT') {
      console.log('   -> Server se response nahi mila (Timeout). Firewall ya Hosting provider remote connections block kar raha hai.');
    } else {
      console.log('   -> Details check karein: ' + err.message);
    }
    console.log('');
    process.exit(1);
  }
}

checkDatabase();

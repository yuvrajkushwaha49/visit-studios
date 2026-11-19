const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../server/db');

async function importSalesTeamFromExcel(filePath) {
  if (!filePath) {
    // Look for any .xlsx or .xls file in root directory or uploads
    const files = fs.readdirSync('.').filter(f => f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv'));
    if (files.length > 0) {
      filePath = files[0];
      console.log(`Auto-detected Excel file: ${filePath}`);
    } else {
      console.error('No Excel file specified and no .xlsx/.xls/.csv file found in current directory.');
      console.log('Usage: node scripts/import_sales_team.js <path-to-excel-file.xlsx>');
      return;
    }
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  console.log(`\n======================================================`);
  console.log(`  IMPORTING SALES TEAM FROM: ${filePath}`);
  console.log(`======================================================\n`);

  // Target organization (Workians Realty / Sajan Patel)
  const sajanUser = db.get("SELECT * FROM users WHERE email = 'sajanpatel@workians.com'");
  const orgId = sajanUser ? sajanUser.organization_id : 'org-08a1da1a';
  console.log(`Target Organization ID: ${orgId}`);

  // Read workbook
  const workbook = xlsx.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

  console.log(`Total rows read from sheet "${firstSheetName}": ${rawRows.length}\n`);

  if (rawRows.length === 0) {
    console.log('No data found in sheet.');
    return;
  }

  // Helper to extract field case-insensitively
  function getField(row, possibleKeys) {
    const rowKeys = Object.keys(row);
    for (const key of possibleKeys) {
      const found = rowKeys.find(k => k.trim().toLowerCase() === key.toLowerCase());
      if (found && row[found] !== undefined && row[found] !== null) {
        return String(row[found]).trim();
      }
    }
    return '';
  }

  // Clean phone number (keep digits or cleaned string for password)
  function cleanPhone(rawPhone) {
    if (!rawPhone) return '';
    // Strip leading .0 if Excel parsed as float
    let p = String(rawPhone).replace(/\.0$/, '').trim();
    // Remove formatting like spaces, dashes, brackets
    let digits = p.replace(/[^\d+]/g, '');
    return digits || p;
  }

  // Parse and normalize all rows
  const parsedRows = rawRows.map(row => {
    const name = getField(row, ['name', 'full name', 'employee name', 'associate name', 'sales person']);
    const email = getField(row, ['email', 'email id', 'email address', 'username', 'mail']).toLowerCase();
    const rawPhone = getField(row, ['phone', 'mobile', 'phone number', 'contact', 'contact number', 'mobile number']);
    const phone = cleanPhone(rawPhone);
    const headName = getField(row, ['head name', 'head', 'sales head', 'reporting head', 'team head', 'manager', 'sales head name']);

    return { name, email, phone, headName, raw: row };
  }).filter(r => r.name && r.email);

  console.log(`Valid employee rows to process: ${parsedRows.length}`);

  // Step 1: Identify all unique Head Names mentioned in the sheet
  const referencedHeads = new Set();
  parsedRows.forEach(r => {
    if (r.headName && !['self', 'na', 'n/a', 'none', '-'].includes(r.headName.toLowerCase())) {
      referencedHeads.add(r.headName.toLowerCase());
    }
  });

  // Step 2: Categorize into Sales Heads and Sales Associates
  // A person is a Sales Head if:
  // - Their Head Name is empty, self, '-', or matches their own name, OR
  // - Their name is referenced as Head Name by someone else
  const salesHeadsToCreate = [];
  const salesAssociatesToCreate = [];

  for (const r of parsedRows) {
    const isHeadByName = referencedHeads.has(r.name.toLowerCase());
    const hasNoHead = !r.headName || ['self', 'na', 'n/a', 'none', '-', r.name.toLowerCase()].includes(r.headName.toLowerCase());

    if (isHeadByName || hasNoHead) {
      salesHeadsToCreate.push(r);
    } else {
      salesAssociatesToCreate.push(r);
    }
  }

  console.log(`\nDetected ${salesHeadsToCreate.length} Sales Heads and ${salesAssociatesToCreate.length} Sales Associates.`);

  // Map of Head Name (lowercase) -> User ID
  const headNameToId = {};

  // First check existing sales heads in DB for this org
  const existingHeads = db.all("SELECT id, name, email FROM users WHERE organization_id = ? AND role = 'sales_head'", [orgId]);
  existingHeads.forEach(h => {
    headNameToId[h.name.toLowerCase()] = h.id;
  });

  // Step 3: Insert or update Sales Heads
  console.log('\n--- Creating / Updating Sales Heads ---');
  for (const h of salesHeadsToCreate) {
    const password = h.phone;
    if (!password) {
      console.warn(`[WARNING] No phone number for Sales Head ${h.name} (${h.email}), password will default to '12345678'`);
    }
    const passwordHash = await bcrypt.hash(password || '12345678', 10);
    const existing = db.get("SELECT id FROM users WHERE email = ?", [h.email]);

    let userId;
    if (existing) {
      userId = existing.id;
      db.run(
        `UPDATE users SET name=?, phone=?, role='sales_head', password_hash=?, organization_id=?, status='active' WHERE id=?`,
        [h.name, h.phone, passwordHash, orgId, userId]
      );
      console.log(`✓ Updated Sales Head: ${h.name} (${h.email}) | Password: ${password}`);
    } else {
      userId = 'usr-head-' + crypto.randomUUID().slice(0, 8);
      db.run(
        `INSERT INTO users (id, organization_id, role, name, email, phone, password_hash, sales_head_id, status)
         VALUES (?, ?, 'sales_head', ?, ?, ?, ?, NULL, 'active')`,
        [userId, orgId, h.name, h.email, h.phone, passwordHash]
      );
      console.log(`+ Created Sales Head: ${h.name} (${h.email}) | Password: ${password}`);
    }

    headNameToId[h.name.toLowerCase()] = userId;

    // Ensure a team exists for this Sales Head
    const existingTeam = db.get("SELECT id FROM teams WHERE sales_head_id = ?", [userId]);
    if (!existingTeam) {
      const teamId = 'team-' + crypto.randomUUID().slice(0, 8);
      db.run(
        `INSERT INTO teams (id, organization_id, sales_head_id, name, description) VALUES (?, ?, ?, ?, ?)`,
        [teamId, orgId, userId, `${h.name}'s Advisory Team`, `Managed by ${h.name}`]
      );
    }
  }

  // Step 4: Insert or update Sales Associates linked to their Sales Head
  console.log('\n--- Creating / Updating Sales Associates ---');
  for (const a of salesAssociatesToCreate) {
    const password = a.phone;
    if (!password) {
      console.warn(`[WARNING] No phone number for Sales Associate ${a.name} (${a.email}), password will default to '12345678'`);
    }
    const passwordHash = await bcrypt.hash(password || '12345678', 10);

    // Find assigned sales head ID
    let assignedHeadId = null;
    if (a.headName) {
      const lowerHead = a.headName.toLowerCase();
      // Exact match or partial match
      assignedHeadId = headNameToId[lowerHead] ||
        Object.keys(headNameToId).find(k => k.includes(lowerHead) || lowerHead.includes(k)) ? headNameToId[Object.keys(headNameToId).find(k => k.includes(lowerHead) || lowerHead.includes(k))] : null;
    }

    const existing = db.get("SELECT id FROM users WHERE email = ?", [a.email]);

    let userId;
    if (existing) {
      userId = existing.id;
      db.run(
        `UPDATE users SET name=?, phone=?, role='sales_associate', password_hash=?, sales_head_id=?, organization_id=?, status='active' WHERE id=?`,
        [a.name, a.phone, passwordHash, assignedHeadId, orgId, userId]
      );
      console.log(`✓ Updated Sales Associate: ${a.name} (${a.email}) | Reports to: ${a.headName || 'Unassigned'} | Password: ${password}`);
    } else {
      userId = 'usr-assoc-' + crypto.randomUUID().slice(0, 8);
      db.run(
        `INSERT INTO users (id, organization_id, role, name, email, phone, password_hash, sales_head_id, status)
         VALUES (?, ?, 'sales_associate', ?, ?, ?, ?, ?, 'active')`,
        [userId, orgId, a.name, a.email, a.phone, passwordHash, assignedHeadId]
      );
      console.log(`+ Created Sales Associate: ${a.name} (${a.email}) | Reports to: ${a.headName || 'Unassigned'} | Password: ${password}`);
    }
  }

  console.log('\n======================================================');
  console.log('  IMPORT SUCCESSFUL!');
  console.log(`  Sales Heads: ${salesHeadsToCreate.length}`);
  console.log(`  Sales Associates: ${salesAssociatesToCreate.length}`);
  console.log('  Credentials: Username = Email | Password = Phone Number');
  console.log('======================================================\n');
}

// Support CLI execution: node scripts/import_sales_team.js <optional-file-path>
if (require.main === module) {
  const targetFile = process.argv[2];
  importSalesTeamFromExcel(targetFile).then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Import error:', err);
    process.exit(1);
  });
}

module.exports = { importSalesTeamFromExcel };

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../server/db');

const csvData = `Name ,Email,Phone,(Head Name)
Kaushal Pant,kaushalpant94@gmail.com,7895126033,Sajan Patel
Atul Vats,atul.vats@yahoo.co.in,8882867757,Sajan Patel
Neeraj Sharma,nrjshrm0@gmail.com,9315606930,Sajan Patel
Rohit Kumar,rohitkumar6691@gmail.com,9910797989,Sajan Patel
Pari Mainwal,parimainwal1@gmail.com,7248391121,Kaushal Pant
Gauri,gaurii2305@gmail.com,9468244833,Kaushal Pant
Bhupender Singh,bhupensingh1971@gmail.com,9910602940,Kaushal Pant
Sachin Pandey,sachinpandey6789@gmail.com,9456990162,Kaushal Pant
Priyanshi Mahiwal,mahiwalisha2@gmail.com,8439702402,Kaushal Pant
Anuj Kumar,anujk866698@gmail.com,8266971311,Kaushal Pant
Sanskar Sharma,sanskarsharma1089@gmail.com,9368945242,Kaushal Pant
Manoj Kumar,manojmavi85@gmail.com,8076833651,Rohit
Abhishek Singh,abhesheksingh144@gmail.com,9569177899,Neeraj
Yogita,fartyalyogita@gmail.com,9540367717,Neeraj
Akash Kumar,rajataj321@gmail.com,8929609801,Akshansh
Rachit Khare,khare.rachit1985@gmail.com,9425689890,Atul
Sunny Shokeen,826sunny@gmail.com,9999388398,Rohit
Himanshu Kumar,himanshu962769@gmail.com,9627694651,Kaushal Pant
Devanshu Sirohi,devanshusirohi7@gmail.com,9458885841,Akshansh
Abhinav Malhotra,abhi.joy2000@gmail.com,9717754547,Kaushal Pant
Varun Chawla,varun.chawla9253@gmail.com,7982353229,Neeraj
Rahul Sharma,sharmarahul7522@gmail.com,9999775221,Sajan Patel
Divy Kumar,divys427@gmail.com,8410400303,RahulSharma
Vikram Singh Rayat,rayatvik93@gmail.com,7217677858,Sajan Patel
Nilesh Kumar,nk2426768@gmail.com,8092460880,Atul
Shivalika,kavhn145@gmail.com,9654764963,RahulSharma
Vishal Tyagi,tyagi8499@gmail.com,9217308001,Vikram Singh
Manish Kulshrestha,mac1234manish@gmail.com,9310867965,Atul
Ankita Singh,singhankita1969@gmail.com,9142786140,Kaushal Pant
Atul Kumar,kuntalrealestate@gmail.com,8859639910,Akshansh
Iqbal Tufail,iqbaltufail750@gmail.com,9294940867,Vikram Singh
Sachin,saranshkumar882@gmail.com,7878598981,Kaushal Pant
Varsha Priyambada Singh,varshapriyambada@gmail.com,7295009696,Neeraj
Anurag Kashyap,anuragkashyap0012@gmail.com,8102838331,Rohit`;

async function main() {
  console.log('--- Processing User Uploaded Sales Team ---');

  // Find Sajan Patel org
  const sajanUser = db.get("SELECT * FROM users WHERE email = 'sajanpatel@workians.com'");
  const orgId = sajanUser ? sajanUser.organization_id : 'org-08a1da1a';
  console.log(`Target Organization: ${orgId} (Workians Realty)\n`);

  const lines = csvData.trim().split('\n').filter(Boolean);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(s => s.trim());
    if (parts.length >= 3) {
      rows.push({
        name: parts[0],
        email: parts[1].toLowerCase(),
        phone: parts[2],
        headName: parts[3] || ''
      });
    }
  }

  console.log(`Parsed ${rows.length} records.\n`);

  // Explicit Sales Heads (those reporting to Sajan Patel)
  const salesHeadRows = rows.filter(r => r.headName.toLowerCase().includes('sajan'));
  
  // Also Akshansh if not in headRows
  const hasAkshansh = rows.some(r => r.name.toLowerCase().includes('akshansh'));
  if (!hasAkshansh) {
    salesHeadRows.push({
      name: 'Akshansh',
      email: 'akshansh@workians.com',
      phone: '9999900000',
      headName: 'Sajan Patel'
    });
  }

  // Associates
  const associateRows = rows.filter(r => !r.headName.toLowerCase().includes('sajan'));

  console.log(`Identified ${salesHeadRows.length} Sales Heads and ${associateRows.length} Sales Associates.\n`);

  // Map to store head name variants -> User ID
  const headMap = {};

  // 1. Create/Update Sales Heads
  console.log('--- 1. Creating / Updating Sales Heads ---');
  for (const h of salesHeadRows) {
    const password = h.phone;
    const passwordHash = await bcrypt.hash(password, 10);
    const existing = db.get("SELECT id FROM users WHERE email = ?", [h.email]);
    let headId;

    if (existing) {
      headId = existing.id;
      db.run(
        `UPDATE users SET name=?, phone=?, role='sales_head', password_hash=?, organization_id=?, status='active' WHERE id=?`,
        [h.name, h.phone, passwordHash, orgId, headId]
      );
      console.log(`[UPDATED HEAD] ${h.name} (${h.email}) | Phone / Password: ${password}`);
    } else {
      headId = 'usr-head-' + crypto.randomUUID().slice(0, 8);
      db.run(
        `INSERT INTO users (id, organization_id, role, name, email, phone, password_hash, sales_head_id, status)
         VALUES (?, ?, 'sales_head', ?, ?, ?, ?, NULL, 'active')`,
        [headId, orgId, h.name, h.email, h.phone, passwordHash]
      );
      console.log(`[CREATED HEAD] ${h.name} (${h.email}) | Phone / Password: ${password}`);
    }

    // Map variations
    const lowerName = h.name.toLowerCase();
    headMap[lowerName] = headId;
    headMap[lowerName.replace(/\s+/g, '')] = headId; // e.g. "rahulsharma"
    const firstName = lowerName.split(' ')[0];
    headMap[firstName] = headId; // e.g. "rohit", "atul", "neeraj"

    // Create Team
    const existingTeam = db.get("SELECT id FROM teams WHERE sales_head_id = ?", [headId]);
    if (!existingTeam) {
      db.run(
        `INSERT INTO teams (id, organization_id, sales_head_id, name, description) VALUES (?, ?, ?, ?, ?)`,
        ['team-' + crypto.randomUUID().slice(0, 8), orgId, headId, `${h.name}'s Advisory Squad`, `Led by ${h.name}`]
      );
    }
  }

  // 2. Create/Update Associates linked to Sales Heads
  console.log('\n--- 2. Creating / Updating Sales Associates ---');
  let matchedCount = 0;
  for (const a of associateRows) {
    const password = a.phone;
    const passwordHash = await bcrypt.hash(password, 10);

    // Match Head ID
    const rawHead = a.headName.toLowerCase().trim();
    const rawHeadNoSpace = rawHead.replace(/\s+/g, '');
    let assignedHeadId = headMap[rawHead] || headMap[rawHeadNoSpace] || null;

    if (!assignedHeadId) {
      // Try search in headMap keys
      const matchedKey = Object.keys(headMap).find(k => k.includes(rawHead) || rawHead.includes(k));
      if (matchedKey) assignedHeadId = headMap[matchedKey];
    }

    if (assignedHeadId) matchedCount++;
    else console.warn(`[WARN] No head found for: "${a.headName}" (Associate: ${a.name})`);

    const existing = db.get("SELECT id FROM users WHERE email = ?", [a.email]);
    let assocId;

    if (existing) {
      assocId = existing.id;
      db.run(
        `UPDATE users SET name=?, phone=?, role='sales_associate', password_hash=?, sales_head_id=?, organization_id=?, status='active' WHERE id=?`,
        [a.name, a.phone, passwordHash, assignedHeadId, orgId, assocId]
      );
      console.log(`[UPDATED ASSOC] ${a.name} (${a.email}) | Reports to: ${a.headName} | Password: ${password}`);
    } else {
      assocId = 'usr-assoc-' + crypto.randomUUID().slice(0, 8);
      db.run(
        `INSERT INTO users (id, organization_id, role, name, email, phone, password_hash, sales_head_id, status)
         VALUES (?, ?, 'sales_associate', ?, ?, ?, ?, ?, 'active')`,
        [assocId, orgId, a.name, a.email, a.phone, passwordHash, assignedHeadId]
      );
      console.log(`[CREATED ASSOC] ${a.name} (${a.email}) | Reports to: ${a.headName} | Password: ${password}`);
    }
  }

  console.log('\n========================================================================');
  console.log(`  IMPORT COMPLETE:`);
  console.log(`  - Sales Heads: ${salesHeadRows.length}`);
  console.log(`  - Sales Associates: ${associateRows.length} (Mapped to Heads: ${matchedCount})`);
  console.log(`  - All passwords set to their exact Phone Number`);
  console.log('========================================================================\n');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

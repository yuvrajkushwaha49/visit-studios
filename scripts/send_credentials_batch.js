const db = require('../server/db');
const { sendUserCredentialsEmail, getSmtpConfig, verifySmtp } = require('../server/services/emailService');

async function main() {
  const args = process.argv.slice(2);
  const targetEmail = args.find(a => a.startsWith('--email='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');

  console.log('======================================================');
  console.log('  WORKIANS REALTY - CREDENTIALS EMAIL DISPATCHER');
  console.log('======================================================\n');

  const sajanUser = db.get("SELECT * FROM users WHERE email = 'sajanpatel@workians.com'");
  const orgId = sajanUser ? sajanUser.organization_id : 'org-08a1da1a';

  const smtpConf = getSmtpConfig(orgId);
  console.log(`SMTP Host: ${smtpConf.host}:${smtpConf.port}`);
  console.log(`SMTP User: ${smtpConf.username || '(Not configured)'}`);
  console.log(`From: "${smtpConf.fromName}" <${smtpConf.fromEmail}>`);
  console.log(`Public Portal URL: ${smtpConf.publicUrl}`);
  console.log(`Configured: ${smtpConf.isConfigured ? 'YES' : 'NO'}\n`);

  if (!smtpConf.isConfigured && !dryRun) {
    console.error('ERROR: SMTP is not configured yet with valid username and password.');
    console.log('You can either:');
    console.log('  1. Configure SMTP in web UI (Settings -> Email & SMTP Setup)');
    console.log('  2. Or set SMTP_USER and SMTP_PASS in .env');
    console.log('  3. Or run with --dry-run to preview emails without sending.\n');
    process.exit(1);
  }

  if (smtpConf.isConfigured) {
    console.log('Verifying SMTP connection...');
    const verify = await verifySmtp(smtpConf);
    if (!verify.success) {
      console.error(`SMTP Connection Failed: ${verify.error}`);
      process.exit(1);
    }
    console.log('✓ SMTP Connection Verified!\n');
  }

  let users = [];
  if (targetEmail) {
    users = db.all("SELECT * FROM users WHERE email = ? AND status = 'active'", [targetEmail]);
  } else {
    users = db.all("SELECT * FROM users WHERE organization_id = ? AND role IN ('sales_head', 'sales_associate') AND status = 'active' ORDER BY role DESC, name ASC", [orgId]);
  }

  console.log(`Found ${users.length} active team members to process.\n`);

  let sent = 0;
  let failed = 0;

  for (const u of users) {
    const plainPassword = u.phone || '12345678';
    if (dryRun) {
      console.log(`[DRY RUN] Would send to: ${u.name.padEnd(25)} | Email: ${u.email.padEnd(30)} | Password: ${plainPassword} | Role: ${u.role}`);
      sent++;
      continue;
    }

    try {
      console.log(`Sending to ${u.name} (${u.email})...`);
      const res = await sendUserCredentialsEmail({
        user: u,
        plainPassword,
        orgId
      });

      if (res.success) {
        console.log(`  ✓ Sent successfully (ID: ${res.messageId})`);
        sent++;
      } else {
        console.error(`  ✗ Failed: ${res.error}`);
        failed++;
      }
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n======================================================');
  console.log(`  COMPLETED! Sent: ${sent} | Failed: ${failed}`);
  console.log('======================================================\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

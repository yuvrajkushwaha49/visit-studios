// Unit Tests for Lead Validators, Transactions, and Background Overdue Sweep
const assert = require('assert');
const db = require('../server/db');
const {
  normalizeMobile,
  validatePublicEnquiryPayload,
  validateStageTransition
} = require('../server/validators/leadValidators');
const { runFollowupSweep } = require('../server/services/backgroundJobs');

async function runUnitTests() {
  console.log('=== STARTING LEAD UNIT TESTS ===\n');

  // 1. Mobile normalization
  const m1 = normalizeMobile('+91 98100-12345');
  assert.strictEqual(m1.isValid, true);
  assert.strictEqual(m1.normalized10, '9810012345');
  assert.strictEqual(normalizeMobile('12345').isValid, false);
  assert.strictEqual(normalizeMobile('0000000000').isValid, false);
  console.log('✓ 1. Mobile normalization & validation verified');

  // 2. Public enquiry payload validator & honeypot
  const bad = validatePublicEnquiryPayload({ full_name: 'A', mobile_number: '123' });
  assert.strictEqual(bad.valid, false);
  const spam = validatePublicEnquiryPayload({ website_url: 'http://bot.example' });
  assert.strictEqual(spam.valid, false);
  assert.strictEqual(spam.isSpam, true);
  console.log('✓ 2. Enquiry payload validation & honeypot verified');

  // 3. Stage transition rules
  assert.strictEqual(validateStageTransition('new_lead', 'contacted', { strict: true }).valid, true);
  assert.strictEqual(validateStageTransition('new_lead', 'booked_won', { strict: true }).valid, false);
  assert.strictEqual(validateStageTransition('negotiation', 'lost', { strict: true, lossReason: '' }).valid, false);
  assert.strictEqual(validateStageTransition('negotiation', 'lost', { strict: true, lossReason: 'Budget' }).valid, true);
  console.log('✓ 3. Pipeline stage transition matrix verified');

  // 4. Transaction rollback guarantee
  const org = db.get('SELECT id FROM organizations LIMIT 1');
  let rolledBack = false;
  try {
    db.transaction(() => {
      db.run('INSERT INTO campaigns (id, organization_id, name) VALUES (?, ?, ?)', ['camp-unit-rb', org.id, 'Rollback']);
      throw new Error('Abort tx');
    });
  } catch (_) {
    rolledBack = true;
  }
  assert(rolledBack);
  assert.strictEqual(db.get('SELECT id FROM campaigns WHERE id = ?', ['camp-unit-rb']), undefined);
  console.log('✓ 4. SQLite transaction rollback verified');

  // 5. Follow-up sweep executes cleanly
  await runFollowupSweep();
  console.log('✓ 5. Background overdue follow-up sweep verified');

  console.log('\n🎉 ALL LEAD UNIT TESTS PASSED!');
}

runUnitTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ UNIT TEST FAILED:', err);
    process.exit(1);
  });

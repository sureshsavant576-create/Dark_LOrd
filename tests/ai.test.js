const {test}=require('node:test');
const assert=require('node:assert/strict');
const {redactPii}=require('../server/ai');

test('AI prompt sanitization redacts contact and student identifiers recursively',()=>{
  const result=redactPii({
    project:'Contact student roll: ECE-12345 at learner@example.edu or +1 (212) 555-0199.',
    notes:['ID: LAB-9876'],
    deadline:'2026-11-28'
  });
  assert.equal(result.project,'Contact [identifier] at [email] or [phone].');
  assert.deepEqual(result.notes,['[identifier]']);
  assert.equal(result.deadline,'2026-11-28');
});

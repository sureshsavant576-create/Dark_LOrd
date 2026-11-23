const fs=require('node:fs');
const path=require('node:path');
const {test}=require('node:test');
const assert=require('node:assert/strict');

const app=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');

test('review history export button is wired to CSV export',()=>{
  assert.ok(app.includes('data-action="export-history"]'));
  assert.ok(app.includes("exportHistory(b.dataset.action==='export-json'?'json':'csv')"));
});

test('project planner has one timeline renderer',()=>{
  const definitions=app.match(/^function drawExecutionPlan\\(plan\\)\\{/gm)||[];
  assert.equal(definitions.length,1);
});

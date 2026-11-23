const {test}=require('node:test');
const assert=require('node:assert/strict');
const {getPolicy}=require('../server/scheduler');

test('fairness policy bounds usage and history configuration',()=>{
  const original=process.env.LABLINK_FAIRNESS_POLICY;
  process.env.LABLINK_FAIRNESS_POLICY=JSON.stringify({usage_limit:999,history_days:-4});
  try {
    const policy=getPolicy();
    assert.equal(policy.usage_limit,8);
    assert.equal(policy.history_days,1);
  } finally {
    if(original===undefined)delete process.env.LABLINK_FAIRNESS_POLICY;
    else process.env.LABLINK_FAIRNESS_POLICY=original;
  }
});

test('fairness policy rejects unusable zero limits',()=>{
  const original=process.env.LABLINK_FAIRNESS_POLICY;
  process.env.LABLINK_FAIRNESS_POLICY=JSON.stringify({usage_limit:0,history_days:0});
  try {
    const policy=getPolicy();
    assert.equal(policy.usage_limit,1);
    assert.equal(policy.history_days,1);
  } finally {
    if(original===undefined)delete process.env.LABLINK_FAIRNESS_POLICY;
    else process.env.LABLINK_FAIRNESS_POLICY=original;
  }
});

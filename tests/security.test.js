const {test}=require('node:test');
const assert=require('node:assert/strict');
const {
  issueDemoSession,
  readDemoSession,
  checkRequestLimit,
  assertQueryIdentity,
  assertBodyIdentity,
  securityHeaders
}=require('../server/security');

test('demo session cookie is signed, HttpOnly and bound to its user id',()=>{
  const cookie=issueDemoSession(17,false),pair=cookie.split(';',1)[0];
  assert.match(cookie,/HttpOnly/);
  assert.match(cookie,/SameSite=Strict/);
  const request={headers:{cookie:pair}};
  assert.deepEqual(readDemoSession(request),{userId:17});
  const [name,token]=pair.split('=');
  const [payload,signature]=token.split('.');
  const altered=`${name}=${payload}.${signature[0]==='A'?'B':'A'}${signature.slice(1)}`;
  assert.equal(readDemoSession({headers:{cookie:altered}}),null);
  assert.equal(readDemoSession({headers:{cookie:`${name}=invalid`}}),null);
});

test('request identity checks reject client-supplied user and role changes',()=>{
  const url=new URL('http://localhost/api/bookings?userId=18&role=student');
  assert.throws(()=>assertQueryIdentity(url,{id:17,role:'student'}),{status:403});
  assert.throws(()=>assertQueryIdentity(new URL('http://localhost/api/bookings?userId=17&role=admin'),{id:17,role:'student'}),{status:403});
  const req={lablinkPrincipal:{id:17,role:'student'},lablinkPath:'/api/bookings'};
  assert.throws(()=>assertBodyIdentity(req,{userId:18}),{status:403});
  assert.throws(()=>assertBodyIdentity(req,{reviewerId:18}),{status:403});
  assert.deepEqual(assertBodyIdentity({...req,lablinkPath:'/api/training/verify'},{userId:18,actorId:17}),{userId:18,actorId:17});
});

test('API rate limits are independent per client and expensive route class',()=>{
  const request={headers:{},socket:{remoteAddress:`unit-test-${Math.random()}`}};
  for(let i=0;i<180;i++)assert.equal(checkRequestLimit(request,'/api/bookings'),null);
  assert.ok(checkRequestLimit(request,'/api/bookings')>0);
  for(let i=0;i<12;i++)assert.equal(checkRequestLimit(request,'/api/assistant/chat'),null);
  assert.ok(checkRequestLimit(request,'/api/assistant/chat')>0);
});

test('HTTP security headers include browser isolation defaults',()=>{
  const headers=new Map(),response={setHeader:(name,value)=>headers.set(name,value)};
  securityHeaders(response,true);
  assert.equal(headers.get('X-Content-Type-Options'),'nosniff');
  assert.equal(headers.get('X-Frame-Options'),'DENY');
  assert.match(headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
  assert.match(headers.get('Strict-Transport-Security'),/max-age=31536000/);
});

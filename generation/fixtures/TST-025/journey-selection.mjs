import assert from 'node:assert/strict';

// Test-strategy fixture ONLY. No browser, login endpoint, or payment service is executed.
const cases=[
 {id:'login-balance',tier:'e2e',suite:'smoke',
  steps:['login','view-balance'],visible:'Balance visible for the authenticated account',
  isolation:'fresh-readonly-user',dependency:'local-fake',reason:'User-visible authenticated navigation to account value'},
 {id:'login-transfer-receipt',tier:'e2e',suite:'smoke',
  steps:['login','transfer','receipt'],visible:'Receipt shows unique transfer reference and PENDING status',
  isolation:'unique-transfer-user',dependency:'local-fake',reason:'Cross-page user flow to created transfer receipt, not settlement'},
 {id:'fee-rounding',tier:'unit',suite:'regression',reason:'Pure decimal arithmetic is deterministic without browser'},
 {id:'invalid-login',tier:'api',suite:'regression',reason:'Authentication rejection code and lockout policy are HTTP contracts'},
 {id:'negative-pagination',tier:'api',suite:'regression',reason:'Bounded page and limit are handler contract checks'},
 {id:'malformed-transfer-json',tier:'api',suite:'regression',reason:'Invalid body rejection belongs to HTTP input validation'},
 {id:'api-amount-type-drift',tier:'contract',suite:'regression',reason:'Pact/OpenAPI type mismatch is provider/consumer compatibility'},
 {id:'idempotency-key-conflict',tier:'integration',suite:'regression',reason:'Repeated write must not create a second persistent transfer'},
 {id:'provider-timeout-unknown',tier:'integration',suite:'regression',reason:'Lost bank reply and stored UNKNOWN require real stub and SQL'}
];

function audit(plan){
 assert.equal(new Set(plan.map(c=>c.id)).size,plan.length,'scenario IDs must be unique');
 const browser=plan.filter(c=>c.tier==='e2e');
 assert.equal(browser.length,2,'keep exactly two high-value E2E smoke journeys');
 assert.deepEqual(browser.map(c=>c.id),['login-balance','login-transfer-receipt']);
 assert.deepEqual(browser[0].steps,['login','view-balance']);
 assert.deepEqual(browser[1].steps,['login','transfer','receipt']);
 assert.match(browser[0].visible,/Balance visible/);
 assert.match(browser[1].visible,/Receipt shows unique transfer reference and PENDING status/);
 assert.notEqual(browser[0].isolation,browser[1].isolation,'mutating journey requires unique data');
 for(const c of browser){
  assert.equal(c.suite,'smoke');
  assert.equal(c.dependency,'local-fake','never depend on production bank');
  assert.ok(c.visible&&c.reason&&c.isolation,'E2E needs visible assertion and isolation');
 }
 const lower=plan.filter(c=>c.tier!=='e2e');
 assert.equal(lower.length,7);
 assert.deepEqual([...new Set(lower.map(c=>c.tier))].sort(),['api','contract','integration','unit']);
 for(const c of lower){
  assert.equal(c.suite,'regression');
  assert.ok(c.reason?.length>12,'lower-layer decision needs rationale');
 }
 assert.equal(plan.find(c=>c.id==='provider-timeout-unknown').tier,'integration');
 assert.equal(plan.find(c=>c.id==='idempotency-key-conflict').tier,'integration');
 assert.equal(plan.find(c=>c.id==='api-amount-type-drift').tier,'contract');
 assert.equal(plan.find(c=>c.id==='negative-pagination').tier,'api');
 assert.equal(plan.find(c=>c.id==='fee-rounding').tier,'unit');
 return {browser,lower};
}
const result=audit(cases);
assert.throws(()=>audit([...cases,{id:'pagination-browser',tier:'e2e',suite:'smoke',visible:'page',isolation:'new-user',dependency:'local-fake',reason:'unnecessary browser'}]));
assert.throws(()=>audit(cases.map(c=>c.id==='login-transfer-receipt'?{...c,steps:['login','transfer']}:c)));
assert.throws(()=>audit(cases.map(c=>c.id==='login-balance'?{...c,dependency:'production-bank'}:c)));
assert.throws(()=>audit(cases.map(c=>c.id==='provider-timeout-unknown'?{...c,tier:'e2e'}:c)));
console.log('e2e-selected='+result.browser.map(c=>c.id).join(','));
console.log('lower-layer-regressions='+result.lower.length);
console.log('lower-layers=api,contract,integration,unit');
console.log('smoke-journeys=2');
console.log('invalid-plans-rejected=4');
console.log('production-dependencies=0');
console.log('browser-execution=not-performed');

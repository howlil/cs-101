import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Executed by the bounded V3 generator from either staging or published fixtures.
// Read the same canonical tracked OpenAPI design file in both locations.
const candidates = ['../../../', '../../../../'].map(up =>
  resolve(process.cwd(), up, 'contracts/SYS-008/transfer-api.openapi.json'));
const location = candidates.find(existsSync);
assert.ok(location, 'Canonical SYS-008 OpenAPI contract is missing');
const api = JSON.parse(readFileSync(location, 'utf8'));
assert.equal(api.openapi, '3.1.1');
assert.deepEqual(Object.keys(api.paths).sort(),
  ['/transfers','/transfers/{id}','/accounts/{id}'].sort());
const post = api.paths['/transfers'].post;
const transferGet = api.paths['/transfers/{id}'].get;
const accountGet = api.paths['/accounts/{id}'].get;
assert.ok(post && transferGet && accountGet);
assert.equal(Object.keys(api.paths['/transfers']).length, 1);
assert.equal(Object.keys(api.paths['/transfers/{id}']).length, 1);
assert.equal(Object.keys(api.paths['/accounts/{id}']).length, 1);
assert.deepEqual(api.security, [{ bearerAuth: [] }]);
assert.equal(api.components.securitySchemes.bearerAuth.scheme, 'bearer');
assert.deepEqual(Object.keys(post.responses).sort(), ['201','400','401','403','409','500'].sort());
for (const get of [transferGet, accountGet]) {
  assert.deepEqual(Object.keys(get.responses).sort(), ['200','401','403','404','500'].sort());
  assert.ok(get.parameters.some(p => p.name === 'id' && p.in === 'path' && p.required));
}
const created = post.responses['201'];
assert.equal(created.headers.Location.example, '/transfers/tr-001');
assert.equal(created.headers.Location.required, true);
const posted = created.content['application/json'].example;
assert.equal(posted.transferId, 'tr-001');
assert.equal(posted.status, 'PENDING');
const req = api.components.schemas.CreateTransfer;
assert.deepEqual(req.required, ['clientReference','sourceAccountId','destinationAccountId','amount','currency']);
assert.equal(req.properties.amount.type, 'string');
assert.equal(api.components.schemas.Transfer.properties.amount.type, 'string');
assert.deepEqual(api.components.schemas.CreateTransfer.properties.currency.enum, ['IDR','USD']);
console.log('contract-paths=3');

// Check chosen response statuses and RFC 9457 examples. This is a bounded design-time
// checker; not a general OpenAPI schema validator and not a live HTTP/Spring test.
for (const operation of [post, transferGet, accountGet]) {
  for (const [http, response] of Object.entries(operation.responses)) {
    if (Number(http) < 400) continue;
    assert.match(response.$ref, /^#\/components\/responses\/[A-Za-z]+$/);
    const name = response.$ref.split('/').at(-1);
    const concrete = api.components.responses[name];
    assert.ok(concrete, 'Missing referenced response ' + name);
    assert.equal(concrete.content['application/problem+json'].schema.$ref,
      '#/components/schemas/Problem');
    const problem = concrete.content['application/problem+json'].example;
    assert.equal(problem.status, Number(http));
    assert.match(problem.type, /^urn:cs101:problem:/);
    assert.ok(problem.title.length > 3);
    assert.ok(!JSON.stringify(problem).match(/stackTrace|password|rawSQL|Authorization:/i));
    if (http === '401') {
      assert.equal(concrete.headers['WWW-Authenticate'].required, true);
      assert.match(concrete.headers['WWW-Authenticate'].example, /^Bearer /);
    }
  }
}
console.log('contract-status-matrix=passed');
console.log('contract-problem-details=passed');

// Simulate ONE explicitly tolerant older client; not all deployed clients are known.
const baseline = api['x-cs101-compatibility'].baselineRequiredTransferProperties;
const transferSchema = api.components.schemas.Transfer;
assert.deepEqual(transferSchema.required, baseline);
assert.equal(transferSchema.properties.description.type, 'string');
assert.equal(baseline.includes('description'), false);
function readWithOldClient(payload) {
  for (const key of baseline) assert.ok(Object.hasOwn(payload, key), 'missing required ' + key);
  for (const key of ['transferId','clientReference','sourceAccountId','destinationAccountId','amount','currency','status','createdAt']) {
    assert.equal(typeof payload[key], 'string', 'unexpected type ' + key);
  }
  return { transferId: payload.transferId, amount: payload.amount, currency: payload.currency };
}
const evolved = { ...posted, description: 'Optional display note' };
assert.deepEqual(readWithOldClient(evolved), readWithOldClient(posted));
assert.throws(() => readWithOldClient({ ...posted, amount: 125000 }), /unexpected type amount/);
assert.throws(() => readWithOldClient({ ...posted, currency: null }), /unexpected type currency/);
console.log('contract-backward-compatible=passed');
console.log('contract-runtime=not-executed');

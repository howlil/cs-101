import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mutation } from '../src/server/http';
const request = (origin = 'http://127.0.0.1:4321', body = '{}') => new Request('http://127.0.0.1:4321/api/sessions', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body });
test('origin asing ditolak sebelum action dijalankan', async () => {
  let called = false;
  const result = await mutation(request('https://unrelated.example'), async () => { called = true; });
  assert.equal(result.status, 403);
  assert.equal(called, false);
});
test('JSON rusak dan payload terlalu besar ditolak', async () => {
  assert.equal((await mutation(request(undefined, '{broken'), async () => ({}))).status, 422);
  assert.equal((await mutation(request(undefined, JSON.stringify('a'.repeat(130 * 1024))), async () => ({}))).status, 413);
});
test('request lokal berhasil dan respons tidak dicache', async () => {
  const result = await mutation(request(), async () => ({ revision: 1 }));
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await result.json(), { revision: 1 });
});

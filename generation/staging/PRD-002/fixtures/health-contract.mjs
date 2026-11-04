import { createServer, get } from 'node:http';
import assert from 'node:assert/strict';
// This simulates endpoint status responses, NOT Kubernetes or Spring Boot.
const state = { warmed: false, db: true, draining: false };
const server = createServer((req, res) => {
  if (req.url !== '/live' && req.url !== '/ready') { res.writeHead(404); res.end(); return; }
  const ok = req.url === '/live' || (state.warmed && state.db && !state.draining);
  res.writeHead(ok ? 200 : 503); res.end(ok ? 'UP' : 'OUT_OF_SERVICE');
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const status = path => new Promise((resolve, reject) => {
  get('http://127.0.0.1:' + server.address().port + path, res => {
    res.resume(); res.once('end', () => resolve(res.statusCode));
  }).once('error', reject);
});
try {
  const bootLive = await status('/live'), bootReady = await status('/ready');
  state.warmed = true;
  const warmReady = await status('/ready');
  state.db = false;
  const downLive = await status('/live'), downReady = await status('/ready');
  state.db = true;
  const recovered = await status('/ready');
  state.draining = true;
  const drainLive = await status('/live'), drainReady = await status('/ready');
  assert.deepEqual([bootLive, bootReady, warmReady, downLive, downReady, recovered, drainLive, drainReady],
    [200, 503, 200, 200, 503, 200, 200, 503]);
  console.log('boot-live=' + bootLive);
  console.log('boot-ready=' + bootReady);
  console.log('warm-ready=' + warmReady);
  console.log('db-down-live=' + downLive);
  console.log('db-down-ready=' + downReady);
  console.log('db-recover-ready=' + recovered);
  console.log('drain-live=' + drainLive);
  console.log('drain-ready=' + drainReady);
} finally {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

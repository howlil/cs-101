import { createServer, request } from 'node:http';

const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/transfers') {
    res.writeHead(201, { 'content-type': 'application/json' });
    res.end('{"id":"tr-001"}');
    return;
  }
  res.writeHead(503, { 'content-type': 'text/plain' });
  res.end('unavailable');
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const port = server.address().port;
const status = (path) => new Promise((resolve, reject) => {
  const req = request({ hostname: '127.0.0.1', port, path, method: 'POST', agent: false }, res => {
    res.resume();
    res.on('end', () => resolve(res.statusCode));
  });
  req.on('error', reject);
  req.end();
});
try {
  console.log('http-created=' + await status('/transfers'));
  console.log('http-unavailable=' + await status('/unavailable'));
} finally {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
try {
  await status('/transfers');
  throw new Error('Closed listener unexpectedly returned an HTTP status');
} catch (error) {
  if (error.code !== 'ECONNREFUSED') throw error;
  console.log('connect-error=' + error.code);
}

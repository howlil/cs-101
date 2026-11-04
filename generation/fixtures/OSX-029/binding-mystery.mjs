import { createServer, connect } from 'node:net';
import assert from 'node:assert/strict';

// Linux-only, one-namespace socket bind proof. 127.0.0.2 is NOT a peer netns.
async function listen(host) {
  const server = createServer(socket => { socket.on('error', () => {}); socket.end(); });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen({ host, port: 0 }, resolve);
  });
  return server;
}
async function probe(host, port) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port });
    socket.setTimeout(1000);
    socket.once('connect', () => { socket.end(); resolve('connected'); });
    socket.once('error', error => { socket.destroy(); resolve(error.code); });
    socket.once('timeout', () => { socket.destroy(); reject(new Error('Connection timed out')); });
  });
}
async function stop(server) {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
const local = await listen('127.0.0.1');
let own, alias;
try {
  own = await probe('127.0.0.1', local.address().port);
  alias = await probe('127.0.0.2', local.address().port);
} finally { await stop(local); }
const all = await listen('0.0.0.0');
let other;
try { other = await probe('127.0.0.2', all.address().port); }
finally { await stop(all); }
assert.equal(own, 'connected');
assert.equal(alias, 'ECONNREFUSED');
assert.equal(other, 'connected');
console.log('loopback-self=connected');
console.log('loopback-alias=ECONNREFUSED');
console.log('wildcard-alias=connected');

import net from 'node:net';
import assert from 'node:assert/strict';

const server = net.createServer((socket) => {
  socket.once('data', (payload) => {
    socket.end(`ACK:${payload.toString('utf8')}`);
  });
});

const listen = () => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    server.off('error', reject);
    resolve(server.address().port);
  });
});
const shutdown = () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));

let client;
try {
  const port = await listen();
  const response = await new Promise((resolve, reject) => {
    client = net.createConnection({host:'127.0.0.1',port});
    let buffer = '';
    let connected = false;
    client.setTimeout(5000, () => reject(new Error('local TCP stream timeout')));
    client.once('connect', () => { connected = true; client.write('hello'); });
    client.on('data', (part) => { buffer += part.toString('utf8'); });
    client.once('end', () => resolve({connected,body:buffer,peerEnded:true}));
    client.once('error', reject);
  });
  assert.deepEqual(response,{connected:true,body:'ACK:hello',peerEnded:true});
  console.log('tcp-connect=ok');
  console.log('tcp-payload=ACK:hello');
  console.log('tcp-peer-end=true');
  await shutdown();
  const refused = await new Promise((resolve, reject) => {
    const closed = net.createConnection({host:'127.0.0.1',port});
    closed.setTimeout(5000,() => {closed.destroy();reject(new Error('closed listener probe timeout'));});
    closed.once('connect',() => {closed.destroy();reject(new Error('connection unexpectedly accepted'));});
    closed.once('error',(error) => resolve(error.code));
  });
  assert.equal(refused,'ECONNREFUSED');
  console.log('tcp-refusal=ECONNREFUSED');
} finally {
  client?.destroy();
  if (server.listening) await shutdown();
}

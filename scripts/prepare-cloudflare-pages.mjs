import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const client = join('dist', 'client');
const server = join('dist', 'server');
const worker = join(client, '_worker.js');
const entry = join(server, 'entry.mjs');

if (!existsSync(client) || !existsSync(entry)) {
  throw new Error('Build Cloudflare Astro tidak menghasilkan dist/client dan dist/server/entry.mjs.');
}

mkdirSync(worker, { recursive: true });
cpSync(server, worker, { recursive: true });
renameSync(join(worker, 'entry.mjs'), join(worker, 'index.js'));
rmSync(join(worker, 'wrangler.json'), { force: true });
rmSync(join('.wrangler', 'deploy', 'config.json'), { force: true });
console.log('Cloudflare Pages Advanced Mode siap: dist/client/_worker.js/index.js');

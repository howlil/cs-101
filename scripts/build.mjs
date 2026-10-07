import { spawnSync } from 'node:child_process';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const target = process.env.WORKERS_CI === '1' ? 'build:cloudflare' : 'build:app';

const result = spawnSync(pnpm, ['run', target], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);

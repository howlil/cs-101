// Catch malformed styles with a pathname before Vite merges CSS into its final bundle.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const fromVite = createRequire(createRequire(import.meta.url).resolve('vite'));
const { transform } = fromVite('lightningcss');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith('.css') ? [path] : [];
  });
}
const files = walk(resolve('src'));
const failed = [];
for (const path of files) {
  try {
    transform({ filename: path, code: readFileSync(path), minify: true });
  } catch (error) {
    failed.push(path + ': ' + (error instanceof Error ? error.message : String(error)));
  }
}
if (failed.length) {
  console.error('CSS validation failed:\n' + failed.join('\n'));
  process.exitCode = 1;
} else {
  console.log('CSS parsed: ' + files.length + ' stylesheets');
}

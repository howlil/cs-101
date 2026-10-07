import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const failures: string[] = [];

function walk(directory: string): string[] {
  return readdirSync(directory)
    .flatMap((name) => {
      const path = join(directory, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
}

const pageFiles = walk(join(root, 'src/pages'))
  .filter((path) => path.endsWith('.astro') && !path.includes('/api/'));

const forbiddenPageMarkup = [
  '<div',
  '<section',
  '<article',
  '<header',
  '<aside',
  '<nav',
  '<form',
  '<button',
  '<input',
  '<select',
  '<textarea',
  '<details',
  '<dialog',
];

for (const path of pageFiles) {
  const source = readFileSync(path, 'utf8');
  const body = source.split('---').slice(2).join('---');
  for (const token of forbiddenPageMarkup) {
    if (body.includes(token)) {
      failures.push(relative(root, path) + ': route Astro contains app markup ' + token);
    }
  }
}

const componentFiles = walk(join(root, 'src/components'))
  .filter((path) => path.endsWith('.tsx') && !path.includes('/arc/'));

const forbiddenNativeControls = [
  '<button',
  '<input',
  '<select',
  '<textarea',
  '<details',
  '<dialog',
];

const forbiddenGlyphIcons = ['←', '→', '◆', '◇', '○', '●', '◐', '✓', '×', '↑', '↓'];

for (const path of componentFiles) {
  const source = readFileSync(path, 'utf8');

  for (const token of forbiddenNativeControls) {
    if (source.includes(token)) {
      failures.push(relative(root, path) + ': native interactive control outside UIArc: ' + token);
    }
  }

  for (const glyph of forbiddenGlyphIcons) {
    if (source.includes(glyph)) {
      failures.push(relative(root, path) + ': text glyph used as icon: ' + glyph);
    }
  }
}

if (failures.length) {
  console.error('UI boundary validation failed:\n');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}

console.log('UI boundary valid: Astro routes are loaders, React owns interaction, UIArc owns controls.');

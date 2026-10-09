import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const srcRoot = join(process.cwd(), 'src');
const violations: string[] = [];

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

// Accept both normal imports and exported-from modules, including Astro frontmatter.
const importPattern = /\b(?:from\s*|import\s*)['"]([^'"]+)['"]/g;

for (const file of walk(srcRoot).filter((p) => /\.(ts|tsx|astro)$/.test(p))) {
  const importer = relative(srcRoot, file).split(sep).join('/');
  const content = readFileSync(file, 'utf8');

  for (const [, specifier] of content.matchAll(importPattern)) {
    if (
      importer.startsWith('domain/') &&
      /^(astro|react|react-dom|@astrojs)(\/|$)/.test(specifier)
    ) {
      violations.push(importer + ': domain cannot depend on framework UI (' + specifier + ')');
    }

    if (!specifier.startsWith('.') && !specifier.startsWith('@/')) continue;
    const target = specifier.startsWith('@/')
      ? resolve(srcRoot, specifier.slice(2))
      : resolve(dirname(file), specifier);
    const relativeTarget = relative(srcRoot, target).split(sep).join('/');
    if (relativeTarget.startsWith('../')) {
      if (importer.startsWith('domain/')) {
        violations.push(importer + ': domain cannot import files outside src (' + specifier + ')');
      }
      continue;
    }

    const domain = importer.startsWith('domain/');
    const server = importer.startsWith('server/');
    const component = importer.startsWith('components/');
    const primitive = importer.startsWith('components/arc/');

    if (domain && /^(server|components|pages|layouts|lib|styles)\//.test(relativeTarget)) {
      violations.push(importer + ': domain may only depend on domain (' + specifier + ')');
    }
    if (server && /^(components|pages|layouts|styles)\//.test(relativeTarget)) {
      violations.push(importer + ': server cannot depend on UI/routes (' + specifier + ')');
    }
    if (component && relativeTarget.startsWith('server/')) {
      violations.push(importer + ': component must receive server data via props/API (' + specifier + ')');
    }
    if (primitive && (
      relativeTarget.startsWith('domain/') ||
      (relativeTarget.startsWith('components/') && !relativeTarget.startsWith('components/arc/'))
    )) {
      violations.push(importer + ': Arc primitives cannot depend on domain/product code (' + specifier + ')');
    }
    if (
      /^server\/learning\/(sqlite|d1)\.(ts|tsx)$/.test(importer) &&
      /^server\/learning\/(sqlite|d1)$/.test(relativeTarget) &&
      importer.slice(0, -3) !== relativeTarget
    ) {
      violations.push(importer + ': persistence adapters cannot import each other (' + specifier + ')');
    }
  }
}

if (violations.length) {
  console.error('Architecture boundary violations:\n' + violations.map((v) => '- ' + v).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Architecture boundaries valid: domain isolated, directional server/UI dependencies and independent storage.');
}

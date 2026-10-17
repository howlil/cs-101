import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { executablePlanSchema, type ExecutablePlan } from '../../src/domain/generation/executable-schema';

const sha256 = (source: Buffer | string) => createHash('sha256').update(source).digest('hex');

export type ExampleResult = {
  id: string;
  runtime: 'node' | 'java';
  file: string;
  fixtureSha256: string;
  stdoutSha256: string;
  verified: true;
};
export type ExecutionProof = {
  version: 1;
  itemId: string;
  curriculumFingerprint: string;
  status: 'verified' | 'not-executable';
  noExecutableReason?: string;
  examples: ExampleResult[];
};

/**
 * Execute only reviewed, local, single-file fixtures. No shell and no arbitrary command/args.
 * The CI runner executes code from the repository: review fixtures as executable code.
 */
export function executeExamples(input: unknown, fixturesDirectory: string): ExecutionProof {
  const plan: ExecutablePlan = executablePlanSchema.parse(input);
  const results = plan.examples.map((example): ExampleResult => {
    const path = join(fixturesDirectory, example.file);
    const bytes = readFileSync(path);
    const executable = example.runtime === 'node' ? process.execPath : 'java';
    const run = spawnSync(executable, [path], {
      cwd: fixturesDirectory,
      encoding: 'utf8',
      timeout: 8000,
      maxBuffer: 64 * 1024,
      shell: false,
      env: { PATH: process.env.PATH, HOME: process.env.HOME, LANG: 'C.UTF-8' },
    });
    if (run.error || run.status !== 0) {
      throw new Error('Executable example failed (' + example.id + '): ' +
        (run.error?.message ?? run.stderr?.slice(0, 500) ?? 'unknown error'));
    }
    const output = run.stdout.replace(/\r\n/g, '\n');
    if (output !== example.expectedStdout.replace(/\r\n/g, '\n')) {
      throw new Error('Executable example output mismatch: ' + example.id);
    }
    return {
      id: example.id, runtime: example.runtime, file: example.file,
      fixtureSha256: sha256(bytes), stdoutSha256: sha256(output), verified: true,
    };
  });
  return {
    version: 1, itemId: plan.itemId,
    curriculumFingerprint: plan.curriculumFingerprint,
    status: results.length ? 'verified' : 'not-executable',
    ...(plan.noExecutableReason && !results.length ? {noExecutableReason: plan.noExecutableReason} : {}),
    examples: results,
  };
}

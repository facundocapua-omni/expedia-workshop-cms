// Plants a data error in a throwaway copy of the project and runs the real build.
// Unit tests cover the helpers; these prove the build itself refuses bad data, which is
// what protects the post-workshop "edit the data, run pnpm build" flow.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SANDBOX = path.join(ROOT, '.test-builds');
const COPY = ['astro.config.mjs', 'package.json', 'tsconfig.json', 'src', 'data', 'decisions', 'model', 'sources', 'scripts'];
let dir: string | undefined;

function edit(file: string, from: string, to: string): void {
  const full = path.join(dir!, file);
  const text = readFileSync(full, 'utf8');
  if (!text.includes(from)) throw new Error(`test setup: "${from}" not found in ${file}`);
  writeFileSync(full, text.replace(from, to));
}

function buildWith(plant: () => void): { status: number | null; output: string } {
  mkdirSync(SANDBOX, { recursive: true });
  dir = mkdtempSync(path.join(SANDBOX, 'build-'));
  for (const entry of COPY) cpSync(path.join(ROOT, entry), path.join(dir, entry), { recursive: true });
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'));
  // A cache of its own, so a planted error can neither read nor poison the real content cache.
  edit('astro.config.mjs', 'defineConfig({', "defineConfig({\n  cacheDir: './.test-cache',");
  plant();
  const run = spawnSync('pnpm', ['run', 'build'], { cwd: dir, encoding: 'utf8' });
  return { status: run.status, output: `${run.stdout}\n${run.stderr}` };
}

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

describe('the build refuses bad data (Review Focus 4)', { timeout: 120_000 }, () => {
  it('fails on a repeated id in data/questions.yaml, naming file and id', () => {
    const { status, output } = buildWith(() => edit('data/questions.yaml', '- id: Q2\n', '- id: Q1\n'));
    expect(status).not.toBe(0);
    expect(output).toContain('data/questions.yaml: duplicate id Q1');
  });

  it('fails on a YAML syntax error in data/questions.yaml', () => {
    const { status, output } = buildWith(() => edit('data/questions.yaml', '- id: Q2\n', '- id: [Q2\n'));
    expect(status).not.toBe(0);
    expect(output).toContain('questions.yaml');
  });

  it('fails on a repeated UC2 question id in the matrix', () => {
    const { status, output } = buildWith(() => edit('model/uc2-matrix.json', '"id": "U2"', '"id": "U1"'));
    expect(status).not.toBe(0);
    expect(output).toContain('duplicate id U1');
  });

  it('fails when a question points at a section that does not exist', () => {
    const { status, output } = buildWith(() => edit('data/questions.yaml', 'section: position', 'section: nowhere'));
    expect(status).not.toBe(0);
    expect(output).toContain('no #nowhere');
  });
});

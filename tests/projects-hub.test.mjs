// tests/projects-hub.test.mjs — runs the projects-hub checker as a child
// process so `npx vitest run` gates on it, same pattern as the other
// checker-invoking suites in this repo (business-line.test.mjs asserts
// static invariants directly via readFileSync; this one instead spawns
// tools/projects-hub-check.js because that checker's assertion inventory
// — frozen-title lookups across 30 detail pages, image-file existence on
// disk, AVIF byte-size budgets — already lives in one dependency-free
// Node script and duplicating it here would just be a second copy to keep
// in sync).
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const checker = join(repo, 'tools/projects-hub-check.js');

describe('projects hub checker', () => {
  it('passes every frozen-content and perf-budget check', () => {
    let out;
    try {
      out = execFileSync('node', [checker], { encoding: 'utf8', cwd: repo });
    } catch (err) {
      // Re-throw with the checker's own failure list attached — a bare
      // "Command failed" from execFileSync hides exactly the bulleted
      // detail this checker exists to produce.
      const detail = (err.stdout || '') + (err.stderr || '');
      throw new Error('projects-hub-check.js exited non-zero:\n' + detail);
    }
    expect(out).toContain('OK: all projects-hub checks passed');
  }, 60_000);
});

// tests/image-budget.test.mjs — runs the site-wide image budget checker as a
// child process so `npx vitest run` gates on it, same pattern as
// tests/projects-hub.test.mjs.
//
// The checker guards what Phase 2 bought: every srcset candidate resolving,
// every <img> carrying width/height, per-page weight under budget, exactly one
// prioritised LCP image per page whose preload matches its <picture> exactly,
// and every <picture> still offering AVIF. Verified against five seeded
// regressions before being wired in.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const checker = join(repo, 'tools/image-budget-check.js');

describe('site-wide image budgets', () => {
  it('passes every per-page budget and <picture> invariant', () => {
    let out;
    try {
      out = execFileSync('node', [checker], { cwd: repo, encoding: 'utf8' });
    } catch (err) {
      // Surface the checker's own bulleted failure list — that detail is the
      // point of the checker and is lost if we only assert on the exit code.
      throw new Error('image-budget-check.js exited non-zero:\n'
        + (err.stdout || '') + (err.stderr || ''));
    }
    expect(out).toContain('OK: all image-budget checks passed');
  });
});

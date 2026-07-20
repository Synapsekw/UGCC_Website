// vitest.config.mjs
// Root `npx vitest run` used to glob into .claude/worktrees/*/tests and
// report other sessions' suites. Scope to this checkout's tests only.
// NOTE: plain-object export, no `import { defineConfig } from 'vitest/config'` —
// this repo has no package.json/node_modules (vitest runs from the npx cache),
// so the bundled config cannot resolve the 'vitest' package at load time.

// The root-anchored include is what keeps a run out of .claude/worktrees/*/
// tests. The .claude exclude is belt-and-braces for any future un-anchored
// include; verified inert inside a worktree (vitest 4.1.10 matches excludes
// root-relatively, so a worktree's own tests are NOT self-excluded).
export default {
  test: {
    include: ['tests/**/*.test.mjs'],
    exclude: ['**/node_modules/**', '**/.claude/**'],
  },
};

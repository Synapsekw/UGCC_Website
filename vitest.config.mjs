// vitest.config.mjs
// Root `npx vitest run` used to glob into .claude/worktrees/*/tests and
// report other sessions' suites. Scope to this checkout's tests only.
// NOTE: plain-object export, no `import { defineConfig } from 'vitest/config'` —
// this repo has no package.json/node_modules (vitest runs from the npx cache),
// so the bundled config cannot resolve the 'vitest' package at load time.

// The include is anchored at <root>/tests, which is what keeps a root run out
// of .claude/worktrees/*/tests. Do NOT add '**/.claude/**' to exclude: vitest
// matches excludes against absolute paths, and inside a worktree (which lives
// under .claude/worktrees/) that pattern excludes the worktree's own tests.
export default {
  test: {
    include: ['tests/**/*.test.mjs'],
    exclude: ['**/node_modules/**'],
  },
};

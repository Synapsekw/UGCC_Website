# Performance, SEO and Codebase-Health Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the UGCC V2 site's image payload by ~85%, remove its render-blocking dead weight, close the mechanical SEO gaps, and make all of it regression-proof in CI.

**Architecture:** A Python/Pillow build script generates AVIF derivatives at the widths each page actually renders, and a second script rewrites `<img>` into `<picture>` using the exact markup pattern the projects hub already ships. A zero-dependency Node checker asserts per-page byte budgets and markup invariants, wired into vitest so `npm test` gates on it. No new system dependencies, no server-side build.

**Tech Stack:** Python 3.9.6 + Pillow 11.3.0 (AVIF/WebP encode confirmed), Node 24 (zero-dep checkers, house style), vitest 4.1.10, Netlify static hosting (`publish = "."`, no build command).

**Spec:** [`docs/superpowers/specs/2026-07-21-performance-seo-optimization-design.md`](../specs/2026-07-21-performance-seo-optimization-design.md)

---

## Conventions this plan follows

Read these before Task 1. They are established in the repo, not invented here.

**The `<picture>` pattern** — copied verbatim from `construction-projects-kuwait/index.html`. AVIF `<source>` plus a JPEG fallback on the `<img>`. **No WebP**: the hub ships AVIF+JPEG only, AVIF is Baseline-supported, and JPEG covers the remainder. Adding WebP would double the derivative count for no reachable browser.

```html
<picture><source type="image/avif" srcset="/assets/img/v3/proj/ra268-440.avif 440w, /assets/img/v3/proj/ra268-880.avif 880w" sizes="(max-width:600px) calc(100vw - 64px), (max-width:920px) 50vw, 384px"><img src="/assets/img/v3/proj/ra268-880.jpg" srcset="/assets/img/v3/proj/ra268-440.jpg 440w, /assets/img/v3/proj/ra268-880.jpg 880w" sizes="(max-width:600px) calc(100vw - 64px), (max-width:920px) 50vw, 384px" alt="" width="880" height="495" loading="lazy" decoding="async"></picture>
```

**Checker style** — `tools/<area>-check.js`: `#!/usr/bin/env node`, `'use strict'`, `require('fs')`/`require('path')`, no dependencies. Numbered checks. Exit 0 with `OK: all <area> checks passed`, exit 1 with a bulleted failure list. Pages are minified onto one enormous line, so **every extraction must be regex- or split-based, never line-based.**

**Test style** — `tests/<area>.test.mjs` spawns the checker with `execFileSync` so `npx vitest run` gates on it. See `tests/projects-hub.test.mjs`.

**Existing budgets** (from `tools/projects-hub-check.js` check 12) — card 440px AVIF ≤ 60 KB, hero AVIF ≤ 250 KB, full-scroll AVIF sum ≤ 1.5 MB. New budgets must not contradict these.

**Branch:** all work lands on **`V3`** (`origin/V3` and the working tree both at `89b06a6`). Three branches carry parallel work and must never be touched: `master`, `v2-basic` (= `origin/V2`, 22 commits ahead), and `master-july2026-changes` (= `origin/master`, 21 ahead).

**Asset paths are v3.** The `89b06a6` rename moved `assets/img/v2/` → `assets/img/v3/`, `v2.css` → `v3.css`, `v2.js` → `v3.js`. Every path in this plan is already v3; if you see a `v2` path anywhere outside Task 0, it is a bug in the plan.

**Content freeze:** re-encoding at identical dimensions and crop is allowed. Changing copy, crops, colours, or swapping an image is not. `alt` text is exempt (invisible to sighted visitors).

**Baseline:** `npx vitest run` → 3 files, **82 tests passing** (restored by Task 0, commit `ca69f42`). Every task ends green.

---

## File Structure

**Created:**

| Path | Responsibility |
| --- | --- |
| `tools/responsive-manifest.py` | Scans every page, emits `tools/responsive-manifest.tsv`: one row per `<img>` needing derivatives — source file, stem, target widths, `sizes`, whether it is the page's LCP |
| `tools/responsive-manifest.tsv` | Generated manifest. Committed, so the rewriter and checker are reproducible without re-scanning |
| `tools/make-responsive-images.py` | Reads the manifest, writes AVIF + JPEG derivatives. Idempotent — skips outputs newer than their source |
| `tools/rewrite-picture-markup.py` | Reads the manifest, rewrites `<img>` → `<picture>` in place. Idempotent — skips any `<img>` already inside a `<picture>` |
| `tools/image-budget-check.js` | Zero-dep Node checker: per-page image budgets, every `<source>` resolves on disk, no `<img>` without `width`/`height` |
| `tests/image-budget.test.mjs` | Spawns the checker under vitest |
| `tools/css-subset.py` | Computes the used-class set from HTML **and JS string literals**, writes the subset stylesheet |
| `package.json` | Pins vitest, provides `npm test` |
| `.github/workflows/test.yml` | Runs `npm test` on push |

**Modified:** all 51 `index.html` files (picture markup, dimensions, preload, alt text), `assets/css/fonts.css`, `netlify.toml`, `README.md`, `vitest.config.mjs`.

**Deleted:** 2,616 unreferenced images under `assets/img/`, 6 merged branches, 4 worktrees.

---

# Phase 1 — Correctness and repo hygiene

Zero-risk cleanup first, so the expensive image work happens on a clean tree.

### Task 0: Repair the v2→v3 rename fallout — ✅ DONE (`ca69f42`)

> **Executed 2026-07-21. Suite restored to 82 passing.** Two findings worth carrying forward, both of which invalidated this task's original approach:
>
> 1. **A literal grep does not find the real bugs.** Three of the four functional defects live in `tests/business-line.test.mjs` as *escaped* regex forms — `v2\.css`, `img\/v2\/blp` — which `grep "v2\.css"` and `grep "assets/img/v2"` both miss. The blanket `sed` in Step 4 below would have rewritten only the comments and left the suite red. **Read the failing assertions; do not trust the grep.**
> 2. **`node tools/<x>-check.js` failing is not evidence of a regression.** Six of the eleven checkers (`business-line`, `business-lines`, `facilities`, `hero`, `offices`, `rail`) are browser-console scripts using `document`/`window`/`location`. They throw `ReferenceError` under Node by design. Only `projects-hub-check.js`, `credentials`, `home`, `projects` and `careers` are Node checkers. Judging health by "how many checkers exit 0" overcounts breakage badly.
>
> The steps below are kept as the record of what was diagnosed and fixed.

The suite is red: 22 of 82 tests fail. Commit `89b06a6` renamed the design layer but left five files asserting v2 paths. **Nothing downstream can be verified until this is green**, so it goes first.

**Files:**
- Modify: `tools/projects-hub-check.js`, `tools/hero-check.js`, `tools/careers-check.js`, `tools/projects-check.js`, `tests/business-line.test.mjs`

- [ ] **Step 1: Confirm the failure and its shape**

```bash
npx vitest run 2>&1 | grep -E 'Test Files|Tests '
node tools/projects-hub-check.js; echo "exit=$?"
```

Expected: `22 failed | 60 passed (82)`, and the checker exits 1 with `12. no hero-current-*.avif found on disk`.

- [ ] **Step 2: Prove the asset actually exists — the path is wrong, not the file**

```bash
ls assets/img/v3/ | grep hero-current
ls assets/img/v2 2>&1 | head -1
```

Expected: `hero-current-{960,1440,1920}.avif` present under v3; `assets/img/v2` reports **No such file or directory**. This is what makes it a stale-path bug rather than a missing asset.

- [ ] **Step 3: List every stale reference before changing any of them**

```bash
grep -rn "assets/img/v2\|v2\.css\|v2\.js\|'v2-\|\"v2-" tools/*.js tests/*.mjs
```

Expected: exactly the eight hits below. **If the list differs, work from the live output, not this table** — another session may have moved things again.

| File:line | Stale token |
| --- | --- |
| `tools/projects-hub-check.js:331` | `assets/img/v2` |
| `tools/projects-hub-check.js:341` | `assets/img/v2` |
| `tools/hero-check.js:373` | `v2.js` |
| `tools/hero-check.js:378` | `v2.css` |
| `tools/careers-check.js:201` | `v2.css` |
| `tools/projects-check.js:64` | `v2.css` |
| `tests/business-line.test.mjs:45` | `v2.css` |
| `tests/business-line.test.mjs:70` | `v2-` class prefix |

- [ ] **Step 4: Rewrite them, scoped to these files only**

**This sed is insufficient — see the note at the top of this task.** It rewrites the comments but misses the three escaped regexes in `tests/business-line.test.mjs`, which are the assertions actually failing. What was done instead:

| File | Change |
| --- | --- |
| `tools/projects-hub-check.js:331,341` | `'assets/img/v2'` → `'assets/img/v3'` |
| `tests/business-line.test.mjs:50` | `/\/assets\/css\/v2\.css\?v=\d+/` → `v3\.css`, and the `iV2` local renamed `iV3` |
| `tests/business-line.test.mjs:70` | `<section class="v2-subnav">` → `v3-subnav` |
| `tests/business-line.test.mjs:105` | `assets\/img\/v2\/blp\/` → `assets\/img\/v3\/blp\/` |
| `hero-check.js:373,378`, `careers-check.js:201`, `projects-check.js:64` | comments only — naming files that no longer exist |

Verify each replacement against the live page before making it, since the correct target is whatever the build actually emits:

```bash
grep -o '/assets/css/[A-Za-z0-9/_-]*\.css[^"]*' civil-infrastructure-kuwait/index.html
grep -o '<section class="[a-z0-9-]*subnav">' civil-infrastructure-kuwait/index.html
grep -o '"image":"[^"]*blp[^"]*"' civil-infrastructure-kuwait/index.html
```

Note the character class: `[a-z/-]` excludes digits and so silently hides `v3.css`. Include `0-9` or the grep lies to you.

- [ ] **Step 5: Verify no stale token survives and no builder hash was harmed**

```bash
grep -rn "assets/img/v2\|v2\.css\|v2\.js\|'v2-\|\"v2-" tools/*.js tests/*.mjs || echo "clean"
grep -rn -- '--v2[a-z0-9]' tools/*.js tests/*.mjs || echo "no builder hashes touched"
```

Expected: `clean`, and `no builder hashes touched`.

- [ ] **Step 6: Run every checker directly, then the suite**

```bash
for c in tools/*-check.js; do printf "%-34s " "$c"; node "$c" >/dev/null 2>&1 && echo OK || echo FAIL; done
npx vitest run 2>&1 | grep -E 'Test Files|Tests '
```

Expected: every checker `OK`, and `Test Files 3 passed (3)` / `Tests 82 passed (82)`.

**If any checker still fails**, read its output in full before editing further — a second, unrelated breakage may be hiding behind the path bug.

- [ ] **Step 7: Commit**

```bash
git add tools/projects-hub-check.js tools/hero-check.js tools/careers-check.js \
        tools/projects-check.js tests/business-line.test.mjs
git commit -m "fix(tests): point the checkers at v3 after the design-layer rename

89b06a6 renamed assets/img/v2 -> v3, v2.css -> v3.css and v2.js -> v3.js
across the build, but five checkers and fixtures kept asserting v2. 22 of 82
tests were failing.

projects-hub-check.js shows the shape of it: line 366 was renamed, 331 and
341 were not, so largestVariant() read a directory that no longer exists and
check 12 reported hero-current-*.avif missing — while the file sat in
assets/img/v3 the whole time.

This went unnoticed because CI only writes a push summary and never runs the
suite. Task 15 closes that.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 1: Restore the About page's Construction image — ✅ CLOSED, PREMISE FALSE (`802aa7f`)

> **Investigated 2026-07-21. There is no blank column on V3; nothing was fixed because nothing was broken.**
>
> Verified in-browser at 1280px: all three Expertise tiles render 351x263 with `naturalWidth > 0`, and the Construction tile shows a UGCC crawler crane at a viaduct. The premise came from `master`'s `4634868`, which fixed a genuinely blank slot in a **panned-crop layout** (`--desktop-left:-508px`, `width:auto`, `height:100%`). V3 rebuilt the row as 4:3 `as-card` tiles with `object-fit: cover`, so that failure mode cannot occur and the commit has nothing to port.
>
> **Lesson: a commit message describes the layout that existed when it was written.** Confirm the failure still reproduces before porting a fix across a rebuild.
>
> Delivered instead: `tests/about-expertise.test.mjs`, pinning three tiles with correct titles, resolving images, non-empty alt and explicit dimensions — file-agnostic, so Phase 2's `<picture>` rewrite does not break it. `about-contractor-kuwait/index.html` is byte-identical to HEAD.
>
> **One open question carried to the user:** `assets/img/v3/about-construction.jpg` (1920x728, 194 KB) is the purpose-shot for that slot and is referenced by nothing, so Task 3 will delete it as an orphan. The tile currently uses a 523 KB PNG instead. Swapping is a visible content change and needs sign-off; the size difference resolves anyway in Phase 2.

The original steps are kept below as the record of what was checked.

### Task 1 (original): Restore the About page's Construction image

V2 references `about-engineering.jpg` and `about-procurement.jpg` but has **zero** references to `about-construction.jpg`, which exists on disk at 198 KB. That Expertise column renders blank. `master`'s commit `4634868` fixed this, but V2's About markup changed afterwards, so this is a port, not a cherry-pick.

**Files:**
- Modify: `about-contractor-kuwait/index.html`
- Test: `tests/about-expertise.test.mjs` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/about-expertise.test.mjs`:

```javascript
// tests/about-expertise.test.mjs — guards the About page's three-column
// Expertise row. V2 shipped with the Construction slot unreferenced, so its
// column rendered blank; this pins all three photos in place.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(repo, 'about-contractor-kuwait/index.html'), 'utf8');

// The page is minified onto one line — count occurrences, never lines.
const count = (needle) => html.split(needle).length - 1;

describe('About page Expertise row', () => {
  it('references all three v3 expertise photos', () => {
    expect(count('about-engineering.jpg')).toBeGreaterThan(0);
    expect(count('about-construction.jpg')).toBeGreaterThan(0);
    expect(count('about-procurement.jpg')).toBeGreaterThan(0);
  });

  it('has no dangling srcset pointing at pre-v3 expertise assets', () => {
    expect(count('editprocurement.jpg')).toBe(0);
    expect(count('media-center-banner')).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run tests/about-expertise.test.mjs
```

Expected: FAIL — `expected 0 to be greater than 0` on `about-construction.jpg`.

- [ ] **Step 3: Inspect what master did, then port it**

```bash
git show 4634868 -- about-contractor-kuwait/index.html | head -40
grep -o 'about-\(engineering\|construction\|procurement\)[^"]*' about-contractor-kuwait/index.html
grep -o 'fx-expertise[^>]*' about-contractor-kuwait/index.html | head
```

Apply the same four remappings master made, against V2's current markup:

| Column | Viewport | From | To |
| --- | --- | --- | --- |
| Engineering | mobile | `about-construction.jpg` | `about-engineering.jpg` |
| Construction | desktop | `about-procurement.jpg` | `about-construction.jpg` |
| Construction | mobile | `media-center-banner` | `about-construction.jpg` |
| Procurement | both | `editprocurement.jpg` | `about-procurement.jpg` |

Also drop the `srcset`/`sizes` left dangling on those slots (they name pre-v3 assets), and set the panned slot's dimensions to the panorama's true aspect: `width="1371"` desktop, `width="844"` mobile, from a 1920x728 source.

- [ ] **Step 4: Verify the test passes and nothing else broke**

```bash
npx vitest run
```

Expected: 4 files, 84 tests, all passing.

- [ ] **Step 5: Verify visually at 1280px**

Start the preview and confirm all three Expertise columns are filled — the failure mode is a *blank* column, which no byte-level test can see.

```
preview_start {name: "<dev server from .claude/launch.json>"}
navigate to /about-contractor-kuwait/
resize_window {preset: "desktop"}
computer {action: "screenshot"}
```

Expected: three photographs, each fully covering its 297x520 container. Confirm no `404` for `about-construction.jpg` via `read_network_requests`.

- [ ] **Step 6: Commit**

```bash
git add about-contractor-kuwait/index.html tests/about-expertise.test.mjs
git commit -m "fix(about): restore the missing Construction image in the Expertise row

Ported from master's 4634868 onto V2's current markup. V2 referenced
about-engineering.jpg and about-procurement.jpg but never
about-construction.jpg, so that column rendered blank.

Test pins all three photos and asserts the pre-v3 assets stay gone.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Delete merged branches and stale worktrees — ✅ DONE

> **Executed 2026-07-21.** Deleted 6 local branches and 4 worktrees; suite green at 92 passing afterwards.
>
> **The local branch was renamed `V2` → `V3` mid-task** by the other session, so `git rev-parse V2` began failing. Anything scripted against the branch name needs re-checking, not just the tip SHA.
>
> Re-verification earned its keep: both protected branches had **moved again** since the rebaseline — `v2-basic` 22→23 ahead, and the `master-july2026` worktree advanced `b3e943d`→`e2931fe`. Deleting from a stale survey would have destroyed live work.
>
> Deleted: `claude/competent-mendel-e55c1f`, `claude/ecstatic-sutherland-1dd1dd`, `claude/elated-lumiere-80daf9`, `hero-recompose`, `projects-hub-tweaks`, `projects-redesign`. Worktrees: the three detached ones plus `master-about-fix`.
>
> Survived, as intended: `master`, `master-july2026-changes`, `v2-basic` — the last two still checked out in their worktrees and being written to.
>
> **Remote refs were NOT touched.** `origin/baseline` and `origin/hero-recompose` are both 0 ahead and deletable, but deleting a remote branch affects everyone using the repo, so it needs explicit sign-off. Left for the user.

### Task 2 (original steps)

Six local branches are 0 commits ahead of V3 — fully absorbed.

**Three branches carry unmerged parallel work and must NOT be deleted:**

| Branch | vs V3 | Why it stays |
| --- | --- | --- |
| `v2-basic` = `origin/V2` | 22 ahead | separate line of work; `origin/V2` was repointed to it |
| `master-july2026-changes` = `origin/master` | 21 ahead | separate line of work |
| `master` (local) | 1 ahead | the backup, and holds the About fix ported in Task 1 |

**Files:** none (git refs only)

- [ ] **Step 1: Re-verify every branch's position before deleting anything**

```bash
for b in $(git for-each-ref --format='%(refname:short)' refs/heads); do
  printf "%-40s " "$b"
  git rev-list --left-right --count "89b06a6...$b" \
    | awk '{printf "behind:%-5s ahead:%s\n", $1, $2}'
done
```

Expected: `ahead:0` for the six deletion candidates, and `ahead:22` / `ahead:21` / `ahead:1` for `v2-basic`, `master-july2026-changes` and `master` respectively.

**If any deletion candidate shows `ahead` greater than 0, stop and report it** — that branch holds unmerged work and the list in this plan is out of date.

- [ ] **Step 2: Remove the four stale worktrees**

```bash
git worktree list
```

Six worktrees exist. **Remove only these four** — they back branches being deleted in Step 3:

```bash
git worktree remove .claude/worktrees/competent-mendel-e55c1f
git worktree remove .claude/worktrees/ecstatic-sutherland-1dd1dd
git worktree remove .claude/worktrees/elated-lumiere-80daf9
git worktree remove .claude/worktrees/master-about-fix
git worktree prune
```

**Leave these two alone** — they back the active parallel branches and another session may be working in them right now:

- `.claude/worktrees/master-july2026` → `master-july2026-changes`
- `.claude/worktrees/v2-basic` → `v2-basic`

If any refuses for uncommitted changes, inspect with `git -C <path> status` and report rather than forcing.

- [ ] **Step 3: Delete the six merged branches**

```bash
git branch -d projects-hub-tweaks projects-redesign hero-recompose \
  claude/ecstatic-sutherland-1dd1dd claude/elated-lumiere-80daf9 \
  claude/competent-mendel-e55c1f
```

`-d` (not `-D`) is deliberate: it refuses anything unmerged.

- [ ] **Step 4: Confirm the end state**

```bash
git branch -vv
git worktree list
```

Expected: exactly `V2` and `master` remain; one worktree (the main checkout).

No commit — deleting refs is not a tree change.

---

### Task 3: Delete the unreferenced images — ✅ DONE (`97b938d`)

> **Executed 2026-07-21. 2,613 files, 294 MB freed; `assets/` 453 MB → 167 MB.**
>
> **The plan's scanner would have caused damage.** As specified it scanned only HTML/CSS/JS, which misses the `tools/make-*.sh` generators — those name their SOURCE images, and a source is typically referenced by nothing else since only its derivative reaches a page. Seven build sources (2.4 MB), including `card-kp3.jpg` and `slide-09.jpg`, were in scope for deletion; losing them would have made the projects-hub cards and rail slides unregenerable. Fixed by adding `.sh`/`.py` to `SCAN_EXT`, which protects them automatically rather than by hand-maintained list.
>
> Two more v2→v3 leftovers surfaced here and were fixed: `make-rail-images.sh` read from `assets/img/v2`, and `make-careers-image.sh` would have `mkdir -p`'d a stray `v2` output directory. **Task 0 missed both because it only swept `*-check.js` and `tests/`** — the rename fallout was wider than the test failures revealed.
>
> Hardening added beyond the plan: the scanner refuses `--delete` while any reference is broken, and reports referenced-but-missing separately from orphaned, so a broken page cannot hide among orphans.
>
> Verified: 0 orphans and 0 missing afterwards; 92 tests; all five Node checkers; and a crawl of every URL in `sitemap.xml` resolved **1,014 asset references across 476 distinct files with zero 404s** and a clean console.

### Task 3 (original steps)

297 MB tracked in git, referenced by no HTML/CSS/JS. Git history retains all of it.

**Files:** Delete: 2,616 files under `assets/img/`

- [ ] **Step 1: Write the reference scanner**

**A keep-list is required.** `tools/orphan-keep.txt` names assets that are
unreferenced but must survive — currently `img/v3/about-construction.jpg`, the
commissioned Expertise photo (decision recorded 2026-07-21, Task 1). The
scanner must honour it, or the next `--delete` silently drops the file.

Create `tools/find-orphan-assets.py`:

```python
#!/usr/bin/env python3
"""tools/find-orphan-assets.py — lists asset files under assets/img and
assets/video that no HTML, CSS or JS file references.

Usage:  python3 tools/find-orphan-assets.py [--delete]

Without --delete it only reports. Worktrees and vendor dirs are skipped so a
concurrent session's checkout cannot make a live asset look orphaned.
"""
import os
import re
import sys

SKIP_DIRS = {'node_modules', '.git', '.claude', '.superpowers'}
SCAN_EXT = ('.html', '.css', '.js', '.mjs')
REF = re.compile(r'assets/((?:img|video)/[A-Za-z0-9._\-/]+)')


def repo_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def kept(root):
    """Paths listed in tools/orphan-keep.txt are never deleted."""
    path = os.path.join(root, 'tools/orphan-keep.txt')
    if not os.path.exists(path):
        return set()
    keep = set()
    with open(path, encoding='utf-8') as handle:
        for line in handle:
            line = line.strip()
            if line and not line.startswith('#'):
                keep.add(line)
    return keep


def referenced(root):
    """Every assets/{img,video}/... path mentioned anywhere in the source."""
    found = set()
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if name.endswith(SCAN_EXT):
                path = os.path.join(dirpath, name)
                with open(path, encoding='utf-8', errors='ignore') as handle:
                    found.update(REF.findall(handle.read()))
    return found


def on_disk(root):
    """Maps 'img/foo.jpg' -> absolute path for everything under assets/."""
    files = {}
    for base in ('assets/img', 'assets/video'):
        for dirpath, _, filenames in os.walk(os.path.join(root, base)):
            for name in filenames:
                path = os.path.join(dirpath, name)
                files[os.path.relpath(path, os.path.join(root, 'assets'))] = path
    return files


def main():
    root = repo_root()
    refs, disk, keep = referenced(root), on_disk(root), kept(root)
    orphans = {rel: p for rel, p in disk.items()
               if rel not in refs and rel not in keep}
    total = sum(os.path.getsize(p) for p in orphans.values())

    print('referenced: %d' % len(refs))
    print('kept:       %d (tools/orphan-keep.txt)' % len(keep))
    print('on disk:    %d' % len(disk))
    print('orphaned:   %d files, %.1f MB' % (len(orphans), total / 1e6))

    missing = sorted(r for r in refs if r not in disk)
    if missing:
        print('\nWARNING: %d referenced files are MISSING from disk:' % len(missing))
        for rel in missing[:20]:
            print('  ' + rel)

    if '--delete' in sys.argv:
        for path in orphans.values():
            os.remove(path)
        print('\ndeleted %d files' % len(orphans))
    else:
        print('\n(dry run — pass --delete to remove them)')


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Dry-run it**

```bash
python3 tools/find-orphan-assets.py
```

Expected: `orphaned: 2621 files, 297.1 MB` (2,616 under `assets/img` root plus a handful elsewhere; the exact count may drift slightly after Task 1 re-referenced `about-construction.jpg`).

**If the MISSING warning lists anything, stop and report** — that means a page points at a file that does not exist, which is a separate bug.

- [ ] **Step 3: Delete, then immediately re-verify nothing broke**

```bash
python3 tools/find-orphan-assets.py --delete
python3 tools/find-orphan-assets.py   # must now report 0 orphans and 0 missing
npx vitest run
du -sh assets/
```

Expected: `orphaned: 0 files`, no MISSING warning, 84 tests passing, `assets/` down from ~453 MB to ~155 MB.

- [ ] **Step 4: Spot-check the site still renders**

Load `/`, `/about-contractor-kuwait/`, `/construction-projects-kuwait/` in the preview and confirm `read_network_requests` shows **no image 404s**. The scanner is regex-based; a dynamically-built image path would evade it, and this is the check that would catch that.

- [ ] **Step 5: Commit**

```bash
git add -A assets tools/find-orphan-assets.py
git commit -m "chore(assets): drop 297MB of unreferenced images

2,616 files under assets/img referenced by no HTML, CSS or JS. Git history
retains every one; this is a working-tree removal that cuts the deployed
footprint from ~453MB to ~155MB.

tools/find-orphan-assets.py is the scanner, kept so the check is repeatable.
It also reports referenced-but-missing files, which is how a broken reference
would surface.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Phase 2 — Responsive image pipeline

The main event. 512 referenced files, 169.6 MB; benchmarked AVIF saving is 85% at a mean channel difference of 1.86–3.54/255 (visually indistinguishable).

### Task 4: Build the manifest generator

Deciding *which* widths each image needs is the whole problem. Generating three widths for a 160x160 client logo wastes bytes; generating one for a full-bleed hero wastes quality. The manifest makes that decision once, reviewably, in a committed file.

**Files:**
- Create: `tools/responsive-manifest.py`, `tools/responsive-manifest.tsv`

- [ ] **Step 1: Write the generator**

Create `tools/responsive-manifest.py`:

```python
#!/usr/bin/env python3
"""tools/responsive-manifest.py — decides which images need derivatives and
at which widths, and writes tools/responsive-manifest.tsv.

Usage:  python3 tools/responsive-manifest.py

One row per <img> that is worth converting. Columns:
  page  src  stem  widths  sizes  role

  page    page path relative to the repo root
  src     source file, relative to the repo root
  stem    derivative filename stem under assets/img/v3/resp/
  widths  comma-separated target widths (never above the source width)
  sizes   the sizes attribute to emit
  role    'lcp' for the page's first eager image, else 'below'

Skipped: anything already inside a <picture> (the projects hub is already
done), anything under 40KB (derivatives would not pay for the extra request),
and logos/icons, which are small flat PNGs that AVIF does not help.
"""
import os
import re

SKIP_DIRS = {'node_modules', '.git', '.claude', '.superpowers'}
MIN_BYTES = 40 * 1024
LADDER = (480, 960, 1440, 1920)

IMG_TAG = re.compile(r'<img\b[^>]*>')
PICTURE = re.compile(r'<picture>.*?</picture>', re.S)
SRC_ATTR = re.compile(r'\bsrc="(/assets/img/[^"]+)"')
CLASS_ATTR = re.compile(r'\bclass="([^"]*)"')

# Full-bleed covers and heroes span the viewport; cards and inline figures do
# not. Getting `sizes` wrong is what makes a browser download the wrong width.
SIZES_FULL = '100vw'
SIZES_CARD = '(max-width:600px) calc(100vw - 64px), (max-width:920px) 50vw, 384px'
FULL_BLEED_HINTS = ('cover', 'hero', 'banner', 'as-cover')

# Brand marks and client logos: small, flat, already optimal as PNG.
LOGO_HINTS = ('logo', 'icon', 'favicon', 'android-chrome', 'apple-touch')


def repo_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def pages(root):
    out = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        if 'index.html' in filenames:
            out.append(os.path.join(dirpath, 'index.html'))
    return sorted(out)


def stem_for(src):
    """assets/img/ab12-cover-XY.jpg -> ab12-cover-XY (collision-free: the
    builder's hash prefix is already unique per file)."""
    return os.path.splitext(os.path.basename(src))[0]


def widths_for(src_width):
    picked = [w for w in LADDER if w <= src_width]
    # Always give at least one width; never upscale past the source.
    return picked or [src_width]


def main():
    from PIL import Image

    root = repo_root()
    rows = []
    seen = set()

    for page in pages(root):
        with open(page, encoding='utf-8', errors='ignore') as handle:
            html = handle.read()

        # Blank out existing <picture> blocks so their <img> are not re-processed.
        masked = PICTURE.sub(lambda m: ' ' * len(m.group(0)), html)

        first_eager_done = False
        for tag in IMG_TAG.findall(masked):
            src_match = SRC_ATTR.search(tag)
            if not src_match:
                continue
            rel = src_match.group(1).lstrip('/')
            abs_path = os.path.join(root, rel)
            if not os.path.exists(abs_path):
                continue

            lowered = rel.lower()
            if any(h in lowered for h in LOGO_HINTS):
                continue
            if os.path.getsize(abs_path) < MIN_BYTES:
                continue

            class_match = CLASS_ATTR.search(tag)
            classes = (class_match.group(1) if class_match else '').lower()
            full_bleed = any(h in classes or h in lowered for h in FULL_BLEED_HINTS)

            is_lazy = 'loading="lazy"' in tag
            role = 'below'
            if not is_lazy and not first_eager_done:
                role = 'lcp'
                first_eager_done = True

            with Image.open(abs_path) as im:
                src_width = im.size[0]

            key = (os.path.relpath(page, root), rel)
            if key in seen:
                continue
            seen.add(key)

            rows.append((
                os.path.relpath(page, root),
                rel,
                stem_for(rel),
                ','.join(str(w) for w in widths_for(src_width)),
                SIZES_FULL if full_bleed else SIZES_CARD,
                role,
            ))

    out_path = os.path.join(root, 'tools/responsive-manifest.tsv')
    with open(out_path, 'w', encoding='utf-8') as handle:
        handle.write('page\tsrc\tstem\twidths\tsizes\trole\n')
        for row in rows:
            handle.write('\t'.join(row) + '\n')

    print('wrote %s: %d rows across %d pages'
          % (out_path, len(rows), len({r[0] for r in rows})))
    print('lcp rows: %d' % sum(1 for r in rows if r[5] == 'lcp'))


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Generate and eyeball it**

```bash
python3 tools/responsive-manifest.py
column -t -s $'\t' tools/responsive-manifest.tsv | head -30
awk -F'\t' 'NR>1 {print $6}' tools/responsive-manifest.tsv | sort | uniq -c
```

Expected: roughly 280–350 rows, one `lcp` row per page (≈51). **Sanity-check by hand:** every `lcp` row should be a genuine above-the-fold hero, and no row should name a client logo. If a page has no `lcp` row, its images are all lazy — note it, since that page's LCP is then text.

- [ ] **Step 3: Commit the manifest**

```bash
git add tools/responsive-manifest.py tools/responsive-manifest.tsv
git commit -m "build(images): manifest of which images need derivatives, at which widths

Decides the width ladder per image from its intrinsic size (never upscales),
picks sizes from whether the slot is full-bleed or a card, and marks each
page's first eager image as its LCP candidate.

Skips images already inside a <picture> (the projects hub is done), anything
under 40KB where an extra request costs more than it saves, and logos/icons
where AVIF does not beat a small flat PNG.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Generate the derivatives

**Files:**
- Create: `tools/make-responsive-images.py`, `assets/img/v3/resp/*.{avif,jpg}`

- [ ] **Step 1: Write the encoder**

Create `tools/make-responsive-images.py`:

```python
#!/usr/bin/env python3
"""tools/make-responsive-images.py — writes AVIF + JPEG derivatives listed in
tools/responsive-manifest.tsv into assets/img/v3/resp/.

Usage:  python3 tools/make-responsive-images.py [--force]

Idempotent: an output newer than its source is left alone, so re-running is
cheap. Pass --force to rebuild everything.

Quality settings are the benchmarked ones (spec, 2026-07-21): AVIF q60 and
JPEG q82 progressive gave an 85%/74% saving at a mean channel difference of
1.86-3.54/255 against the source — visually indistinguishable, which is what
the customer content freeze requires. Resizing never crops: only the longest
edge is constrained, so framing is untouched.
"""
import os
import sys

AVIF_QUALITY = 60
JPEG_QUALITY = 82
OUT_DIR = 'assets/img/v3/resp'


def repo_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def rows(root):
    path = os.path.join(root, 'tools/responsive-manifest.tsv')
    with open(path, encoding='utf-8') as handle:
        header = handle.readline().rstrip('\n').split('\t')
        for line in handle:
            if line.strip():
                yield dict(zip(header, line.rstrip('\n').split('\t')))


def stale(src, dst, force):
    if force or not os.path.exists(dst):
        return True
    return os.path.getmtime(dst) < os.path.getmtime(src)


def main():
    from PIL import Image

    force = '--force' in sys.argv
    root = repo_root()
    out_dir = os.path.join(root, OUT_DIR)
    os.makedirs(out_dir, exist_ok=True)

    # One source can appear on several pages; encode each (stem, width) once.
    jobs = {}
    for row in rows(root):
        for width in (int(w) for w in row['widths'].split(',')):
            jobs[(row['stem'], width)] = row['src']

    written = skipped = 0
    src_bytes = out_bytes = 0

    for (stem, width), src_rel in sorted(jobs.items()):
        src = os.path.join(root, src_rel)
        targets = [
            (os.path.join(out_dir, '%s-%d.avif' % (stem, width)), 'AVIF',
             dict(quality=AVIF_QUALITY)),
            (os.path.join(out_dir, '%s-%d.jpg' % (stem, width)), 'JPEG',
             dict(quality=JPEG_QUALITY, optimize=True, progressive=True)),
        ]
        if not any(stale(src, dst, force) for dst, _, _ in targets):
            skipped += len(targets)
            continue

        with Image.open(src) as im:
            im = im.convert('RGB')
            resized = im.copy()
            # thumbnail() preserves aspect ratio and never upscales.
            resized.thumbnail((width, 10 ** 6), Image.LANCZOS)
            for dst, fmt, kwargs in targets:
                resized.save(dst, fmt, **kwargs)
                out_bytes += os.path.getsize(dst)
                written += 1

        src_bytes += os.path.getsize(src)

    print('wrote %d files, skipped %d up-to-date' % (written, skipped))
    if src_bytes:
        print('sources touched %.1f MB -> derivatives %.1f MB (%.0f%% smaller)'
              % (src_bytes / 1e6, out_bytes / 1e6,
                 100 - 100 * out_bytes / src_bytes))


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Run it**

```bash
time python3 tools/make-responsive-images.py
ls assets/img/v3/resp | wc -l
du -sh assets/img/v3/resp
```

Expected: roughly 4 minutes, ~1,700 files, a few tens of MB. The saving line should report 80%+.

- [ ] **Step 3: Verify fidelity, not just file count**

A silently-corrupt encode is the real risk here — a file can exist, have plausible bytes, and still be wrong.

```bash
python3 - <<'PY'
from PIL import Image, ImageChops, ImageStat
import csv, os, random
root = os.getcwd()
rows = list(csv.DictReader(open('tools/responsive-manifest.tsv'), delimiter='\t'))
random.seed(11)
worst = 0.0
for row in random.sample(rows, 25):
    width = int(row['widths'].split(',')[0])
    dst = 'assets/img/v3/resp/%s-%d.avif' % (row['stem'], width)
    ref = Image.open(row['src']).convert('RGB')
    ref.thumbnail((width, 10**6), Image.LANCZOS)
    got = Image.open(dst); got.load(); got = got.convert('RGB')
    assert got.size == ref.size, (dst, got.size, ref.size)
    diff = sum(ImageStat.Stat(ImageChops.difference(ref, got)).mean) / 3
    worst = max(worst, diff)
    print('%-58s %s diff=%.2f' % (row['stem'][:58], got.size, diff))
print('\nworst mean channel diff: %.2f (expect < 6)' % worst)
PY
```

Expected: every derivative decodes, dimensions match, worst diff well under 6/255.

- [ ] **Step 4: Commit**

```bash
git add tools/make-responsive-images.py assets/img/v3/resp
git commit -m "build(images): generate AVIF + JPEG derivatives for every page image

AVIF q60 / JPEG q82 progressive, benchmarked at 85%/74% saving with a mean
channel difference under 4/255 — visually indistinguishable, so the content
freeze holds. Resize constrains the longest edge only; no crop, no upscale.

Idempotent, so re-running after adding a page costs only the new files.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Rewrite the markup to `<picture>`

**Files:**
- Create: `tools/rewrite-picture-markup.py`
- Modify: all 51 `index.html`

- [ ] **Step 1: Write the rewriter**

Create `tools/rewrite-picture-markup.py`:

```python
#!/usr/bin/env python3
"""tools/rewrite-picture-markup.py — rewrites the <img> tags named in
tools/responsive-manifest.tsv into <picture> blocks.

Usage:  python3 tools/rewrite-picture-markup.py [--dry-run]

Emits the same shape the projects hub already ships: an AVIF <source> plus a
JPEG fallback on the <img>, both carrying srcset/sizes. No WebP — AVIF is
Baseline and JPEG covers the rest, so a third format would double the
derivative count for no reachable browser.

Idempotent: an <img> already inside a <picture> is skipped, so re-running
after adding a page is safe.

Attributes added: width/height from the largest derivative (kills layout
shift), decoding="async" always, and either fetchpriority="high" for the LCP
image or loading="lazy" for everything else. Existing alt text is preserved
byte-for-byte — the content freeze covers it.
"""
import os
import re
import sys

IMG_TAG = re.compile(r'<img\b[^>]*>')
PICTURE = re.compile(r'<picture>.*?</picture>', re.S)
SRC_ATTR = re.compile(r'\bsrc="(/assets/img/[^"]+)"')
ATTR = re.compile(r'\s+(?:width|height|loading|decoding|fetchpriority|srcset|sizes)="[^"]*"')


def repo_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def rows(root):
    path = os.path.join(root, 'tools/responsive-manifest.tsv')
    with open(path, encoding='utf-8') as handle:
        header = handle.readline().rstrip('\n').split('\t')
        for line in handle:
            if line.strip():
                yield dict(zip(header, line.rstrip('\n').split('\t')))


def srcset(stem, widths, ext):
    return ', '.join('/assets/img/v3/resp/%s-%d.%s %dw' % (stem, w, ext, w)
                     for w in widths)


def build(tag, row, dims):
    widths = [int(w) for w in row['widths'].split(',')]
    largest = widths[-1]
    sizes = row['sizes']
    width, height = dims

    inner = ATTR.sub('', tag)
    inner = SRC_ATTR.sub(
        lambda m: 'src="/assets/img/v3/resp/%s-%d.jpg"' % (row['stem'], largest),
        inner)

    extras = [
        'srcset="%s"' % srcset(row['stem'], widths, 'jpg'),
        'sizes="%s"' % sizes,
        'width="%d"' % width,
        'height="%d"' % height,
        'decoding="async"',
    ]
    extras.append('fetchpriority="high"' if row['role'] == 'lcp'
                  else 'loading="lazy"')

    inner = inner[:-1].rstrip() + ' ' + ' '.join(extras) + '>'
    source = ('<source type="image/avif" srcset="%s" sizes="%s">'
              % (srcset(row['stem'], widths, 'avif'), sizes))
    return '<picture>' + source + inner + '</picture>'


def main():
    from PIL import Image

    dry = '--dry-run' in sys.argv
    root = repo_root()

    by_page = {}
    for row in rows(root):
        by_page.setdefault(row['page'], []).append(row)

    total = 0
    for page, page_rows in sorted(by_page.items()):
        path = os.path.join(root, page)
        with open(path, encoding='utf-8') as handle:
            html = handle.read()

        # Protect already-converted blocks from a second rewrite.
        spans = [m.span() for m in PICTURE.finditer(html)]

        def inside_picture(pos):
            return any(a <= pos < b for a, b in spans)

        wanted = {r['src']: r for r in page_rows}
        changed = 0
        out = []
        last = 0
        for match in IMG_TAG.finditer(html):
            if inside_picture(match.start()):
                continue
            src_match = SRC_ATTR.search(match.group(0))
            if not src_match:
                continue
            row = wanted.get(src_match.group(1).lstrip('/'))
            if row is None:
                continue
            largest = int(row['widths'].split(',')[-1])
            derivative = os.path.join(
                root, 'assets/img/v3/resp/%s-%d.jpg' % (row['stem'], largest))
            if not os.path.exists(derivative):
                print('  MISSING derivative, skipping: %s' % derivative)
                continue
            with Image.open(derivative) as im:
                dims = im.size

            out.append(html[last:match.start()])
            out.append(build(match.group(0), row, dims))
            last = match.end()
            changed += 1

        if changed:
            out.append(html[last:])
            if not dry:
                with open(path, 'w', encoding='utf-8') as handle:
                    handle.write(''.join(out))
            print('%-60s %d images' % (page, changed))
            total += changed

    print('\n%s %d <img> tags' % ('would rewrite' if dry else 'rewrote', total))


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Dry-run first**

```bash
python3 tools/rewrite-picture-markup.py --dry-run
```

Expected: a per-page count summing to the manifest row count, and **no `MISSING derivative` lines**. If any appear, re-run Task 5 before continuing.

- [ ] **Step 3: Rewrite, then verify against a clean baseline**

```bash
git status --short | head
python3 tools/rewrite-picture-markup.py
npx vitest run
```

Expected: 84 tests still passing. The projects-hub checker is the important one here — it asserts byte-exact frozen content, so if the rewriter damaged any markup it fails loudly.

- [ ] **Step 4: Confirm no image regressed and the payload actually dropped**

```bash
python3 - <<'PY'
import os, re
skip = {'node_modules', '.git', '.claude', '.superpowers'}
pat = re.compile(r'assets/((?:img|video)/[A-Za-z0-9._\-/]+)')
total = 0
for dirpath, dirnames, filenames in os.walk('.'):
    dirnames[:] = [d for d in dirnames if d not in skip]
    if 'index.html' not in filenames:
        continue
    html = open(os.path.join(dirpath, 'index.html'), encoding='utf-8', errors='ignore').read()
    # Weight of the largest candidate per <picture>, i.e. worst-case fetch.
    refs = {r for r in pat.findall(html) if r.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.avif'))}
    size = sum(os.path.getsize(os.path.join('assets', r))
               for r in refs if os.path.exists(os.path.join('assets', r)))
    total += size
    if size > 2_000_000:
        print('%8.1f MB  %s' % (size / 1e6, dirpath))
print('\ntotal referenced image weight: %.1f MB' % (total / 1e6))
PY
```

Expected: no page over 2 MB, and the total far below the 169.6 MB baseline.

- [ ] **Step 5: Verify visually across page families**

Load `/`, `/about-contractor-kuwait/`, `/construction-projects-kuwait/`, `/careers/`, `/ra-259/` in the preview. For each: `read_network_requests` shows AVIF being served with **no 404s**, and a screenshot shows every image present and correctly framed. Then `resize_window {preset: "mobile"}` on the homepage and confirm the narrow variants load rather than the 1920px ones.

- [ ] **Step 6: Commit**

```bash
git add -A tools/rewrite-picture-markup.py *.html */index.html
git commit -m "perf(images): serve AVIF via <picture> across all 51 pages

Same markup shape the projects hub already ships: AVIF <source> plus a JPEG
fallback, both with srcset/sizes. Adds width/height to every converted slot
(kills layout shift), fetchpriority=high on each page's LCP image, and
loading=lazy on the rest. Alt text preserved byte-for-byte.

Rewriter is idempotent — <img> already inside a <picture> is skipped.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Preload each page's LCP image

`fetchpriority` alone still waits for the parser to reach the tag. A `<link rel="preload">` in `<head>` starts the fetch immediately — the single biggest LCP lever after format.

**Files:**
- Create: `tools/add-lcp-preload.py`
- Modify: all 51 `index.html`

- [ ] **Step 1: Write it**

Create `tools/add-lcp-preload.py`:

```python
#!/usr/bin/env python3
"""tools/add-lcp-preload.py — inserts a <link rel="preload" as="image"> for
each page's LCP image, immediately before </head>.

Usage:  python3 tools/add-lcp-preload.py

imagesrcset/imagesizes mirror the <picture> exactly, and type="image/avif"
scopes the preload to the AVIF candidate so a browser without AVIF support
does not download a file it will not use.

Idempotent: a page that already has an image preload is left alone.
"""
import os

MARKER = 'rel="preload" as="image"'


def repo_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def rows(root):
    path = os.path.join(root, 'tools/responsive-manifest.tsv')
    with open(path, encoding='utf-8') as handle:
        header = handle.readline().rstrip('\n').split('\t')
        for line in handle:
            if line.strip():
                yield dict(zip(header, line.rstrip('\n').split('\t')))


def main():
    root = repo_root()
    added = 0
    for row in rows(root):
        if row['role'] != 'lcp':
            continue
        path = os.path.join(root, row['page'])
        with open(path, encoding='utf-8') as handle:
            html = handle.read()
        if MARKER in html:
            continue

        widths = [int(w) for w in row['widths'].split(',')]
        srcset = ', '.join('/assets/img/v3/resp/%s-%d.avif %dw'
                           % (row['stem'], w, w) for w in widths)
        link = ('<link rel="preload" as="image" type="image/avif" '
                'imagesrcset="%s" imagesizes="%s">' % (srcset, row['sizes']))

        html = html.replace('</head>', link + '</head>', 1)
        with open(path, 'w', encoding='utf-8') as handle:
            handle.write(html)
        print('%-60s %s' % (row['page'], row['stem']))
        added += 1
    print('\nadded %d preloads' % added)


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Run and verify**

```bash
python3 tools/add-lcp-preload.py
python3 tools/add-lcp-preload.py   # second run must add 0 — proves idempotence
grep -c 'rel="preload" as="image"' index.html
npx vitest run
```

Expected: ~51 added on the first run, `added 0 preloads` on the second, `1` in `index.html`, 84 tests passing.

- [ ] **Step 3: Confirm the preload is used, not wasted**

Load `/` in the preview. In `read_console_messages`, a preload that nothing consumes logs a browser warning like *"was preloaded using link preload but not used within a few seconds"*. **Expected: no such warning.** If it appears, the `imagesrcset`/`imagesizes` do not match the `<picture>` and the file is being downloaded twice — fix before committing.

- [ ] **Step 4: Commit**

```bash
git add tools/add-lcp-preload.py *.html */index.html
git commit -m "perf(images): preload each page's LCP image

fetchpriority alone still waits for the parser to reach the tag; the preload
starts the fetch at head-parse time. imagesrcset/imagesizes mirror the
<picture> exactly and type=image/avif scopes it, so no browser downloads a
candidate it will not use.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Lock it in with a budget checker

Without this, the next person to drop a 3 MB JPEG in undoes Phase 2 silently.

**Files:**
- Create: `tools/image-budget-check.js`, `tests/image-budget.test.mjs`

- [ ] **Step 1: Write the checker**

Create `tools/image-budget-check.js`:

```javascript
#!/usr/bin/env node
/* tools/image-budget-check.js — per-page image budgets and <picture>
   invariants for the whole site. Node, zero dependencies.
   Usage: node tools/image-budget-check.js

   Reads every <page>/index.html and the derivative files on disk. Git history
   is NOT consulted — files on disk only.

   Plain string/regex parsing is the house style for these checkers (see
   tools/projects-hub-check.js). The production HTML is minified onto very
   long lines, so every extraction is regex-based rather than line-based.

   Exit 0 + "OK: all image-budget checks passed" on success.
   Exit 1 + a bulleted failure list on any failure. */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

const PAGE_BUDGET_BYTES = 2 * 1024 * 1024;   // worst-case fetch per page
const LCP_BUDGET_BYTES = 250 * 1024;         // matches projects-hub check 12
const SKIP_DIRS = new Set(['node_modules', '.git', '.claude', '.superpowers',
  'assets', 'tools', 'tests', 'docs', 'netlify']);

function pages(dir, found) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    const candidate = path.join(dir, entry.name, 'index.html');
    if (fs.existsSync(candidate)) found.push(candidate);
  }
  return found;
}

const allPages = pages(root, [path.join(root, 'index.html')]);
check(allPages.length >= 50,
  '0. found only ' + allPages.length + ' pages, expected >= 50 — the walk is wrong');

const sizeOf = (rel) => {
  try { return fs.statSync(path.join(root, rel)).size; } catch (e) { return null; }
};

for (const page of allPages) {
  const label = path.relative(root, page);
  const html = fs.readFileSync(page, 'utf8');

  /* 1. Every <source>/srcset candidate resolves to a real file. */
  const candidates = new Set();
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const url = part.trim().split(/\s+/)[0];
      if (url.startsWith('/assets/')) candidates.add(url.slice(1));
    }
  }
  const missing = [...candidates].filter((rel) => sizeOf(rel) === null);
  check(missing.length === 0,
    '1. ' + label + ': srcset points at missing files: ' + missing.slice(0, 5).join(', '));

  /* 2. No <img> without both width and height (layout shift). */
  const bare = (html.match(/<img\b[^>]*>/g) || [])
    .filter((tag) => !(/\bwidth="/.test(tag) && /\bheight="/.test(tag)));
  check(bare.length === 0,
    '2. ' + label + ': ' + bare.length + ' <img> without width/height');

  /* 3. Worst-case page image weight — the largest candidate of each set, which
        is what a wide viewport actually fetches. */
  let worst = 0;
  for (const m of html.matchAll(/<picture>[\s\S]*?<\/picture>/g)) {
    const jpgs = [...m[0].matchAll(/(\/assets\/img\/v3\/resp\/[^"\s]+\.jpg)\s+(\d+)w/g)];
    if (!jpgs.length) continue;
    const biggest = jpgs.sort((a, b) => Number(b[2]) - Number(a[2]))[0][1];
    worst += sizeOf(biggest.slice(1)) || 0;
  }
  check(worst <= PAGE_BUDGET_BYTES,
    '3. ' + label + ': worst-case image weight ' + (worst / 1e6).toFixed(2)
    + 'MB exceeds the ' + (PAGE_BUDGET_BYTES / 1e6).toFixed(1) + 'MB budget');

  /* 4. The preloaded LCP candidate stays small. */
  const preload = html.match(/rel="preload" as="image"[^>]*imagesrcset="([^"]+)"/);
  if (preload) {
    const first = preload[1].split(',')[0].trim().split(/\s+/)[0];
    const size = sizeOf(first.slice(1));
    check(size !== null && size <= LCP_BUDGET_BYTES,
      '4. ' + label + ': LCP preload ' + first + ' is '
      + (size === null ? 'missing' : (size / 1024).toFixed(1) + 'KB')
      + ', budget <= ' + (LCP_BUDGET_BYTES / 1024) + 'KB');
  }

  /* 5. Every <picture> offers an AVIF source — otherwise the rewrite regressed. */
  for (const m of html.matchAll(/<picture>[\s\S]*?<\/picture>/g)) {
    check(m[0].includes('type="image/avif"'),
      '5. ' + label + ': a <picture> has no AVIF <source>');
    break; // one representative failure per page is enough
  }
}

if (failures.length) {
  console.error('image-budget checks FAILED:');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('OK: all image-budget checks passed (' + allPages.length + ' pages)');
```

- [ ] **Step 2: Run it — it must pass on the current tree**

```bash
node tools/image-budget-check.js
```

Expected: `OK: all image-budget checks passed (51 pages)`. If check 2 fails, some `<img>` outside the manifest still lacks dimensions — add them before continuing; that is exactly the CLS the spec set out to fix.

- [ ] **Step 3: Prove the checker actually catches a regression**

A checker that has never failed is not known to work.

```bash
cp assets/img/v3/resp/$(ls assets/img/v3/resp | grep '\.jpg$' | head -1) /tmp/keep.jpg
python3 -c "
from PIL import Image
import glob
p = sorted(glob.glob('assets/img/v3/resp/*-1920.jpg'))[0]
im = Image.open(p); im.save(p, 'JPEG', quality=100)
print('bloated', p)
"
node tools/image-budget-check.js; echo "exit=$?"
```

Expected: still passes (one file is not enough to break a 2 MB budget). Now force a real failure:

```bash
python3 -c "
import re
p = 'index.html'
s = open(p).read()
open(p + '.bak', 'w').write(s)
s = re.sub(r'srcset=\"/assets/img/v3/resp/', 'srcset=\"/assets/img/v3/resp/NOPE-', s, count=1)
open(p, 'w').write(s)
"
node tools/image-budget-check.js; echo "exit=$?"
mv index.html.bak index.html
git checkout -- assets/img/v3/resp
```

Expected: the seeded run exits **1** with a check-1 failure naming the missing file; after restoring, `node tools/image-budget-check.js` passes again.

- [ ] **Step 4: Wire it into vitest**

Create `tests/image-budget.test.mjs`:

```javascript
// tests/image-budget.test.mjs — runs the site-wide image budget checker as a
// child process so `npx vitest run` gates on it, same pattern as
// tests/projects-hub.test.mjs.
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
      throw new Error('checker failed:\n' + err.stdout + err.stderr);
    }
    expect(out).toContain('OK: all image-budget checks passed');
  });
});
```

- [ ] **Step 5: Run the full suite and commit**

```bash
npx vitest run
git add tools/image-budget-check.js tests/image-budget.test.mjs
git commit -m "test(images): gate per-page image budgets in CI

Asserts every srcset candidate resolves on disk, no <img> lacks width/height,
worst-case page image weight stays under 2MB, the preloaded LCP candidate
stays under 250KB (matching the projects-hub budget), and every <picture>
still offers AVIF.

Verified by seeding a broken srcset and confirming a non-zero exit.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Expected: 5 files, 85 tests passing.

---

> ## Phase 2 — ✅ COMPLETE (Tasks 4-8, `fbb1633`..`ec03505`)
>
> **Worst-case page image weight: 112.0 MB → 46.8 MB (58%). Homepage 3.43 → 1.63 MB. Median page 0.67 MB.**
>
> Below the spec's 85% headline. That benchmark downscaled 3840px stock photos to 1600px, so most of its saving was resolution rather than format; much of this library is already 840-1024px. 58% is the honest figure for the real mix.
>
> **The `sizes` attribute was wrong twice, and both versions would have shipped looking correct.** Reading the `<img>`'s own class marked every builder hero as a card (the builder puts the class on a parent div). Reading a fixed window of preceding characters then bled across siblings, so an Expertise card inherited "banner" from the previous card's *filename* — a 351px slot fetching a 1440px file. Resolved with `html.parser` tracking real ancestors, matching class attributes only, never filenames. 100vw slots fell 126 → exactly 51, one hero per page.
>
> **Two audit claims corrected.** 173 of 656 images (26%) already had builder `srcset` — the spec's "zero outside the projects hub" was wrong, it had only checked for `<source>`. And 500 of 656 images lack non-empty `alt`, not ~380.
>
> **Cost:** `assets/` grew 167 MB → 335 MB. Derivatives are repo and deploy weight; page weight is what halved. Heroes cap at 1920px, so 2x-DPI displays get a slightly softer hero than the builder's old 2880w variants — deliberate.
>
> Task 8's checker found a real gap on its first run: the header logo, twice per page, had no width/height. 102 images fixed.
>
> Four pages remain above 2 MB, all project galleries of 16-20 full-width lazy photographs; `kp3cns301` is worst at 3.53 MB.

# Phase 3 — Critical rendering path

Netlify already Brotli-compresses text, so the win here is parse cost and round trips, not transfer bytes. `main.css` is 358 KB raw but 37.8 KB gzipped — the 1,193 dead selectors still cost style-recalc on every page.

### Task 9: Subset `main.css`

**Files:**
- Create: `tools/css-subset.py`, `assets/css/main.subset.css`
- Modify: all 51 `index.html`

- [ ] **Step 1: Write the subsetter**

The trap: a class applied by JavaScript appears in no HTML. The keep-set must include JS string literals or the site breaks in ways no test catches.

Create `tools/css-subset.py`:

```python
#!/usr/bin/env python3
"""tools/css-subset.py — writes assets/css/main.subset.css containing only the
rules from main.css whose selectors are actually reachable.

Usage:  python3 tools/css-subset.py

main.css is Hostinger builder output: 358KB, 1254 class selectors, of which
only ~61 appear in any page. The rest cost style-recalc on every page load.

The keep-set is the union of:
  - every class in a class="..." attribute across all pages
  - every bareword string literal in assets/js/*.js, because classList.add()
    and friends apply classes that appear in no HTML

A rule is kept if ANY of its comma-separated selectors is reachable. Rules
with no class selector at all (element, :root, @font-face, keyframes) are
always kept — they are cheap and dropping them breaks resets.
"""
import os
import re

SKIP_DIRS = {'node_modules', '.git', '.claude', '.superpowers'}
CLASS_IN_HTML = re.compile(r'class="([^"]*)"')
STRING_IN_JS = re.compile(r'["\']([A-Za-z0-9_-]{3,})["\']')
CLASS_IN_SELECTOR = re.compile(r'\.([A-Za-z0-9_-]+)')


def repo_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def keep_set(root):
    used = set()
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            path = os.path.join(dirpath, name)
            if name.endswith('.html'):
                text = open(path, encoding='utf-8', errors='ignore').read()
                for group in CLASS_IN_HTML.findall(text):
                    used.update(group.split())
            elif name.endswith(('.js', '.mjs')) and 'assets/js' in path:
                text = open(path, encoding='utf-8', errors='ignore').read()
                used.update(STRING_IN_JS.findall(text))
    return used


def split_rules(css):
    """Yields (selector, body) for top-level rules; at-rules pass through whole."""
    out, depth, start = [], 0, 0
    for i, ch in enumerate(css):
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                out.append(css[start:i + 1])
                start = i + 1
    return out


def main():
    root = repo_root()
    used = keep_set(root)
    css = open(os.path.join(root, 'assets/css/main.css'),
               encoding='utf-8', errors='ignore').read()

    kept, dropped = [], 0
    for rule in split_rules(css):
        head = rule.split('{', 1)[0].strip()
        if head.startswith('@'):
            kept.append(rule)          # media/font-face/keyframes: keep whole
            continue
        classes = set()
        for selector in head.split(','):
            classes.update(CLASS_IN_SELECTOR.findall(selector))
        if not classes or classes & used:
            kept.append(rule)
        else:
            dropped += 1

    out = ''.join(kept)
    out_path = os.path.join(root, 'assets/css/main.subset.css')
    open(out_path, 'w', encoding='utf-8').write(out)
    print('kept %d rules, dropped %d' % (len(kept), dropped))
    print('%.1fKB -> %.1fKB' % (len(css) / 1024, len(out) / 1024))


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Generate and inspect**

```bash
python3 tools/css-subset.py
ls -la assets/css/main.css assets/css/main.subset.css
```

Expected: a substantial drop. Note the exact figure — if it drops *below* ~10 KB, the keep-set is too aggressive; investigate before repointing pages.

- [ ] **Step 3: Repoint every page**

The subset ships under a new filename, so returning visitors are not served a stale cached `main.css`.

```bash
python3 - <<'PY'
import os
skip = {'node_modules', '.git', '.claude', '.superpowers'}
changed = 0
for dirpath, dirnames, filenames in os.walk('.'):
    dirnames[:] = [d for d in dirnames if d not in skip]
    if 'index.html' not in filenames:
        continue
    p = os.path.join(dirpath, 'index.html')
    s = open(p, encoding='utf-8').read()
    if '/assets/css/main.css' not in s:
        continue
    s = s.replace('/assets/css/main.css', '/assets/css/main.subset.css')
    open(p, 'w', encoding='utf-8').write(s)
    changed += 1
print('repointed', changed, 'pages')
PY
```

Expected: `repointed 51 pages`.

- [ ] **Step 4: Verify visually — this is the highest-risk task in the plan**

A dropped selector shows up as a broken layout, not a failing test. Check **every page family**, not a sample: home, about, a business line, a project detail, projects hub, careers, credentials, contact, equipment, offices.

For each: screenshot at desktop and mobile, and confirm `read_console_messages` is clean. Compare against `git stash`-ed originals if anything looks off.

```bash
node tools/image-budget-check.js && npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add tools/css-subset.py assets/css/main.subset.css *.html */index.html
git commit -m "perf(css): subset main.css to the rules actually reachable

Hostinger builder output shipped 1254 class selectors; ~61 appear anywhere in
the site. The dead rules cost style-recalc on every page load.

Keep-set unions HTML class attributes with bareword string literals in
assets/js/*.js, so classes applied via classList.add() survive. At-rules and
selectors with no class component are always kept.

Ships as main.subset.css rather than editing main.css in place, so a returning
visitor's cached copy cannot go stale.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Prune font subsets and preload the critical faces

55 `@font-face` rules, none preloaded, including Devanagari, Cyrillic-ext and math subsets an English site never uses.

**Files:**
- Modify: `assets/css/fonts.css`, all 51 `index.html`
- Delete: unused files under `assets/fonts/`

- [ ] **Step 1: Establish which subsets are actually needed**

```bash
grep -o 'unicode-range:[^;]*' assets/css/fonts.css | sort | uniq -c
grep -o 'font-file_family_[A-Za-z_]*_wght_[0-9]*_subset_[a-z-]*' assets/css/fonts.css \
  | sed 's/.*subset_//' | sort | uniq -c
```

Then confirm no page contains non-Latin text:

```bash
python3 - <<'PY'
import os, re, unicodedata
skip = {'node_modules', '.git', '.claude', '.superpowers'}
blocks = {}
for dirpath, dirnames, filenames in os.walk('.'):
    dirnames[:] = [d for d in dirnames if d not in skip]
    if 'index.html' not in filenames:
        continue
    html = open(os.path.join(dirpath, 'index.html'), encoding='utf-8', errors='ignore').read()
    text = re.sub(r'<[^>]+>', ' ', html)
    for ch in text:
        if ord(ch) > 0x24F:  # beyond Latin Extended-B
            try:
                blocks.setdefault(unicodedata.name(ch).split()[0], set()).add(ch)
            except ValueError:
                pass
for name, chars in sorted(blocks.items()):
    print('%-18s %s' % (name, ''.join(sorted(chars))[:40]))
PY
```

Expected: only punctuation/symbols (EM DASH, MIDDLE DOT, etc.), no Devanagari/Cyrillic/CJK. **If any non-Latin script appears, keep that subset** — record which and why.

- [ ] **Step 2: Remove the unused `@font-face` blocks and their files**

Delete the `@font-face` rules for every subset the previous step proved unused, and the corresponding files under `assets/fonts/`. Keep every `latin` and `latin-ext` face, and keep `font-display: swap` on all survivors.

```bash
grep -c '@font-face' assets/css/fonts.css
du -sh assets/fonts
```

- [ ] **Step 3: Preload the above-the-fold faces**

Identify which families render in the header and hero, then add to each page's `<head>` (before the stylesheet links):

```html
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/<file>" crossorigin>
```

`crossorigin` is mandatory even same-origin — without it the browser fetches the font twice.

- [ ] **Step 4: Verify no glyph regressed**

Screenshot home, about, a project page and careers at desktop and mobile. Confirm via `read_network_requests` that **no font 404s** appear and that the preloaded files are actually used (no console preload warning).

```bash
npx vitest run && node tools/image-budget-check.js
```

- [ ] **Step 5: Commit**

```bash
git add assets/css/fonts.css assets/fonts *.html */index.html
git commit -m "perf(fonts): drop unused subsets, preload the above-the-fold faces

The site's text is Latin-only (verified by scanning every page for codepoints
above Latin Extended-B), so the Devanagari, Cyrillic and math subsets were
dead weight. Survivors keep font-display: swap.

Preload carries crossorigin — without it the browser fetches each font twice.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: Cache policy and stale docs

**Files:** Modify: `netlify.toml`, `README.md`

- [ ] **Step 1: Give fonts an immutable year**

`assets/fonts/*` currently has no header rule at all. Add to `netlify.toml`:

```toml
# Fonts are content-stable: the subset files are only ever ADDED under new
# names, never edited in place, so a year is safe.
[[headers]]
  for = "/assets/fonts/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

Leave the existing `X-Robots-Tag: noindex` block **exactly as is** — it is deliberate and shields the preview until domain handover.

- [ ] **Step 2: Correct README.md**

It currently documents a Hostinger upload flow and a ~758 MB footprint, both wrong. Update:
- Deployment: Netlify, `publish = "."`, no build step; `.htaccess` retained only as an Apache fallback.
- Size: the post-Phase-1/2 figure from `du -sh .`.
- Page count: 51, not 63.
- Add a **Launch checklist** section: at domain handover, remove the `X-Robots-Tag: noindex` block from `netlify.toml`, and verify the absolute `ugcc.com` canonical/OG URLs already in the pages.
- Add a **Build tooling** section listing the `tools/` scripts from Phases 2–3 and when to re-run them.

- [ ] **Step 3: Verify and commit**

```bash
npx vitest run
git add netlify.toml README.md
git commit -m "docs+chore: correct the README's deploy story, cache the fonts

README documented a Hostinger upload and a ~758MB footprint; the site deploys
on Netlify and is far smaller after the image pass. Adds a launch checklist
naming the noindex header as the switch to flip at domain handover, and
documents the tools/ build scripts.

Fonts get the immutable year they were missing.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

> ## Phase 3 — ✅ COMPLETE (Tasks 9-11, `6b99328`..`9fa1108`)
>
> | | Before | After |
> | --- | --- | --- |
> | `main.css` | 350.3 KB raw / 36.9 KB gz | **139.2 KB / 9.5 KB** |
> | Fonts on first paint | 59.9 KB, 5 files | **38.6 KB, 3 files** |
> | `fonts.css` | 28.6 KB, 55 `@font-face` | 6.9 KB, 16 |
>
> **Task 9 was the plan's highest-risk step and came through clean**, because it was verified empirically rather than by reasoning. Computed styles for 31 properties on every element were captured under `main.css`, the stylesheet hot-swapped to the subset, and captured again: **12 pages at 1280px and 6 at 390px, 3,669+ elements, zero differences.** Interactive states were A/B'd the same way, including a real burger click. The two apparent diffs on the first run were marquee tracks mid-animation, so `transform` was excluded from the comparison.
>
> The keep-set unioning JS string literals was not optional: `burger--open`, `dot--current`, `loaded` and `video__frame` appear in no `class` attribute. A markup-only keep-set would have deleted every interactive state's styling, and nothing would have failed until a user clicked something.
>
> **Task 10's premise in the spec was wrong.** All 55 `@font-face` rules already carried `unicode-range`, so browsers never downloaded the Devanagari/Hebrew/Greek/Cyrillic subsets — pruning them saves repo weight, not bandwidth. The real win was elsewhere: Chrome was fetching Open Sans 600 in the **math and symbols** subsets, 21.3 KB, despite no codepoint on any page falling in either range. Removing those took 5 files to 3.
>
> **Task 11** corrected a README that documented a Hostinger upload, a 758 MB footprint and 63 pages — all three wrong — and added the launch checklist for the deliberate `noindex`.

# Phase 4 — Video

`ffmpeg` is absent, so re-encoding the 26.7 MB of MP4 is out of scope. What is achievable is stopping them competing with the LCP.

### Task 12: Poster frames and deferred video loading

**Files:** Modify: pages containing `<video>` (`index.html`, `about-contractor-kuwait/index.html`, and any other match)

- [ ] **Step 1: Find every video element**

```bash
grep -l '<video' *.html */index.html
grep -o '<video[^>]*>' *.html */index.html
```

- [ ] **Step 2: Add `preload="none"` and a poster to each**

For every `<video>`: add `preload="none"` (so the file is not fetched until play) and `poster="/assets/img/v3/resp/<stem>-1440.jpg"` pointing at an existing derivative that matches the video's opening frame in subject. Do **not** extract a frame — that needs ffmpeg.

If a video is `autoplay` for a background band, keep `autoplay muted loop playsinline` but still add the poster, so something renders during the fetch.

- [ ] **Step 3: Verify the payload actually deferred**

Load `/` and `/about-contractor-kuwait/` in the preview. In `read_network_requests`, confirm the `.mp4` files are **not** requested during initial load (or are requested only after the poster paints). The About page should drop ~17.1 MB from its initial load.

```bash
npx vitest run && node tools/image-budget-check.js
```

- [ ] **Step 4: Commit**

```bash
git add *.html */index.html
git commit -m "perf(video): poster frames and preload=none

26.7MB of MP4 was competing with the LCP on the homepage and About page.
preload=none defers the fetch; the poster gives the slot something to paint.

Re-encoding is deferred — it needs ffmpeg, which is not installed here.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Phase 5 — SEO basics

The metadata layer is already sound: all 51 pages carry title, description, canonical, OG, Twitter card, JSON-LD, one `h1`, `lang`; no duplicate titles or descriptions; the sitemap covers all 51 URLs with `lastmod` and `priority`. Only mechanical gaps remain.

### Task 13: Alt text for the ~380 images missing it

**Files:** Modify: all 51 `index.html`; Create: `tests/alt-text.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tests/alt-text.test.mjs`:

```javascript
// tests/alt-text.test.mjs — every content image must carry non-empty alt.
// Decorative images are exempt but must say so explicitly with
// alt="" aria-hidden="true", so the distinction is a deliberate choice
// rather than an oversight.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', '.git', '.claude', '.superpowers',
  'assets', 'tools', 'tests', 'docs', 'netlify']);

const pages = [join(repo, 'index.html')];
for (const entry of readdirSync(repo, { withFileTypes: true })) {
  if (!entry.isDirectory() || SKIP.has(entry.name) || entry.name.startsWith('.')) continue;
  const candidate = join(repo, entry.name, 'index.html');
  if (existsSync(candidate)) pages.push(candidate);
}

describe('image alt text', () => {
  it.each(pages.map((p) => [p.replace(repo + '/', ''), p]))(
    '%s has alt text on every content image', (_label, page) => {
      const html = readFileSync(page, 'utf8');
      const bad = (html.match(/<img\b[^>]*>/g) || []).filter((tag) => {
        if (/\balt="[^"]+"/.test(tag)) return false;              // has alt
        if (/\balt=""/.test(tag) && /aria-hidden="true"/.test(tag)) return false; // decorative
        return true;
      });
      expect(bad.map((t) => t.slice(0, 120))).toEqual([]);
    });
});
```

- [ ] **Step 2: Run it to see the scale of the gap**

```bash
npx vitest run tests/alt-text.test.mjs 2>&1 | tail -40
```

Expected: many failures, worst on `construction-projects-kuwait` (34 of 36).

- [ ] **Step 3: Write the alt text**

Work page by page. Derive each description from facts already on the page — project name, business line, the nearest heading, the caption. Rules:
- Describe what the image shows: `alt="Aerial view of the RA-259 road interchange under construction"`.
- No marketing language, no claims not already on the page. The content freeze covers visible copy; alt must stay factual.
- Genuinely decorative images (background textures, spacer graphics, an icon beside a text label that already says the same thing) get `alt="" aria-hidden="true"`.
- Never start with "Image of" or "Photo of".
- Keep under ~125 characters.

- [ ] **Step 4: Verify**

```bash
npx vitest run
```

Expected: all suites green.

- [ ] **Step 5: Commit**

```bash
git add *.html */index.html tests/alt-text.test.mjs
git commit -m "a11y+seo: alt text for every content image

~380 images carried empty or missing alt, worst on the projects hub (34 of
36). Descriptions derive strictly from on-page facts — project name, business
line, nearest heading — with no marketing language, so the content freeze
holds. Genuinely decorative images are marked alt=\"\" aria-hidden=\"true\" so
the distinction is deliberate.

Test enforces it per page.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 14: Trim over-length meta descriptions and fill image:alt

**Files:** Modify: the 6 pages with long descriptions, plus all 51 for `image:alt`

- [ ] **Step 1: List the offenders**

```bash
python3 - <<'PY'
import os, re
skip = {'node_modules', '.git', '.claude', '.superpowers'}
for dirpath, dirnames, filenames in os.walk('.'):
    dirnames[:] = [d for d in dirnames if d not in skip]
    if 'index.html' not in filenames:
        continue
    p = os.path.join(dirpath, 'index.html')
    html = open(p, encoding='utf-8', errors='ignore').read()
    m = re.search(r'<meta[^>]*name="description"[^>]*content="([^"]*)"', html)
    if m and len(m.group(1)) > 165:
        print('%3d  %s\n     %s\n' % (len(m.group(1)), p, m.group(1)))
PY
```

Expected: 6 pages, 166–176 characters.

- [ ] **Step 2: Trim each to ≤ 160 characters**

Shorten by cutting redundancy, not by truncating mid-sentence. Keep the primary keyword in the first 100 characters. The description must remain a complete, readable sentence.

- [ ] **Step 3: Fill the empty image:alt tags**

`og:image:alt` and `twitter:image:alt` are present but empty on all 51 pages. Set each to a short description of that page's OG image — reuse the alt text written in Task 13 for the same file where one exists.

- [ ] **Step 4: Verify no description regressed**

Re-run the Step 1 script — expected: no output. Then confirm none went too short:

```bash
python3 - <<'PY'
import os, re
skip = {'node_modules', '.git', '.claude', '.superpowers'}
short = []
for dirpath, dirnames, filenames in os.walk('.'):
    dirnames[:] = [d for d in dirnames if d not in skip]
    if 'index.html' not in filenames:
        continue
    p = os.path.join(dirpath, 'index.html')
    html = open(p, encoding='utf-8', errors='ignore').read()
    m = re.search(r'<meta[^>]*name="description"[^>]*content="([^"]*)"', html)
    if m and len(m.group(1)) < 70:
        short.append((len(m.group(1)), p))
    a = re.findall(r'(?:og|twitter):image:alt"[^>]*content=""', html)
    a += re.findall(r'content=""[^>]*(?:og|twitter):image:alt', html)
    if a:
        print('EMPTY image:alt remains in', p)
for n, p in short:
    print('TOO SHORT %d %s' % (n, p))
print('done')
PY
npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add *.html */index.html
git commit -m "seo: trim long meta descriptions, fill og/twitter image:alt

Six descriptions ran 166-176 chars and would truncate in results; trimmed to
<=160 by cutting redundancy, keeping the primary keyword in the first 100.

og:image:alt and twitter:image:alt were present but empty site-wide; filled
from the alt text written for the same images.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

> ## Phases 4 & 5 — ✅ COMPLETE (`dccc07b`, `fa01995`)
>
> **Phase 4 — video.** All three background videos now carry `data-src` + `preload="none"`, loaded after `window.load` and only within two screen heights. The About page starts at **0 bytes of video instead of 17.1 MB**; its far video (3,994px down) never loads unless the visitor scrolls there.
>
> Proximity uses `getBoundingClientRect` on a **capture-phase document** scroll listener, not IntersectionObserver — IO does not fire at all in this pane, and the page scrolls inside a container so a window-only listener never hears it. A 1s interval backs both up. `play()` retries on `canplay`, `loadeddata` and first interaction, because autoplay does not re-trigger for a src assigned after parse.
>
> **Unverified, needs a real-browser check:** this pane enforces a stricter autoplay policy than Chrome/Safari and preserves media state across navigations, so unattended autoplay could not be confirmed. If it were ever blocked the poster still renders — the homepage hero is visually unchanged because the LCP image carries that composition.
>
> **Phase 5 — SEO.** Descriptive alt 156 → 224 of 656; the other 432 now say `alt=""` explicitly. **No image lacks the attribute.**
>
> The spec framed this as "write alt for ~380 images". That was the wrong target. The right split was: **name the client logos** (39 instances, using the site's own names, not invented expansions), **describe each page's cover** (29, written from viewing each image — deriving them from the h1 would have produced 29 restatements of the contract name), and **deliberately leave 432 gallery images empty**, which is what WCAG requires when surrounding text already describes them. Generating filler for those would degrade screen-reader output, not improve it.
>
> Six meta descriptions trimmed 166-176 → 133-150 chars; `og:image:alt`/`twitter:image:alt` filled on all 51 pages, 29 describing the cover image rather than repeating the title.

# Phase 6 — Guardrails

### Task 15: Add `package.json` and make CI run the tests

CI currently only writes a push summary. Nothing enforces the suite — which is exactly how the v2→v3 rename shipped 22 failing tests unnoticed (Task 0). The toolchain also depends on the npx cache.

**Files:** Create: `package.json`, `.github/workflows/test.yml`; Modify: `vitest.config.mjs`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "ugcc-website",
  "private": true,
  "version": "1.0.0",
  "description": "UGCC static site — no build step; scripts are checkers and image tooling.",
  "scripts": {
    "test": "vitest run",
    "check:images": "node tools/image-budget-check.js",
    "build:images": "python3 tools/responsive-manifest.py && python3 tools/make-responsive-images.py",
    "check:orphans": "python3 tools/find-orphan-assets.py"
  },
  "devDependencies": {
    "vitest": "4.1.10"
  }
}
```

- [ ] **Step 2: Correct the stale comment in `vitest.config.mjs`**

Its header says the repo has no `package.json` and that vitest runs from the npx cache. That is about to stop being true. Update the comment to say vitest is a pinned devDependency, and **keep** the root-anchored `include` and the `.claude` exclude — those still matter, since worktrees would otherwise pull in other sessions' suites.

- [ ] **Step 3: Verify locally**

```bash
npm install
npm test
```

Expected: same suites as `npx vitest run`, all passing. Confirm `node_modules/` and `package-lock.json` are already gitignored (they are).

- [ ] **Step 4: Add the CI workflow**

Create `.github/workflows/test.yml`:

```yaml
name: Tests

# Runs the checker suites on every push. The existing push-log workflow only
# writes a summary; this is what actually gates.

on:
  push:
  pull_request:

permissions:
  contents: read

jobs:
  test:
    name: vitest
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install
        run: npm ci || npm install

      - name: Run tests
        run: npm test
```

- [ ] **Step 5: Commit and confirm CI is green**

```bash
git add package.json .github/workflows/test.yml vitest.config.mjs
git commit -m "ci: actually run the test suite on push

The push-log workflow only wrote a summary — nothing enforced the checkers.
Adds package.json pinning vitest 4.1.10 so npm test works without relying on
the npx cache, and a workflow that runs it.

vitest.config.mjs's comment about there being no package.json is now stale and
corrected; its root-anchored include stays, since that is what keeps worktree
suites out of a run.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"

git push origin V2
gh run list --branch V2 --limit 3
```

Expected: the Tests workflow appears and completes green. **If it fails, fix before considering the plan done** — a red CI that nobody fixes is worse than none.

---

### Task 16: Measure the result — ✅ DONE (`9fc257b`)

> Results written to [`2026-07-21-performance-results.md`](2026-07-21-performance-results.md).
>
> **Homepage first view: 10,100 KB → 143 KB.** Excluding video, 771 → 143 KB. LCP image 617 KB → 38 KB.
>
> **Writing it exposed a live bug.** Verifying the claim "0 unreferenced images" turned up 277 — 248 of them the SOURCE images named by `tools/responsive-manifest.tsv`, which the scanner did not read. `--delete` would have destroyed every input the AVIF pipeline builds from. The same gap had already cost 23 projects-hub sources in Task 3 (site unaffected, but the hub could not be rebuilt); all restored from history. Scanner now reads `.tsv`.
>
> **All six phases complete.** Remaining open items are external: the autoplay spot-check on the Netlify preview, GitHub's default branch still pointing at `master`, and the deliberate `noindex` until domain handover.

### Task 16 (original steps)

The plan claims an 85% reduction. Verify it rather than asserting it.

**Files:** Create: `docs/superpowers/plans/2026-07-21-performance-results.md`

- [ ] **Step 1: Measure the end state**

```bash
python3 - <<'PY'
import os, re
skip = {'node_modules', '.git', '.claude', '.superpowers'}
pat = re.compile(r'assets/((?:img|video)/[A-Za-z0-9._\-/]+)')
rows = []
for dirpath, dirnames, filenames in os.walk('.'):
    dirnames[:] = [d for d in dirnames if d not in skip]
    if 'index.html' not in filenames:
        continue
    p = os.path.join(dirpath, 'index.html')
    html = open(p, encoding='utf-8', errors='ignore').read()
    worst = 0
    for block in re.findall(r'<picture>.*?</picture>', html, re.S):
        cands = re.findall(r'(/assets/img/v3/resp/[^"\s]+\.avif)\s+(\d+)w', block)
        if cands:
            biggest = max(cands, key=lambda c: int(c[1]))[0].lstrip('/')
            if os.path.exists(biggest):
                worst += os.path.getsize(biggest)
    rows.append((worst, os.path.getsize(p), p))
rows.sort(reverse=True)
print('%10s %8s  page' % ('AVIF', 'HTML'))
for w, h, p in rows[:12]:
    print('%9.2fMB %7.0fK  %s' % (w / 1e6, h / 1024, p))
print('\ntotal worst-case AVIF across all pages: %.1f MB' % (sum(r[0] for r in rows) / 1e6))
PY
du -sh . assets/
```

- [ ] **Step 2: Record before/after**

Write `docs/superpowers/plans/2026-07-21-performance-results.md` with a table comparing the spec's baseline against the measured end state: per-page worst-case image weight (homepage was 12.6 MB), total referenced media (169.6 MB), repo footprint (~453 MB in `assets/`), CSS raw bytes (476 KB across 11 files), `@font-face` count (55), images missing dimensions (104 of 656), images missing alt (~380).

Note honestly anything that fell short of target, and list the deferred work: video re-encoding (needs ffmpeg) and the full keyword/content SEO pass.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-07-21-performance-results.md
git commit -m "docs(perf): record measured before/after for the optimization pass

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-review notes

**Spec coverage:** Phase 1 → Tasks 1–3. Phase 2 → Tasks 4–8. Phase 3 → Tasks 9–11. Phase 4 → Task 12. Phase 5 → Tasks 13–14. Phase 6 → Tasks 15–16. The spec's README correction lands in Task 11; the launch checklist for the deliberate `noindex` lands in Task 11 Step 2.

**Deviation from the spec, deliberate:** the spec said AVIF **and** WebP. This plan emits AVIF + JPEG only, matching the pattern the projects hub already ships. AVIF is Baseline-supported and JPEG covers every remaining browser, so WebP would double the derivative count with no reachable audience. If a WebP tier is later wanted, `make-responsive-images.py` takes one extra entry in its `targets` list.

**Known risk concentration:** Task 9 (CSS subset) is the highest-risk step — a dropped selector breaks layout silently and no automated test catches it. Its Step 4 verification is deliberately exhaustive rather than sampled. If it proves unstable, it can be reverted independently without touching Phase 2, which holds the bulk of the gains.

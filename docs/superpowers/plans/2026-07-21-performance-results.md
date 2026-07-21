# Performance and SEO pass — measured results

Date: 2026-07-21
Baseline: `89b06a6` (the v2→v3 rename, immediately before this work)
Final: `98bb2f6`
Branch: `V3`

Every figure below was measured, not estimated: byte sizes from files on disk,
font and video behaviour from a real browser session, page weights by
re-rendering each page's markup at both commits.

## Headline

**A first visit to the homepage went from 10,100 KB to 143 KB — a 99% cut.**

Most of that is the hero video no longer competing with the page. Excluding
video entirely, the same first view still fell **771 KB → 143 KB (81%)**.

| Homepage, first view | Before | After |
| --- | ---: | ---: |
| HTML (gzipped) | 26.0 KB | 26.4 KB |
| CSS (gzipped) | 70.0 KB | 41.2 KB |
| Fonts (measured in-browser) | 58.5 KB | 37.7 KB |
| LCP image | 616.7 KB | **37.9 KB** |
| Hero video | 9,328.9 KB | **0 KB** (deferred) |
| **Total** | **10,100 KB** | **143 KB** |

The LCP image alone — the single largest lever on perceived load — dropped
94%, from a 617 KB JPEG to a 38 KB AVIF at the same rendered size.

## Page weight across the site

Worst case per page: the widest candidate of every image, i.e. what a desktop
viewport fetches with everything scrolled into view.

| | Before | After | |
| --- | ---: | ---: | ---: |
| All 51 pages | 112.0 MB | 46.8 MB | −58% |
| Homepage | 3.43 MB | 1.63 MB | −53% |
| Median page | 1.66 MB | 0.67 MB | −60% |
| Heaviest page | 10.09 MB | 3.53 MB | −65% |
| Pages over 2 MB | 22 | **4** | |

Biggest individual wins:

| Page | Before | After | |
| --- | ---: | ---: | ---: |
| `ra-259` | 10.09 MB | 1.66 MB | −84% |
| `ra-223` | 5.16 MB | 2.13 MB | −59% |
| `mew6085` | 5.06 MB | 2.57 MB | −49% |
| `pai18pa` | 4.44 MB | 1.86 MB | −58% |
| `ra200` | 4.26 MB | 1.78 MB | −58% |
| `kp3cns301` | 5.94 MB | 3.53 MB | −41% |

The four pages still above 2 MB are project galleries carrying 16–20
full-width photographs. Their images are lazy-loaded, so initial load is far
below these worst-case figures.

## Critical rendering path

| | Before | After |
| --- | ---: | ---: |
| `main.css` → `main.subset.css` | 350.4 KB raw / 36.9 KB gz | **139.2 KB / 9.5 KB** |
| `fonts.css` | 28.6 KB, 55 `@font-face` | **6.9 KB, 16** |
| Font files on disk | 55 | 16 |
| Fonts fetched on first paint | 59.9 KB, 5 files | **38.6 KB, 3 files** |
| Image preloads | 1 page | **51 pages** |
| Font preloads | 0 | 153 (3 per page) |

## Markup and accessibility

| | Before | After |
| --- | ---: | ---: |
| `<picture>` blocks | 32 | **357** |
| AVIF sources | 33 | 408 |
| `<img>` missing `width`/`height` | 104 | **0** |
| Images with descriptive `alt` | 156 | **224** |
| Images with explicit `alt=""` | 500 (202 valueless) | 432 |
| Images with **no** `alt` attribute | 0 | **0** |
| Meta descriptions over 165 chars | 6 | **0** |
| Pages with empty `og:image:alt` | 38 | **0** |

## Engineering health

| | Before | After |
| --- | ---: | ---: |
| Test suite | **22 failing**, 60 passing | **93 passing** |
| CI enforcement | none (push log only) | `npm ci && npm test` on every push |
| Checker suites | 3 | 5 |
| Unreferenced images in git | 2,621 files, 297 MB | 29 files, 13.8 MB |
| `assets/` on disk | 453 MB | 337 MB |
| Branches | 10 local, 6 remote | 4 local, 3 remote |
| Stale worktrees | 4 | 0 (2 remain, both in active use) |

The 29 remaining unreferenced files are builder `srcset` variants superseded by
the `<picture>` rewrite plus regenerable rail derivatives. They are left in
place deliberately: 13.8 MB is not worth a third round of deletion risk after
what the scanner turned up twice (below).

## What this cost

Honest accounting of what got worse:

- **`assets/` grew by 169 MB of derivatives** (1,550 files under
  `assets/img/v3/resp/`). Net footprint still fell because the
  orphan removal was larger (453 → 337 MB), but the deploy carries more files than it would
  have without the pipeline.
- **HTML grew 2.02 → 2.27 MB raw (447 → 471 KB gzipped, +5%)**. That is the
  `<picture>` markup — four AVIF candidates plus four JPEG fallbacks per
  image. It buys a far larger image saving, but it is not free.
- **Heroes cap at 1920px.** The builder previously offered 2880w variants, so
  a 2× DPI display now gets a slightly softer hero. Deliberate: a 2880px AVIF
  would undo much of the saving.

## Deferred, with reasons

- **Video re-encoding.** `ffmpeg` is not installed. The 26.7 MB of MP4 is now
  deferred off the critical path but not re-encoded; doing so would cut it
  further.
- **Autoplay verification.** The preview pane enforces a stricter autoplay
  policy than Chrome or Safari and preserves media state across navigations,
  so unattended autoplay of the deferred videos could not be confirmed here.
  The mechanism is sound and the poster renders either way, but this wants a
  glance on the Netlify preview.
- **Gallery alt text.** 432 images keep `alt=""` deliberately — WCAG is
  explicit that an image adding nothing beyond adjacent text should be empty,
  and generating "RA-259 project photograph 3" sixteen times per page would
  make screen-reader output worse.
- **Keyword and content SEO.** Out of scope by agreement; this pass closed
  mechanical gaps only.
- **GitHub default branch** still points at `master`, which is a different
  line of work (`master-july2026-changes`). Repo-settings change, not a code
  one.
- **The site-wide `noindex`** stays until domain handover. It is what shields
  the preview, and nothing will rank until it is removed — see the launch
  checklist in `README.md`.

## Where the spec was wrong

Recorded because the corrections were more useful than the original targets:

1. **"85% image saving"** → the real figure is 58%. That benchmark downscaled
   3840px stock photos to 1600px, so most of its gain was resolution, not
   format. Much of this library is already 840–1024px.
2. **"Zero `srcset` outside the projects hub"** → 173 of 656 images (26%)
   already had builder-generated `srcset`. The original audit only checked for
   `<source>` tags.
3. **"Prune font subsets to save bandwidth"** → all 55 `@font-face` rules
   already carried `unicode-range`, so unused subsets were never downloaded.
   The real waste was Open Sans 600 in the `math` and `symbols` subsets —
   21.3 KB fetched for codepoints that appear nowhere on the site.
4. **"The About page renders a blank Construction column"** → it does not. That
   described a panned-crop layout V3 no longer uses.
5. **"Write alt for ~380 images"** → the count was 500, and mass-filling them
   would have been the wrong action for 432 of them.
6. **The orphan scanner as specified** would have deleted build sources that
   no browser ever loads. This bit twice, and the second time it had already
   landed:
   - Scanning only HTML/CSS/JS put **7 sources (2.4 MB)** named by
     `tools/make-*.sh` in scope. Caught before deleting; fixed by scanning
     `.sh`/`.py`.
   - Even then, **248 sources (82 MB)** named by
     `tools/responsive-manifest.tsv` were still deletable — `npm run
     build:images` could never have been re-run. Found while verifying the
     numbers for this document, fixed by scanning `.tsv`.
   - That same gap had already cost something: Task 3 deleted **23 sources**
     named by `tools/projects-hub-manifest.tsv`. The site was unaffected (the
     cards themselves survived) but the hub could not be rebuilt. All 23 were
     restored from history.

   The general lesson: *unreferenced by the browser* is not *safe to delete*.
   Anything that records a build input — shell scripts, Python, TSV manifests
   — has to be part of the reference scan.

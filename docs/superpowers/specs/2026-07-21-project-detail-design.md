# Project detail page — design spec (layout B, "facts-first dossier")

Date: 2026-07-21 · Branch: `project-detail` (worktree off V2) · Status: approved by Danijel (mockup B / B2)

Rebuild all 30 project detail pages (`/<slug>/index.html`) on the about-suite kit using
the "facts-first dossier" layout validated by `mockups/project-b/` (RA-171, photo-poor)
and `mockups/project-b2/` (RA-259, photo-rich). Reference implementations: treat
`mockups/project-b2/index.html` as the golden example; this spec is the contract.

## Hard constraints

1. **Content freeze (customer requirement).** Every visible text string on the new page
   must be byte-identical to a string on the original page. No rewriting, retitling,
   trimming, or new copy. The only permitted new chrome strings are the section labels
   `All Projects`, `Current`, `Completed`, `Gallery`, and (where a video exists) `Video`.
   The `<h1>` title must be byte-identical to the original (the projects-hub branch has a
   checker asserting each hub card title is a substring of its detail page).
2. **No existing content may vanish.** Photos: every distinct photographic frame on the
   original appears exactly once (frame = original filename after the first hash segment;
   builder exports the same frame under many hashes/sizes — use the largest real file,
   verified with `sips -g pixelWidth -g pixelHeight`; declared srcset widths lie).
   Video embeds are carried over (video slot). Owner-logo strips are carried over
   (`.pjd-owners`). Similar Projects links keep their original hrefs, thumbs, and captions
   — all of them, even if more than two.
3. **Shared-file discipline (concurrent session).** Do not edit `about-suite.css`,
   `v2.css`, `netlify.toml`, any `assets/js/*`, or anything under `assets/img/`. The only
   shared file this redesign adds is `assets/css/pages/project.css` (already committed).
4. **Head/SEO preservation.** Keep from the ORIGINAL page verbatim: `<title>`, meta
   description, keywords, canonical, all OG/Twitter tags, favicons, and the JSON-LD
   block. Replace only the stylesheet links (kit set below) and drop builder-only
   inline style/token blocks that the kit supersedes.

## Page contract

Head, in order: `/assets/css/fonts.css`, `main.css`, `custom.css`, `v2.css?v=4`,
`about-suite.css?v=7`, `pages/project.css?v=1`. Scripts (deferred, end of body):
`chat-widget.js?v=2`, `main.js`, `v2.js?v=3`, `about-suite.js?v=3`.

Body, in order (kit vocabulary per `docs/superpowers/specs/2026-07-20-about-suite-kit.md`):

1. **Builder header** `block-header` — verbatim from `contact-us/index.html`, active nav
   item = Projects (desktop and mobile subtrees).
2. **Cover** `.as-cover` (byte-copied pattern, `data-v-3ffce944`): contract number as
   `.as-cover__eyebrow`, original `<h1>` verbatim, best hero frame (prefer the original
   page's own hero frame), real intrinsic dimensions, `fetchpriority="high"`.
3. **Sub-nav** `v2-subnav`: All Projects → `/construction-projects-kuwait`, Current →
   `/all-project-current`, Completed → `/all-projects-completed`; mark the project's own
   status bucket `is-active` + `aria-current="page"`.
4. **Navy facts band** `.as-section--navy.pjd-facts`: `.as-stats` with up to 4 headline
   figures (Project Value first; figures are unsplit source strings, or prefix/suffix
   splits where a source line reads naturally as figure + label — any split line must
   also appear complete verbatim elsewhere on the page, normally in the details
   accordion). Below the stats, `.as-ledger` rows: Project Owner, Contractor,
   Consultant (if present), Project Schedule (dates verbatim). Em-dash placeholder in
   the year slot per kit precedent.
5. **Project Scope** light `.as-section`, narrow inner: `.as-head` "Project Scope"
   (original heading string) + `.as-prose` original paragraph(s) + `.as-pills` with the
   original business-line category tags.
6. **Photo band** `figure.as-band` (direct child of page body): one strong wide frame.
7. **Project Details** tint `.as-section` (only if the original has the block — 28/30):
   original bullet groups as zero-JS `<details class="as-acc">` accordion, first group
   open, strings verbatim. 1–2 groups may be plain `.as-prose` lists instead if an
   accordion would look sparse.
8. **Video** light `.as-section`, `.pjd-video` (only if the original embeds one):
   original iframe/embed carried over.
9. **Gallery** light `.as-section` (only if unused distinct frames remain): `.as-head`
   "Gallery" + `<ul class="as-cards as-cards--3">` image-only tiles, all remaining
   frames, `loading="lazy" decoding="async"`, real intrinsic dimensions.
10. **Owner logos** (only if the original has a logo strip): `.pjd-owners` inside the
    preceding light section (or its own light section), original heading string + logo
    images carried over.
11. **Similar Projects** navy `.as-section`: `.as-head` "Similar Projects" (original
    string) + `as-cards--2` linked tiles (`.pjd-tile-link`), all original links with
    their thumbs and caption strings.
12. **Builder footer** — verbatim, untouched.

Rhythm rules: max 2 navy sections (the facts band + Similar Projects), never adjacent —
sections 5–10 between them guarantee this. Exactly one `<h1>`. No `<hr>`, no inline
styles on kit markup, page renders fully with JS off. Only breakpoint: 920px.

## Per-page variance

Optional fields simply omit their row/section (Consultant 16/30, Year 13/30, Details
28/30, video and logos rare). `mer-r-419` and `mew5773` have no Details block — facts +
scope + photos only. Photo-poor pages (e.g. ra-171) drop the Gallery when no unused
frames remain; never duplicate a frame to fill it.

## Verification (per page, before completion)

- `<h1>` byte-identical to original; exactly one.
- Every visible original text string present verbatim on the new page.
- Every referenced asset path exists on disk; no frame used twice; no original frame lost.
- Head CSS order and script set exactly as specified; original SEO meta preserved.
- Tag balance clean; navy count ≤ 2, non-adjacent.

Images are reused as-is from `/assets/img/` (largest real file per frame). Optimized
derivatives are a later phase, coordinated with the projects-hub branch's naming
(`assets/img/v2/proj/…`) to avoid collisions.

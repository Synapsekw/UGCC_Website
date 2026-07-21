#!/usr/bin/env node
/* tools/projects-hub-check.js — frozen-content + perf-contract checks for
   the redesigned projects hub. Node, zero dependencies.
   Usage: node tools/projects-hub-check.js

   Reads: construction-projects-kuwait/index.html (the page under test),
          tools/projects-hub-manifest.tsv, the 30 project detail pages
          (<slug>/index.html), and the AVIF derivatives on disk. Git
          history is NOT consulted — files on disk only.

   Plain string/regex parsing is the house style for these checkers (see
   tools/projects-check.js and tools/business-lines-check.js) — no DOM, no
   deps. The production page HTML is minified onto very long lines, so
   every extraction below is regex- or split-based rather than line-based.

   Exit 0 + "OK: all projects-hub checks passed" on success.
   Exit 1 + a bulleted failure list on any failure. */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

const PAGE_PATH = 'construction-projects-kuwait/index.html';
const page = read(PAGE_PATH);

const failures = [];
let checkNo = 0;
function check(ok, msg) {
  checkNo++;
  if (!ok) failures.push(msg);
}

/* ---------------------------------------------------------------------
   Manifest
   --------------------------------------------------------------------- */
const manifestRaw = read('tools/projects-hub-manifest.tsv').replace(/\r\n/g, '\n').trim();
const manifestLines = manifestRaw.split('\n').filter(Boolean);
const manifest = manifestLines.map((line) => {
  const [slug, status, lines, src] = line.split('\t');
  return { slug, status, lines: (lines || '').split(' ').filter(Boolean), src };
});
const manifestBySlug = new Map(manifest.map((m) => [m.slug, m]));

/* 1. Manifest shape: 30 rows, 14 current / 16 completed. */
{
  const nCurrent = manifest.filter((m) => m.status === 'current').length;
  const nCompleted = manifest.filter((m) => m.status === 'completed').length;
  check(manifest.length === 30,
    '1. manifest has ' + manifest.length + ' rows, want 30');
  check(nCurrent === 14,
    '1. manifest has ' + nCurrent + ' current rows, want 14');
  check(nCompleted === 16,
    '1. manifest has ' + nCompleted + ' completed rows, want 16');
}

/* ---------------------------------------------------------------------
   Locate the card grid <ul> and split it into per-card fragments.
   Cards are <li class="as-card ...">...</li>; the kit uses "as-card" only
   for grid tiles, so scoping to that class also scopes to "the grid".
   --------------------------------------------------------------------- */
const gridMatch = page.match(/<ul[^>]*class="[^"]*as-cards[^"]*"[^>]*>([\s\S]*?)<\/ul>/);
const gridHtml = gridMatch ? gridMatch[1] : '';
check(!!gridMatch, '2. no <ul class="as-cards..."> grid found on the page');

function extractCards(html) {
  if (!html) return [];
  const pieces = html.split(/(?=<li class="as-card\b)/).filter((p) => p.indexOf('<li class="as-card') === 0);
  return pieces.map((p) => {
    const end = p.indexOf('</li>');
    return end === -1 ? p : p.slice(0, end + '</li>'.length);
  });
}
const cardFragments = extractCards(gridHtml);

function attr(tag, name) {
  const m = tag.match(new RegExp(name + '="([^"]*)"'));
  return m ? m[1] : null;
}

const cards = cardFragments.map((frag) => {
  const hrefMatch = frag.match(/<a[^>]*\shref="([^"]*)"/);
  const href = hrefMatch ? hrefMatch[1] : null;
  const slug = href && href.charAt(0) === '/' ? href.slice(1) : href;
  const titleMatch = frag.match(/<h3 class="as-card__title">([\s\S]*?)<\/h3>/);
  const titleStripped = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '') : null;
  const dataStatus = attr(frag, 'data-status');
  const dataLines = attr(frag, 'data-lines');
  return { frag, href, slug, titleStripped, dataStatus, dataLines };
});

/* 2. Every manifest slug appears exactly once as a card link href="/<slug>"
   within the grid; no grid card href outside the 30. */
{
  // Hardening (review finding): a card with no <a href> at all would evade
  // the per-slug checks below — pin the card count itself.
  check(
    cards.length === manifest.length,
    '2. grid has ' + cards.length + ' card(s), want exactly ' + manifest.length
  );
  const hrefCounts = new Map();
  cards.forEach((c) => {
    if (!c.href) return;
    hrefCounts.set(c.href, (hrefCounts.get(c.href) || 0) + 1);
  });
  const missing = [];
  const wrongCount = [];
  manifest.forEach((m) => {
    const want = '/' + m.slug;
    const n = hrefCounts.get(want) || 0;
    if (n === 0) missing.push(m.slug);
    else if (n !== 1) wrongCount.push(m.slug + ' (' + n + 'x)');
  });
  const extraneous = [...hrefCounts.keys()].filter((h) => {
    const slug = h.charAt(0) === '/' ? h.slice(1) : h;
    return !manifestBySlug.has(slug);
  });
  check(missing.length === 0,
    '2. ' + missing.length + ' manifest slug(s) missing from the grid: ' + missing.join(', '));
  check(wrongCount.length === 0,
    '2. slug(s) appearing other than once: ' + wrongCount.join(', '));
  check(extraneous.length === 0,
    '2. grid card href(s) outside the 30-slug manifest: ' + extraneous.join(', '));
}

/* 3. Zero occurrences of the string "ugcc.com/project" anywhere in the page. */
{
  const n = (page.match(/ugcc\.com\/project/g) || []).length;
  check(n === 0, '3. found ' + n + ' occurrence(s) of "ugcc.com/project" in the page');
}

/* 4. Frozen titles: each card's stripped <h3 class="as-card__title"> text
   must be a byte-exact substring of that slug's detail page (<slug>/index.html).
   Entities are left as-is — no decoding. */
{
  const detailCache = new Map();
  const badTitles = [];
  cards.forEach((c) => {
    if (!c.slug || !manifestBySlug.has(c.slug)) return;
    if (!c.titleStripped) { badTitles.push(c.slug + ': no <h3 class="as-card__title"> found'); return; }
    if (!detailCache.has(c.slug)) {
      const detailPath = c.slug + '/index.html';
      detailCache.set(c.slug, exists(detailPath) ? read(detailPath) : null);
    }
    const detailHtml = detailCache.get(c.slug);
    if (detailHtml === null) { badTitles.push(c.slug + ': detail page ' + c.slug + '/index.html missing'); return; }
    if (!detailHtml.includes(c.titleStripped)) {
      badTitles.push(c.slug + ': card title not found byte-exact in detail page');
    }
  });
  check(badTitles.length === 0,
    '4. frozen-title mismatch(es): ' + badTitles.join('; '));
}

/* 5. Frozen hero subtitle: the cover lede must byte-contain this exact
   constant string. */
const FROZEN_HERO_SUBTITLE = 'Building resilient, high-quality infrastructure that strengthens connectivity and supports national development.';
check(page.includes(FROZEN_HERO_SUBTITLE),
  '5. frozen hero subtitle not found byte-exact on the page: ' + JSON.stringify(FROZEN_HERO_SUBTITLE));

/* 6. Each card's data-status equals the manifest status; each card's
   data-lines token set equals the manifest set (order-insensitive). */
{
  const bad = [];
  cards.forEach((c) => {
    if (!c.slug || !manifestBySlug.has(c.slug)) return;
    const m = manifestBySlug.get(c.slug);
    if (c.dataStatus !== m.status) {
      bad.push(c.slug + ': data-status="' + c.dataStatus + '" vs manifest "' + m.status + '"');
    }
    const cardLines = (c.dataLines || '').split(' ').filter(Boolean);
    const wantSet = new Set(m.lines);
    const gotSet = new Set(cardLines);
    const sameSize = wantSet.size === gotSet.size;
    const sameMembers = [...wantSet].every((l) => gotSet.has(l));
    if (!sameSize || !sameMembers) {
      bad.push(c.slug + ': data-lines="' + (c.dataLines || '') + '" vs manifest "' + m.lines.join(' ') + '"');
    }
  });
  check(bad.length === 0, '6. data-status/data-lines mismatch(es): ' + bad.join('; '));
}

/* 7. Chrome the hub deliberately does NOT carry (Danijel, 2026-07-21): the
   All/Current/Completed sub-nav rail duplicated the grid's own status chips,
   and the "The full record" stats section restated what the grid shows. Both
   were removed; the cover is followed directly by the filter + grid section.
   Asserted so neither can creep back in unnoticed. */
{
  check(!/class="[^"]*v2-subnav/.test(page),
    '7. the removed .v2-subnav rail is back on the page');
  check(!/class="[^"]*as-stats/.test(page),
    '7. the removed .as-stats block is back on the page');
  const firstSection = page.indexOf('<section class="as-section');
  const gridSection = page.indexOf('as-section--tint');
  check(firstSection !== -1 && gridSection !== -1 && gridSection - firstSection < 80,
    '7. the first .as-section after the cover is not the tint grid section');
}

/* ---------------------------------------------------------------------
   8. Every image URL referenced by the page in src, srcset, or
      imagesrcset resolves to an existing file on disk. Card srcset
      descriptors may only be 440w/880w; hero/band descriptors only
      960w/1440w/1920w.
   --------------------------------------------------------------------- */
function resolveToDisk(url) {
  let u = url.split('#')[0].split('?')[0];
  try { u = decodeURIComponent(u); } catch (e) { /* leave as-is */ }
  if (u.charAt(0) === '/') return u.slice(1);
  return path.posix.join('construction-projects-kuwait', u);
}
function classifyForDescriptor(url) {
  if (/\/v2\/proj\//.test(url)) return { kind: 'card', allowed: ['440w', '880w'] };
  if (/hero-projects-|hero-current-/.test(url)) return { kind: 'hero', allowed: ['960w', '1440w', '1920w'] };
  return null;
}
function parseSrcset(val) {
  return val.split(',').map((entry) => {
    const parts = entry.trim().split(/\s+/);
    return { url: parts[0], descriptor: parts[1] || null };
  }).filter((e) => e.url);
}

const imgTags = page.match(/<img\b[^>]*>/g) || [];
const sourceTags = page.match(/<source\b[^>]*>/g) || [];
const preloadTags = (page.match(/<link\b[^>]*>/g) || []).filter((t) => /rel="preload"/.test(t) && /as="image"/.test(t));

const missingFiles = [];
const badDescriptors = [];

function checkCandidate(url, descriptor, tagLabel) {
  const rel = resolveToDisk(url);
  if (!exists(rel)) missingFiles.push(tagLabel + ': ' + url + ' -> ' + rel);
  if (descriptor) {
    const cls = classifyForDescriptor(url);
    if (cls && cls.allowed.indexOf(descriptor) === -1) {
      badDescriptors.push(tagLabel + ': ' + url + ' has descriptor "' + descriptor + '", allowed [' + cls.allowed.join(', ') + ']');
    }
  }
}

imgTags.forEach((tag) => {
  const src = attr(tag, 'src');
  if (src) checkCandidate(src, null, 'img src');
  const srcset = attr(tag, 'srcset');
  if (srcset) parseSrcset(srcset).forEach((c) => checkCandidate(c.url, c.descriptor, 'img srcset'));
});
sourceTags.forEach((tag) => {
  const srcset = attr(tag, 'srcset');
  if (srcset) parseSrcset(srcset).forEach((c) => checkCandidate(c.url, c.descriptor, 'source srcset'));
  const src = attr(tag, 'src');
  if (src) checkCandidate(src, null, 'source src');
});
preloadTags.forEach((tag) => {
  const imagesrcset = attr(tag, 'imagesrcset');
  if (imagesrcset) parseSrcset(imagesrcset).forEach((c) => checkCandidate(c.url, c.descriptor, 'link imagesrcset'));
});

check(missingFiles.length === 0,
  '8. ' + missingFiles.length + ' referenced image file(s) missing on disk: ' + missingFiles.slice(0, 12).join('; ') +
  (missingFiles.length > 12 ? '; ...(' + (missingFiles.length - 12) + ' more)' : ''));
check(badDescriptors.length === 0,
  '8. ' + badDescriptors.length + ' srcset descriptor(s) outside the allowed set: ' + badDescriptors.slice(0, 12).join('; ') +
  (badDescriptors.length > 12 ? '; ...(' + (badDescriptors.length - 12) + ' more)' : ''));

/* ---------------------------------------------------------------------
   9. Every grid card <img> has loading="lazy", decoding="async", and
      numeric width/height attributes. The cover img has
      fetchpriority="high" and does NOT have loading="lazy". The head
      contains a <link rel="preload" as="image"> with imagesrcset and
      type="image/avif".
   --------------------------------------------------------------------- */
{
  const bad = [];
  cards.forEach((c) => {
    const imgTag = (c.frag.match(/<img\b[^>]*>/) || [])[0];
    const label = c.slug || '(unknown card)';
    if (!imgTag) { bad.push(label + ': no <img> found'); return; }
    if (attr(imgTag, 'loading') !== 'lazy') bad.push(label + ': img missing loading="lazy"');
    if (attr(imgTag, 'decoding') !== 'async') bad.push(label + ': img missing decoding="async"');
    const w = attr(imgTag, 'width');
    const h = attr(imgTag, 'height');
    if (!w || !/^\d+$/.test(w)) bad.push(label + ': img width not numeric ("' + w + '")');
    if (!h || !/^\d+$/.test(h)) bad.push(label + ': img height not numeric ("' + h + '")');
  });
  check(bad.length === 0, '9. grid card img attribute problem(s): ' + bad.join('; '));
}
{
  const coverTag = (page.match(/<img\b[^>]*fetchpriority="high"[^>]*>/) || [])[0]
    || (page.match(/<img\b[^>]*class="[^"]*as-cover__media[^"]*"[^>]*>/) || [])[0];
  check(!!coverTag, '9. no cover <img> found (fetchpriority="high" or class="as-cover__media")');
  if (coverTag) {
    check(attr(coverTag, 'fetchpriority') === 'high', '9. cover img missing fetchpriority="high"');
    check(attr(coverTag, 'loading') !== 'lazy', '9. cover img must not have loading="lazy"');
  }
  const preloadAvif = preloadTags.some((t) => /imagesrcset="/.test(t) && /type="image\/avif"/.test(t));
  check(preloadAvif, '9. no <link rel="preload" as="image" imagesrcset="..." type="image/avif"> in the head');
}

/* 10. Every grid card img is inside a <picture> that has a
   <source type="image/avif">. */
{
  const bad = [];
  cards.forEach((c) => {
    const label = c.slug || '(unknown card)';
    const pictureMatch = c.frag.match(/<picture>([\s\S]*?)<\/picture>/);
    if (!pictureMatch) { bad.push(label + ': img not wrapped in <picture>'); return; }
    if (!/<source\b[^>]*type="image\/avif"[^>]*>/.test(pictureMatch[1])) {
      bad.push(label + ': <picture> has no <source type="image/avif">');
    }
  });
  check(bad.length === 0, '10. picture/avif-source problem(s): ' + bad.join('; '));
}

/* 11. No-JS completeness: no `hidden` attribute anywhere inside the grid
   <ul>; at least two chips (buttons) with aria-pressed="true" exist in
   the shipped HTML. */
{
  const hiddenCount = (gridHtml.match(/\bhidden\b/g) || []).length;
  check(hiddenCount === 0, '11. grid <ul> contains ' + hiddenCount + ' occurrence(s) of the `hidden` attribute (must ship with no-JS complete)');
  const pressedTrueChips = (page.match(/<button\b[^>]*aria-pressed="true"[^>]*>/g) || []);
  check(pressedTrueChips.length >= 2,
    '11. only ' + pressedTrueChips.length + ' button(s) with aria-pressed="true" found, want >= 2');
}

/* 12. Perf budget from files on disk. */
{
  function largestVariant(prefix) {
    const dir = path.join(root, 'assets/img/v2');
    let files = [];
    try { files = fs.readdirSync(dir); } catch (e) { files = []; }
    const re = new RegExp('^' + prefix + '-(\\d+)\\.avif$');
    const widths = files.map((f) => {
      const m = f.match(re);
      return m ? { file: f, w: parseInt(m[1], 10) } : null;
    }).filter(Boolean);
    if (!widths.length) return null;
    widths.sort((a, b) => b.w - a.w);
    return path.posix.join('assets/img/v2', widths[0].file);
  }
  function sizeOf(relPath) {
    try { return fs.statSync(path.join(root, relPath)).size; } catch (e) { return null; }
  }

  const heroProjectsPreferred = 'assets/img/v2/hero-projects-1920.avif';
  const heroProjectsFile = exists(heroProjectsPreferred) ? heroProjectsPreferred : largestVariant('hero-projects');
  if (!heroProjectsFile) {
    check(false, '12. no hero-projects-*.avif found on disk');
  } else {
    const sz = sizeOf(heroProjectsFile);
    check(sz !== null && sz <= 250 * 1024,
      '12. ' + heroProjectsFile + ' is ' + (sz === null ? 'missing' : (sz / 1024).toFixed(1) + 'KB') + ', budget <= 250KB');
  }

  const heroCurrentFile = largestVariant('hero-current');
  if (!heroCurrentFile) {
    check(false, '12. no hero-current-*.avif found on disk (needed for the full-scroll budget sum)');
  }

  let cardSum = 0;
  const oversizedCards = [];
  const missingCardAvif = [];
  manifest.forEach((m) => {
    const rel = 'assets/img/v2/proj/' + m.slug + '-440.avif';
    const sz = sizeOf(rel);
    if (sz === null) { missingCardAvif.push(rel); return; }
    cardSum += sz;
    if (sz > 60 * 1024) oversizedCards.push(rel + ' (' + (sz / 1024).toFixed(1) + 'KB)');
  });
  check(missingCardAvif.length === 0,
    '12. missing card 440 AVIF derivative(s): ' + missingCardAvif.join(', '));
  check(oversizedCards.length === 0,
    '12. card 440 AVIF(s) over the 60KB budget: ' + oversizedCards.join(', '));

  if (heroProjectsFile && heroCurrentFile && missingCardAvif.length === 0) {
    const heroProjectsSz = sizeOf(heroProjectsFile) || 0;
    const heroCurrentSz = sizeOf(heroCurrentFile) || 0;
    const total = cardSum + heroProjectsSz + heroCurrentSz;
    check(total <= 1.5 * 1024 * 1024,
      '12. full-scroll AVIF sum ' + (total / 1024 / 1024).toFixed(2) + 'MB exceeds the 1.5MB budget ' +
      '(cards ' + (cardSum / 1024).toFixed(1) + 'KB + ' + heroProjectsFile + ' ' + (heroProjectsSz / 1024).toFixed(1) + 'KB + ' +
      heroCurrentFile + ' ' + (heroCurrentSz / 1024).toFixed(1) + 'KB)');
  }
}

/* 13. Builder chrome intact: page contains `block-header` and `FUdf9w9dXZ`. */
check(page.includes('block-header'), '13. page is missing "block-header" (builder header chrome)');
check(page.includes('FUdf9w9dXZ'), '13. page is missing "FUdf9w9dXZ" (builder footer marker)');

/* 14. Head hygiene: <title> does not contain "mockup" (case-insensitive);
   stylesheet chain includes about-suite.css and pages/projects.css;
   scripts include js/projects.js. */
{
  const titleMatch = page.match(/<title>([\s\S]*?)<\/title>/);
  const title = titleMatch ? titleMatch[1] : '';
  check(!!titleMatch, '14. no <title> found on the page');
  check(!/mockup/i.test(title), '14. <title> contains "mockup": ' + JSON.stringify(title));
  check(/href="[^"]*\/assets\/css\/about-suite\.css(\?[^"]*)?"/.test(page),
    '14. stylesheet chain missing about-suite.css');
  check(/href="[^"]*\/assets\/css\/pages\/projects\.css(\?[^"]*)?"/.test(page),
    '14. stylesheet chain missing pages/projects.css');
  check(/src="[^"]*\/assets\/js\/projects\.js(\?[^"]*)?"/.test(page),
    '14. scripts missing js/projects.js');
}

/* ---------------------------------------------------------------------
   15. Manifest cross-validated against the actual listing pages on disk
   (review finding): checks 1-14 only validate the hub page against the
   manifest, so a manifest row mis-tagged relative to reality (status or
   lines) would sail through undetected as long as the hub page merely
   echoed the wrong manifest value. This check derives "truth" from the
   listing pages themselves and compares the manifest against it.
   --------------------------------------------------------------------- */
{
  const listingCache = new Map();
  function listingHtml(pagePath) {
    if (!listingCache.has(pagePath)) {
      listingCache.set(pagePath, exists(pagePath) ? read(pagePath) : null);
    }
    return listingCache.get(pagePath);
  }
  function hasHref(pagePath, slug) {
    const html = listingHtml(pagePath);
    if (html === null) return false;
    return html.indexOf('href="/' + slug + '"') !== -1;
  }

  // token -> listing pages that carry that discipline, as { dir, path }.
  // "dir" is the short name used in failure messages; "path" is the file
  // read from disk. A page counts only if it exists on disk (oil has no
  // "-current" page, per the business-lines set).
  const LINE_PAGES = {
    roads: ['roads-and-bridges-current', 'roads-and-bridges-completed'],
    civil: ['civil-current', 'civil-completed'],
    building: ['building-construction-current', 'building-construction-completed'],
    micro: ['micro-tunneling-current', 'micro-tunneling-completed'],
    water: ['water-current', 'water-completed'],
    em: ['electro-mechanical-current', 'electro-mechanical-completed'],
    oil: ['oil-and-gas-completed'],
  };
  const LINE_TOKENS = Object.keys(LINE_PAGES);

  const bad = [];

  manifest.forEach((m) => {
    /* --- Status: slug must appear in all-project-current iff current,
       and in all-projects-completed iff completed; must always appear
       in all-projects-new. --- */
    const inCurrentListing = hasHref('all-project-current/index.html', m.slug);
    const inCompletedListing = hasHref('all-projects-completed/index.html', m.slug);
    const inNewListing = hasHref('all-projects-new/index.html', m.slug);

    if (m.status === 'current' && !inCurrentListing) {
      bad.push('15. ' + m.slug + ': status=current but missing from all-project-current');
    }
    if (m.status !== 'current' && inCurrentListing) {
      bad.push('15. ' + m.slug + ': status=' + m.status + ' but appears in all-project-current');
    }
    if (m.status === 'completed' && !inCompletedListing) {
      bad.push('15. ' + m.slug + ': status=completed but missing from all-projects-completed');
    }
    if (m.status !== 'completed' && inCompletedListing) {
      bad.push('15. ' + m.slug + ': status=' + m.status + ' but appears in all-projects-completed');
    }
    if (!inNewListing) {
      bad.push('15. ' + m.slug + ': missing from all-projects-new');
    }

    /* --- Lines: for each of the 7 tokens, membership in that token's
       listing page(s) must match whether the manifest row carries it. --- */
    const lineSet = new Set(m.lines);
    LINE_TOKENS.forEach((token) => {
      const pages = LINE_PAGES[token];
      const foundOn = pages.filter((dir) => hasHref(dir + '/index.html', m.slug));
      const present = foundOn.length > 0;
      const has = lineSet.has(token);
      if (has && !present) {
        bad.push('15. ' + m.slug + ': has token "' + token + '" but appears in no ' + token + ' listing page');
      }
      if (!has && present) {
        bad.push('15. ' + m.slug + ': missing token "' + token + '" but appears in ' + foundOn.join(', '));
      }
    });
  });

  check(bad.length === 0, bad.join('; '));
}

/* ---------------------------------------------------------------------
   16. Frozen blurbs relocated to detail pages: the redesigned hub dropped
   the per-project blurb paragraphs the old hub carried. Under the
   customer content freeze those approved texts were RELOCATED onto each
   project's own detail page, not deleted. This check makes that
   guarantee machine-enforced: every row of tools/projects-blurb-map.tsv
   (slug, confidence, already_present, blurb — blurb has HTML tags
   stripped but entities preserved) must byte-exact-appear somewhere in
   that slug's <slug>/index.html. Matching is done against the raw HTML
   first and, failing that, against the page's tag-stripped text: on
   mew5773 and mew6085 the approved sentence is visible but interrupted by
   inline markup (a <strong> around the contract number), so the bytes are
   not contiguous in the source while the reader still sees the sentence
   intact. Entities are never decoded on either side. This also covers the
   two other special cases: owwsct2460879's blurb lives in the page's <h1>
   rather than body copy, and mew6085's blurb is a strict prefix of a
   longer paragraph. koc36081 has two map rows and must contain both.
   --------------------------------------------------------------------- */
{
  const MAP_PATH = 'tools/projects-blurb-map.tsv';
  if (!exists(MAP_PATH)) {
    check(false, '16. ' + MAP_PATH + ' missing');
  } else {
    const blurbMapRaw = read(MAP_PATH).replace(/\r\n/g, '\n').trim();
    const blurbRows = blurbMapRaw.split('\n').filter(Boolean).map((line) => {
      const parts = line.split('\t');
      return {
        slug: parts[0],
        confidence: parts[1],
        alreadyPresent: parts[2],
        blurb: parts[3] || '',
      };
    });

    check(blurbRows.length >= 15,
      '16. ' + MAP_PATH + ' parsed to only ' + blurbRows.length + ' row(s), want >= 15 (vacuous-pass guard)');

    const detailCache = new Map();
    const missingPages = [];
    const missingBlurbs = [];
    blurbRows.forEach((row) => {
      if (!row.slug) return;
      const detailPath = row.slug + '/index.html';
      if (!detailCache.has(row.slug)) {
        detailCache.set(row.slug, exists(detailPath) ? read(detailPath) : null);
      }
      const detailHtml = detailCache.get(row.slug);
      if (detailHtml === null) {
        missingPages.push(row.slug + ': detail page ' + detailPath + ' missing');
        return;
      }
      if (!detailCache.has(row.slug + '#text')) {
        detailCache.set(row.slug + '#text', detailHtml.replace(/<[^>]+>/g, ''));
      }
      const detailText = detailCache.get(row.slug + '#text');
      if (!detailHtml.includes(row.blurb) && !detailText.includes(row.blurb)) {
        missingBlurbs.push(row.slug + ': blurb not found byte-exact, starts "' + row.blurb.slice(0, 60) + '"');
      }
    });
    check(missingPages.length === 0,
      '16. detail page(s) missing: ' + missingPages.join('; '));
    check(missingBlurbs.length === 0,
      '16. relocated blurb(s) not found on detail page: ' + missingBlurbs.join('; '));
  }
}

/* ---------------------------------------------------------------------
   Report
   --------------------------------------------------------------------- */
/* ---------------------------------------------------------------------
   17. Parity with the original site. Check 15 cross-validates the manifest
   against the live discipline listing pages, but phase 2 turns those pages
   into redirects — at which point that source of truth disappears. So the
   classification as it stood on the `baseline` branch (the pixel replica of
   the original Hostinger site) is frozen into
   tools/projects-baseline-classification.tsv, and asserted here. A project
   filed under several disciplines on the original site must stay filed
   under all of them. Regenerate only from origin/baseline, never by hand.
   --------------------------------------------------------------------- */
{
  const BASE_PATH = 'tools/projects-baseline-classification.tsv';
  if (!exists(BASE_PATH)) {
    check(false, '17. ' + BASE_PATH + ' missing');
  } else {
    const baseRows = read(BASE_PATH).replace(/\r\n/g, '\n').trim().split('\n').filter(Boolean)
      .map((line) => {
        const [slug, status, lines] = line.split('\t');
        return { slug, status, lines: (lines || '').split(' ').filter(Boolean) };
      });
    check(baseRows.length === manifest.length,
      '17. baseline classification has ' + baseRows.length + ' rows, manifest has ' + manifest.length);

    const drift = [];
    baseRows.forEach((row) => {
      const m = manifestBySlug.get(row.slug);
      if (!m) { drift.push(row.slug + ': in baseline, absent from manifest'); return; }
      if (m.status !== row.status) {
        drift.push(row.slug + ': status "' + m.status + '" vs baseline "' + row.status + '"');
      }
      const want = new Set(row.lines);
      const got = new Set(m.lines);
      const missing = [...want].filter((d) => !got.has(d));
      const extra = [...got].filter((d) => !want.has(d));
      if (missing.length || extra.length) {
        drift.push(row.slug + ':' +
          (missing.length ? ' dropped from ' + missing.join(',') : '') +
          (extra.length ? ' added to ' + extra.join(',') : ''));
      }
    });
    check(drift.length === 0,
      '17. classification drifted from the original site: ' + drift.join('; '));
  }
}

if (failures.length) {
  console.error('FAIL\n' + failures.map((f) => ' - ' + f).join('\n'));
  process.exit(1);
}
console.log('OK: all projects-hub checks passed');

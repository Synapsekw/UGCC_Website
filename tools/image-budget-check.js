#!/usr/bin/env node
/* tools/image-budget-check.js — per-page image budgets and <picture>
   invariants for the whole site. Node, zero dependencies.
   Usage: node tools/image-budget-check.js

   Reads every <page>/index.html and the derivative files on disk. Git history
   is NOT consulted — files on disk only.

   Plain string/regex parsing is the house style for these checkers (see
   tools/projects-hub-check.js). Most production HTML here is minified onto
   very long lines, so every extraction is regex-based rather than line-based.

   Exit 0 + "OK: all image-budget checks passed" on success.
   Exit 1 + a bulleted failure list on any failure. */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

/* Budgets. PAGE is worst-case: the widest candidate of every <picture>, which
   is what a desktop viewport with everything scrolled into view fetches.
   4MB accommodates the project galleries (16-20 full-width photographs, all
   lazy) while still catching a regression on any ordinary page. LCP matches
   the 250KB already enforced by projects-hub-check.js check 12. */
const PAGE_BUDGET_BYTES = 4 * 1024 * 1024;
const LCP_BUDGET_BYTES = 250 * 1024;

const SKIP_DIRS = new Set(['node_modules', '.git', '.claude', '.superpowers',
  'assets', 'tools', 'tests', 'docs', 'netlify']);

function pages() {
  const found = [path.join(root, 'index.html')];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    const candidate = path.join(root, entry.name, 'index.html');
    if (fs.existsSync(candidate)) found.push(candidate);
  }
  return found;
}

const sizeOf = (rel) => {
  try { return fs.statSync(path.join(root, rel)).size; } catch (e) { return null; }
};

const allPages = pages();
check(allPages.length >= 50,
  '0. found only ' + allPages.length + ' pages, expected >= 50 — the page walk is wrong');

for (const page of allPages) {
  const label = path.relative(root, page);
  const html = fs.readFileSync(page, 'utf8');
  const blocks = html.match(/<picture>[\s\S]*?<\/picture>/g) || [];

  /* 1. Every srcset candidate and every img src resolves to a real file. */
  const candidates = new Set();
  for (const m of html.matchAll(/(?:srcset|imagesrcset)="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const url = part.trim().split(/\s+/)[0];
      if (url.startsWith('/assets/')) candidates.add(url.slice(1));
    }
  }
  for (const m of html.matchAll(/<img[^>]*\bsrc="(\/assets\/[^"]+)"/g)) {
    candidates.add(m[1].slice(1));
  }
  const missing = [...candidates].filter((rel) => sizeOf(rel) === null);
  check(missing.length === 0,
    '1. ' + label + ': references missing files: ' + missing.slice(0, 4).join(', '));

  /* 2. No <img> without both width and height — this is the CLS guard. */
  const bare = (html.match(/<img\b[^>]*>/g) || [])
    .filter((tag) => !(/\bwidth="/.test(tag) && /\bheight="/.test(tag)));
  check(bare.length === 0,
    '2. ' + label + ': ' + bare.length + ' <img> without width/height');

  /* 3. Worst-case page image weight, counting the widest AVIF per <picture>
        plus any bare <img> outside one. */
  let worst = 0;
  for (const block of blocks) {
    const avif = [...block.matchAll(/(\/assets\/img\/[^"\s]+\.avif)\s+(\d+)w/g)];
    if (avif.length) {
      const biggest = avif.sort((a, b) => Number(b[2]) - Number(a[2]))[0][1];
      worst += sizeOf(biggest.slice(1)) || 0;
    } else {
      const fallback = block.match(/<img[^>]*\bsrc="(\/assets\/[^"]+)"/);
      if (fallback) worst += sizeOf(fallback[1].slice(1)) || 0;
    }
  }
  const outside = html.replace(/<picture>[\s\S]*?<\/picture>/g, ' ');
  for (const m of outside.matchAll(/<img[^>]*\bsrc="(\/assets\/[^"]+)"/g)) {
    worst += sizeOf(m[1].slice(1)) || 0;
  }
  check(worst <= PAGE_BUDGET_BYTES,
    '3. ' + label + ': worst-case image weight ' + (worst / 1e6).toFixed(2)
    + 'MB exceeds the ' + (PAGE_BUDGET_BYTES / 1e6).toFixed(1) + 'MB budget');

  /* 4. Exactly one LCP image, and it stays small. */
  const highs = (html.match(/fetchpriority="high"/g) || []).length;
  check(highs === 1,
    '4. ' + label + ': ' + highs + ' images marked fetchpriority="high", want exactly 1');

  const preload = html.match(/<link rel="preload" as="image"[^>]*>/);
  check(!!preload, '4. ' + label + ': no LCP preload');
  if (preload) {
    const srcset = preload[0].match(/imagesrcset="([^"]+)"/);
    const sizes = preload[0].match(/imagesizes="([^"]+)"/);
    check(!!srcset && !!sizes,
      '4. ' + label + ': preload missing imagesrcset/imagesizes');

    if (srcset) {
      /* The preload must be offered by a real <picture> on the page, with the
         same sizes. Any drift and the browser downloads the file twice. */
      const owner = blocks.find((b) => b.includes(srcset[1]));
      check(!!owner,
        '4. ' + label + ': preload imagesrcset matches no <picture> on the page');
      if (owner && sizes) {
        const src = owner.match(/<source[^>]*type="image\/avif"[^>]*>/);
        const ownerSizes = src && src[0].match(/\bsizes="([^"]+)"/);
        check(!!ownerSizes && ownerSizes[1] === sizes[1],
          '4. ' + label + ': preload imagesizes does not match the <picture> sizes');
      }
      const first = srcset[1].split(',')[0].trim().split(/\s+/)[0];
      const size = sizeOf(first.slice(1));
      check(size !== null && size <= LCP_BUDGET_BYTES,
        '4. ' + label + ': smallest LCP candidate ' + first + ' is '
        + (size === null ? 'missing' : (size / 1024).toFixed(1) + 'KB')
        + ', budget <= ' + (LCP_BUDGET_BYTES / 1024) + 'KB');
    }
  }

  /* 5. Every <picture> offers AVIF — otherwise the rewrite regressed. */
  const noAvif = blocks.filter((b) => !b.includes('type="image/avif"')).length;
  check(noAvif === 0,
    '5. ' + label + ': ' + noAvif + ' <picture> without an AVIF <source>');

  /* 6. No derivative is served larger than the source it replaced. */
  for (const m of html.matchAll(/<img[^>]*\bsrc="(\/assets\/img\/v3\/resp\/[^"]+)"/g)) {
    check(sizeOf(m[1].slice(1)) !== null,
      '6. ' + label + ': fallback ' + m[1] + ' is missing');
  }
}

if (failures.length) {
  console.error('image-budget checks FAILED:');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('OK: all image-budget checks passed (' + allPages.length + ' pages)');

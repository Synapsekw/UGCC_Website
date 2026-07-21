// tests/about-expertise.test.mjs — guards the About page's three-column
// Expertise row (Engineering / Construction / Procurement).
//
// Written 2026-07-21 while chasing a reported "blank Construction column".
// That report was WRONG for V3: master's 4634868 fixed a blank slot in an
// older panned-crop layout (--desktop-left:-508px) that no longer exists.
// V3 rebuilt the row as 4:3 as-card tiles and all three slots resolve —
// verified in-browser at 1280px, each rendering 351x263, none broken.
//
// So this pins the invariant that actually matters — every tile has a title
// and an image that resolves on disk — rather than naming specific files.
// Naming files would have re-encoded the same mistaken assumption, and would
// fight Phase 2, which rewrites these <img> into <picture>.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(repo, 'about-contractor-kuwait/index.html'), 'utf8');

// Scope to the Expertise <ul>; the page carries other cards.
const row = html.match(/<ul class="as-cards as-cards--3 about-expertise">[\s\S]*?<\/ul>/);

const tiles = row
  ? [...row[0].matchAll(/<li class="as-card as-card--tile">[\s\S]*?<\/li>/g)].map((m) => m[0])
  : [];

describe('About page Expertise row', () => {
  it('renders the row', () => {
    expect(row).not.toBeNull();
  });

  it('has exactly three tiles', () => {
    expect(tiles).toHaveLength(3);
  });

  it('titles them Engineering, Construction, Procurement in order', () => {
    const titles = tiles.map((t) => t.match(/<h3 class="as-card__title">(.*?)<\/h3>/)?.[1]);
    expect(titles).toEqual(['Engineering', 'Construction', 'Procurement']);
  });

  it.each([0, 1, 2])('tile %i has an image that resolves on disk', (i) => {
    const src = tiles[i]?.match(/<img[^>]*\bsrc="\/([^"]+)"/)?.[1];
    expect(src, `tile ${i} has no src`).toBeTruthy();
    expect(existsSync(join(repo, src)), `${src} is missing from disk`).toBe(true);
  });

  it.each([0, 1, 2])('tile %i carries non-empty alt and explicit dimensions', (i) => {
    const img = tiles[i]?.match(/<img[\s\S]*?>/)?.[0] ?? '';
    expect(img).toMatch(/alt="[^"]+"/);
    expect(img).toMatch(/width="\d+"/);
    expect(img).toMatch(/height="\d+"/);
  });

  it('references no pre-v3 expertise asset', () => {
    expect(html).not.toContain('editprocurement.jpg');
  });
});

// tests/business-line.test.mjs
// Static invariants for the seven business-line sub-pages. These parse the
// minified HTML as text — no browser. Computed-style assertions live in
// tools/business-line-check.js instead.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const PAGES = {
  'roads-and-bridges-contractor-kuwait': 'Roads and Bridges',
  'civil-infrastructure-kuwait': 'Civil Infrastructure',
  'building-construction-kuwait': 'Building Construction',
  'oil-and-gas-construction-kuwait': 'Oil and Gas',
  'water-treatment-plant-kuwait': 'Water and Wastewater',
  'electro-mechanical-contractor-kuwait': 'Electro-Mechanical',
  'micro-tunneling-kuwait': 'Micro-Tunnelling',
};

// Sub-nav hrefs, frozen order (spec §4.2)
const TABS = [
  '/business-lines-construction-services-kuwait',
  '/roads-and-bridges-contractor-kuwait',
  '/civil-infrastructure-kuwait',
  '/building-construction-kuwait',
  '/oil-and-gas-construction-kuwait',
  '/water-treatment-plant-kuwait',
  '/electro-mechanical-contractor-kuwait',
  '/micro-tunneling-kuwait',
];

const TYPOS = [
  'stream flood', 'sever network', 'tankge', 'Duqum',
];
// Missing-U variant only — "UGCC has tremendous" is fine, so a plain
// substring check would false-positive on the repaired text.
const GCC_TYPO = /(?<!U)GCC has tremendous/;

const html = {};
for (const slug of Object.keys(PAGES)) {
  html[slug] = readFileSync(`${slug}/index.html`, 'utf8');
}

describe.each(Object.entries(PAGES))('%s', (slug, name) => {
  const doc = () => html[slug];

  it('loads the kit stylesheets in order, after v3.css', () => {
    // Version-agnostic: ?v=N bumps on every edit of the asset (house
    // convention), so pinning N here broke on every legitimate bump.
    // The invariant is presence and cascade ORDER, not the number.
    const d = doc();
    const iV3 = d.search(/\/assets\/css\/v3\.css\?v=\d+/);
    const iKit = d.search(/\/assets\/css\/about-suite\.css\?v=\d+/);
    const iPage = d.search(/\/assets\/css\/pages\/business-line\.css\?v=\d+/);
    expect(iV3).toBeGreaterThan(-1);
    expect(iKit).toBeGreaterThan(iV3);
    expect(iPage).toBeGreaterThan(iKit);
  });

  it('loads about-suite.js, deferred', () => {
    expect(doc()).toMatch(/src="\/assets\/js\/about-suite\.js\?v=\d+" defer/);
  });

  it('has exactly one h1 and it is the canonical display name', () => {
    const h1s = [...doc().matchAll(/<h1[^>]*>(.*?)<\/h1>/gs)];
    expect(h1s).toHaveLength(1);
    expect(h1s[0][1].replace(/\s+/g, ' ').trim()).toBe(name);
  });

  it('carries the frozen sub-nav with aria-current on its own tab', () => {
    const d = doc();
    const nav = d.match(/<section class="v3-subnav">.*?<\/section>/s);
    expect(nav).not.toBeNull();
    const hrefs = [...nav[0].matchAll(/href="([^"]*)"/g)].map(m => m[1]);
    expect(hrefs).toEqual(TABS);
    const active = nav[0].match(/<a href="([^"]*)"[^>]*class="is-active"[^>]*>/);
    expect(active[1]).toBe('/' + slug);
    expect(active[0]).toContain('aria-current="page"');
    expect(nav[0]).toContain('>Micro-Tunnelling<');       // canonical double-L
    expect(nav[0]).toContain('>Water and Wastewater<');   // canonical name
  });

  it('ships no desktop/mobile duplicate images in the rebuilt body', () => {
    // Scope to the rebuilt body: the frozen builder footer (id="FUdf9w9dXZ",
    // kept verbatim on every kit page) legitimately carries one
    // image-wrapper--mobile logo duplicate.
    const d = doc();
    const start = d.indexOf('as-cover');
    const body = d.slice(start < 0 ? 0 : start, d.indexOf('id="FUdf9w9dXZ"'));
    expect(body).not.toContain('image-wrapper--mobile');
  });

  it('contains none of the known typo strings', () => {
    for (const t of TYPOS) expect(doc()).not.toContain(t);
    expect(doc()).not.toMatch(GCC_TYPO);
  });

  it('every img in the body carries a non-empty alt', () => {
    const d = doc();
    const body = d.slice(d.indexOf('as-cover'), d.indexOf('id="FUdf9w9dXZ"'));
    for (const m of body.matchAll(/<img[^>]*>/g)) {
      expect(m[0], m[0]).toMatch(/alt="[^"]+"/);
    }
  });

  it('JSON-LD image points at the derived cover', () => {
    expect(doc()).toMatch(/"image":\s*"https:\/\/ugcc\.com\/assets\/img\/v3\/blp\/[a-z]+-cover\.jpg"/);
  });
});

describe('oil-and-gas status-aware links', () => {
  it('links completed only — no current button, no dead link', () => {
    // The listing pages were retired in phase 2; the buttons now deep-link
    // into hub filter state. Oil and gas still has no "current" bucket.
    const d = html['oil-and-gas-construction-kuwait'];
    expect(d).toContain('href="/construction-projects-kuwait#oil+completed"');
    expect(d).not.toContain('#oil+current');
  });
});

describe('micro-tunnelling title', () => {
  it('title uses the double-L display form', () => {
    expect(html['micro-tunneling-kuwait']).toContain('<title>Micro-Tunnelling Kuwait');
  });
});

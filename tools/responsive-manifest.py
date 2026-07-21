#!/usr/bin/env python3
"""tools/responsive-manifest.py — decides which images need derivatives and at
which widths, and writes tools/responsive-manifest.tsv.

Usage:  python3 tools/responsive-manifest.py

One row per <img> worth converting. Columns:

  page    page path relative to the repo root
  src     source file, relative to the repo root
  stem    derivative filename stem under assets/img/v3/resp/
  widths  comma-separated target widths (never above the source width)
  sizes   the sizes attribute to emit
  role    'lcp' for the page's first eager image, else 'below'

Skipped:
  - anything already inside a <picture> (the projects hub is already done)
  - anything under 40KB, where an extra request costs more than it saves
  - logos and icons: small, flat, already optimal as PNG

The manifest is committed so the encoder, the rewriter and the checker all
work from the same decisions, and so a reviewer can see them without
re-deriving them.
"""
import os
import re
from html.parser import HTMLParser

SKIP_DIRS = {'node_modules', '.git', '.claude', '.superpowers'}
MIN_BYTES = 40 * 1024
LADDER = (480, 960, 1440, 1920)

IMG_TAG = re.compile(r'<img\b[^>]*>')
PICTURE = re.compile(r'<picture>.*?</picture>', re.S)
SRC_ATTR = re.compile(r'\bsrc="(/assets/img/[^"]+)"')
CLASS_ATTR = re.compile(r'\bclass="([^"]*)"')

# Full-bleed covers span the viewport; cards and inline figures do not.
# Getting `sizes` wrong is what makes a browser fetch the wrong width.
SIZES_FULL = '100vw'
SIZES_CARD = '(max-width:600px) calc(100vw - 64px), (max-width:920px) 50vw, 384px'

# Matched ONLY against the class attributes of the <img> and its ancestors,
# resolved with a real parser.
#
# Two earlier attempts were wrong. Reading just the <img> tag's own class
# misclassified every builder hero as a card, because the builder puts the
# full-bleed class on a parent div and leaves the <img> class-less. Reading a
# fixed window of preceding characters then over-corrected: the window bleeds
# across sibling elements, so an Expertise card inherited "banner" from the
# previous card's filename and was told it spanned the viewport.
#
# Filenames are deliberately NOT consulted. "cover", "banner" and "hero" are
# common in this library's filenames regardless of how the image is used — the
# Expertise Construction tile is literally named media-center-banner — so the
# filename says nothing about the slot's width.
FULL_BLEED_HINTS = ('as-cover', 'block-background', 'block-media',
                    'hero', 'banner', 'fullscreen', 'cover')

# Brand marks and client logos: small, flat, already optimal as PNG.
LOGO_HINTS = ('logo', 'icon', 'favicon', 'android-chrome', 'apple-touch')


def repo_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def pages(root):
    found = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        if 'index.html' in filenames:
            found.append(os.path.join(dirpath, 'index.html'))
    return sorted(found)


class ImgScanner(HTMLParser):
    """Collects every <img>, with the class attributes of its ancestor chain.

    A real parser is used rather than a regex window because full-bleed-ness
    is a property of the image's CONTAINER, and the only reliable way to know
    the container is to track open tags. Void elements are not pushed, and
    stray close tags are tolerated — this HTML is builder output and is not
    guaranteed to be tidy.
    """

    VOID = {'img', 'source', 'br', 'hr', 'meta', 'link', 'input', 'area',
            'base', 'col', 'embed', 'param', 'track', 'wbr'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.images = []
        self.in_picture = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'img':
            self.images.append({
                'attrs': attrs,
                'ancestors': list(self.stack),
                'in_picture': self.in_picture > 0,
            })
            return
        if tag == 'picture':
            self.in_picture += 1
        if tag not in self.VOID:
            self.stack.append((attrs.get('class') or '').lower())

    def handle_startendtag(self, tag, attrs):
        if tag == 'img':
            self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag == 'picture' and self.in_picture:
            self.in_picture -= 1
        if tag not in self.VOID and self.stack:
            self.stack.pop()


def stem_for(src):
    """assets/img/ab12-cover-XY.jpg -> ab12-cover-XY.

    The builder's hash prefix is already unique per file, and v3/ names are
    hand-authored and distinct, so the basename alone will not collide.
    """
    return os.path.splitext(os.path.basename(src))[0]


def widths_for(src_width):
    """Ladder rungs up to min(source width, 1920).

    Two caps, for different reasons. 1920 is the deliberate ceiling — nobody
    needs a 2800px hero, and the extra bytes buy nothing on real displays.
    The source width is a hard limit because upscaling invents detail.

    The top rung is pinned to the cap when the ladder stops well short of it.
    Without that, a 768px full-bleed hero would top out at the 480px rung and
    ship *lower* resolution than the site does today — 44 slots hit this.
    The 1.15 tolerance avoids a pointless extra encode when the cap is only
    marginally above the last rung (a 1024px source does not need 960 *and*
    1024).
    """
    cap = min(src_width, LADDER[-1])
    picked = [w for w in LADDER if w <= cap]
    if not picked:
        return [cap]
    if cap > picked[-1] * 1.15:
        picked.append(cap)
    return picked


def main():
    from PIL import Image

    root = repo_root()
    rows = []
    stems = {}

    for page in pages(root):
        with open(page, encoding='utf-8', errors='ignore') as handle:
            html = handle.read()

        scanner = ImgScanner()
        scanner.feed(html)

        page_rel = os.path.relpath(page, root)
        first_eager_done = False
        seen_on_page = set()

        for img in scanner.images:
            # Already converted (the projects hub): leave alone, and do not
            # let it claim the page's LCP slot.
            if img['in_picture']:
                continue

            src = img['attrs'].get('src', '')
            if not src.startswith('/assets/img/'):
                continue
            rel = src.lstrip('/')
            abs_path = os.path.join(root, rel)
            if not os.path.exists(abs_path):
                continue

            lowered = rel.lower()
            if any(hint in lowered for hint in LOGO_HINTS):
                continue
            if os.path.getsize(abs_path) < MIN_BYTES:
                continue

            # Full-bleed is a property of the container, so test the image's
            # own class and every ancestor's — never the filename.
            classes = [(img['attrs'].get('class') or '').lower()]
            classes.extend(img['ancestors'])
            full_bleed = any(hint in cls
                             for cls in classes for hint in FULL_BLEED_HINTS)

            role = 'below'
            if img['attrs'].get('loading') != 'lazy' and not first_eager_done:
                role = 'lcp'
                first_eager_done = True

            if rel in seen_on_page:
                continue
            seen_on_page.add(rel)

            with Image.open(abs_path) as im:
                src_width = im.size[0]

            stem = stem_for(rel)
            stems.setdefault(stem, set()).add(rel)

            rows.append((
                page_rel,
                rel,
                stem,
                ','.join(str(w) for w in widths_for(src_width)),
                SIZES_FULL if full_bleed else SIZES_CARD,
                role,
            ))

    clashes = {s: v for s, v in stems.items() if len(v) > 1}
    if clashes:
        print('ERROR: %d stem collision(s) — two sources would write the same '
              'derivative:' % len(clashes))
        for stem, sources in sorted(clashes.items()):
            print('  %s <- %s' % (stem, ', '.join(sorted(sources))))
        return 1

    out_path = os.path.join(root, 'tools/responsive-manifest.tsv')
    with open(out_path, 'w', encoding='utf-8') as handle:
        handle.write('page\tsrc\tstem\twidths\tsizes\trole\n')
        for row in rows:
            handle.write('\t'.join(row) + '\n')

    print('wrote %s' % os.path.relpath(out_path, root))
    print('  rows:           %d' % len(rows))
    print('  pages:          %d' % len({r[0] for r in rows}))
    print('  distinct srcs:  %d' % len({r[1] for r in rows}))
    print('  lcp rows:       %d' % sum(1 for r in rows if r[5] == 'lcp'))
    print('  encodes needed: %d' % sum(len(r[3].split(',')) for r in rows))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

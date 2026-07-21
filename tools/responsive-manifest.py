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

# Matched against the image's own class/filename AND the markup immediately
# preceding it. The builder wraps full-bleed images in a parent div
# (block-background, block-media) and leaves the <img> itself class-less, so
# looking only at the tag misclassified every builder hero as a card — which
# would have made browsers fetch a 384px file for a 100vw slot.
FULL_BLEED_HINTS = ('as-cover', 'cover', 'hero', 'banner',
                    'block-background', 'block-media', 'fullscreen')
CONTEXT_CHARS = 400

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

        # Blank out existing <picture> blocks, preserving offsets, so their
        # <img> are neither re-processed nor counted as the page's LCP.
        masked = PICTURE.sub(lambda m: ' ' * len(m.group(0)), html)

        page_rel = os.path.relpath(page, root)
        first_eager_done = False
        seen_on_page = set()

        for match in IMG_TAG.finditer(masked):
            tag = match.group(0)
            src_match = SRC_ATTR.search(tag)
            if not src_match:
                continue
            rel = src_match.group(1).lstrip('/')
            abs_path = os.path.join(root, rel)
            if not os.path.exists(abs_path):
                continue

            lowered = rel.lower()
            if any(hint in lowered for hint in LOGO_HINTS):
                continue
            if os.path.getsize(abs_path) < MIN_BYTES:
                continue

            class_match = CLASS_ATTR.search(tag)
            classes = (class_match.group(1) if class_match else '').lower()
            # Include the enclosing markup: builder heroes carry their
            # full-bleed class on a parent div, not on the <img>.
            context = masked[max(0, match.start() - CONTEXT_CHARS):
                             match.start()].lower()
            full_bleed = any(h in classes or h in lowered or h in context
                             for h in FULL_BLEED_HINTS)

            role = 'below'
            if 'loading="lazy"' not in tag and not first_eager_done:
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

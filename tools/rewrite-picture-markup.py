#!/usr/bin/env python3
"""tools/rewrite-picture-markup.py — rewrites the <img> tags named in
tools/responsive-manifest.tsv into <picture> blocks.

Usage:  python3 tools/rewrite-picture-markup.py [--dry-run]

Emits the shape the projects hub already ships: an AVIF <source> plus a JPEG
fallback on the <img>, both carrying srcset/sizes. No WebP — AVIF is Baseline
and JPEG covers the rest, so a third format would add encodes for no
reachable browser.

Idempotent: an <img> already inside a <picture> is skipped, so re-running
after adding a page is safe.

Managed attributes (srcset, sizes, width, height, loading, decoding,
fetchpriority) are stripped and re-emitted. Everything else on the tag —
class, id, alt, the builder's data-v-* scoping attributes — is preserved
byte-for-byte. Alt text in particular is customer content and is never
touched.

Wrapping is safe here because no CSS selector targets img as a direct child
(all are descendant selectors like `.as-card__shot img`), and no JavaScript
queries images at all. Both were verified before this script was written.
"""
import os
import re
import sys

IMG_TAG = re.compile(r'<img\b[^>]*>')
PICTURE = re.compile(r'<picture>.*?</picture>', re.S)
SRC_ATTR = re.compile(r'\bsrc="(/assets/img/[^"]+)"')
MANAGED = re.compile(
    r'\s+(?:width|height|loading|decoding|fetchpriority|srcset|sizes)="[^"]*"')
MANIFEST = 'tools/responsive-manifest.tsv'
RESP = '/assets/img/v3/resp'


def repo_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def rows(root):
    with open(os.path.join(root, MANIFEST), encoding='utf-8') as handle:
        header = handle.readline().rstrip('\n').split('\t')
        for line in handle:
            if line.strip():
                yield dict(zip(header, line.rstrip('\n').split('\t')))


def srcset(stem, widths, ext):
    return ', '.join('%s/%s-%d.%s %dw' % (RESP, stem, w, ext, w)
                     for w in widths)


def build(tag, row, dims):
    widths = [int(w) for w in row['widths'].split(',')]
    largest = widths[-1]
    sizes = row['sizes']
    width, height = dims

    inner = MANAGED.sub('', tag)
    inner = SRC_ATTR.sub(
        lambda m: 'src="%s/%s-%d.jpg"' % (RESP, row['stem'], largest), inner)

    extras = [
        'srcset="%s"' % srcset(row['stem'], widths, 'jpg'),
        'sizes="%s"' % sizes,
        'width="%d"' % width,
        'height="%d"' % height,
        'decoding="async"',
        'fetchpriority="high"' if row['role'] == 'lcp' else 'loading="lazy"',
    ]

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
        by_page.setdefault(row['page'], {})[row['src']] = row

    total = skipped = 0
    for page, wanted in sorted(by_page.items()):
        path = os.path.join(root, page)
        with open(path, encoding='utf-8') as handle:
            html = handle.read()

        spans = [m.span() for m in PICTURE.finditer(html)]

        def inside_picture(pos):
            return any(a <= pos < b for a, b in spans)

        out = []
        last = 0
        changed = 0
        for match in IMG_TAG.finditer(html):
            if inside_picture(match.start()):
                skipped += 1
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
            print('%-56s %3d images' % (page, changed))
            total += changed

    print('\n%s %d <img> tags (%d already inside <picture>, left alone)'
          % ('would rewrite' if dry else 'rewrote', total, skipped))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

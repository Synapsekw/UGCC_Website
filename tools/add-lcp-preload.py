#!/usr/bin/env python3
"""tools/add-lcp-preload.py — inserts a <link rel="preload" as="image"> for
each page's LCP image, immediately before </head>.

Usage:  python3 tools/add-lcp-preload.py [--dry-run] [--remove]

fetchpriority alone still waits for the parser to reach the <img>. The preload
starts the fetch while the head is still being parsed, which is the largest
single LCP lever left once the format work is done.

imagesrcset and imagesizes mirror the <picture>'s AVIF <source> exactly, and
type="image/avif" scopes the preload to that candidate. If any of the three
drifts from the markup the browser downloads a file it never uses and logs
"preloaded using link preload but not used" — so the check after running this
is the console, not the HTML.

Idempotent: a page that already carries an image preload is left alone.
"""
import os
import re
import sys

MARKER = 'rel="preload" as="image"'
MANIFEST = 'tools/responsive-manifest.tsv'
RESP = '/assets/img/v3/resp'
PRELOAD_TAG = re.compile(r'<link rel="preload" as="image"[^>]*>')


def repo_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def rows(root):
    with open(os.path.join(root, MANIFEST), encoding='utf-8') as handle:
        header = handle.readline().rstrip('\n').split('\t')
        for line in handle:
            if line.strip():
                yield dict(zip(header, line.rstrip('\n').split('\t')))


def main():
    dry = '--dry-run' in sys.argv
    remove = '--remove' in sys.argv
    root = repo_root()

    if remove:
        removed = 0
        for row in rows(root):
            path = os.path.join(root, row['page'])
            with open(path, encoding='utf-8') as handle:
                html = handle.read()
            stripped, n = PRELOAD_TAG.subn('', html)
            if n and not dry:
                with open(path, 'w', encoding='utf-8') as handle:
                    handle.write(stripped)
            removed += n
        print('removed %d preload tags' % removed)
        return 0

    added = skipped = 0
    for row in rows(root):
        if row['role'] != 'lcp':
            continue
        path = os.path.join(root, row['page'])
        with open(path, encoding='utf-8') as handle:
            html = handle.read()
        if MARKER in html:
            skipped += 1
            continue

        widths = [int(w) for w in row['widths'].split(',')]
        srcset = ', '.join('%s/%s-%d.avif %dw' % (RESP, row['stem'], w, w)
                           for w in widths)
        link = ('<link rel="preload" as="image" type="image/avif" '
                'imagesrcset="%s" imagesizes="%s">' % (srcset, row['sizes']))

        # Sanity: the preload must name candidates the page actually offers.
        # A mismatch here is what causes a wasted double download.
        if ('%s/%s-%d.avif' % (RESP, row['stem'], widths[-1])) not in html:
            print('  SKIP %s: page does not reference %s'
                  % (row['page'], row['stem']))
            continue

        if not dry:
            with open(path, 'w', encoding='utf-8') as handle:
                handle.write(html.replace('</head>', link + '</head>', 1))
        print('%-56s %s' % (row['page'], row['stem'][:38]))
        added += 1

    print('\n%s %d preloads (%d already present)'
          % ('would add' if dry else 'added', added, skipped))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

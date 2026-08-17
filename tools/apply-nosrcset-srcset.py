#!/usr/bin/env python3
"""tools/apply-nosrcset-srcset.py — adds srcset/sizes to the <img> that had
none, and mirrors the same ladder into their AVIF <source>.

Usage:  python3 tools/apply-nosrcset-srcset.py [--dry-run]

Reads tools/nosrcset-plan.json (written by make-nosrcset-responsive.py). Only
touches an <img> that still has no srcset, so it is idempotent and cannot
disturb the builder's own responsive images.

The <img> keeps its original src as the fallback for browsers that ignore
srcset; the JPEG ladder goes in its srcset, and the AVIF ladder replaces the
single-candidate <source> the earlier pass emitted.
"""
import json, os, re, sys

RESP = '/assets/img/v2/resp'
SKIP_DIRS = {'node_modules', '.git', '.claude', 'assets', 'tools', 'tests', 'docs', 'netlify'}


def stem(rel):
    return rel[len('assets/img/'):].replace('/', '__').rsplit('.', 1)[0]


def ladder(rel, widths, ext):
    return ', '.join('%s/%s-%d.%s %dw' % (RESP, stem(rel), w, ext, w) for w in widths)


def main():
    dry = '--dry-run' in sys.argv
    plan = json.load(open('tools/nosrcset-plan.json'))
    by_src = {'/' + k: v for k, v in plan.items()}
    imgs = pages = 0

    for dirpath, dirnames, filenames in os.walk('.'):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        if 'index.html' not in filenames:
            continue
        path = os.path.join(dirpath, 'index.html')
        html = open(path, encoding='utf-8').read()
        orig = html
        out, last, n = [], 0, 0

        for m in re.finditer(r'<picture>.*?</picture>', html, re.S):
            block = m.group(0)
            im = re.search(r'<img\b[^>]*>', block)
            if not im:
                continue
            tag = im.group(0)
            if re.search(r'\bsrcset=', tag):        # builder image, or already done
                continue
            s = re.search(r'\bsrc="(/assets/img/[^"]+)"', tag)
            if not s or s.group(1) not in by_src:
                continue
            info = by_src[s.group(1)]
            rel = s.group(1).lstrip('/')
            widths, sizes = info['widths'], info['sizes']

            new_tag = tag[:-1].rstrip() + ' srcset="%s" sizes="%s">' % (
                ladder(rel, widths, 'jpg'), sizes)
            new_block = block.replace(tag, new_tag, 1)
            new_block = re.sub(
                r'(<source type="image/avif")[^>]*>',
                lambda mm: '%s srcset="%s" sizes="%s">' % (
                    mm.group(1), ladder(rel, widths, 'avif'), sizes),
                new_block, count=1)

            out.append(html[last:m.start()])
            out.append(new_block)
            last = m.end()
            n += 1

        if n:
            out.append(html[last:])
            html = ''.join(out)
            if not dry:
                open(path, 'w', encoding='utf-8').write(html)
            imgs += n
            pages += 1

    print('%s srcset on %d <img> across %d pages' % ('would add' if dry else 'added', imgs, pages))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

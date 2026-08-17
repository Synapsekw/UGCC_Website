#!/usr/bin/env python3
"""tools/rewrite-picture-avif.py — wraps each <img> in a <picture> carrying an
AVIF <source>, leaving the <img> itself as the untouched fallback.

Usage:  python3 tools/rewrite-picture-avif.py [--dry-run]

Deliberately conservative, and different from the V3 rewriter. The <img> keeps
its own src, srcset and sizes exactly as the builder emitted them; the AVIF
<source> mirrors that srcset one-for-one, swapping each URL for its twin and
keeping the same w descriptor. Responsive selection therefore cannot change —
only the format the browser prefers.

Only added to the <img>: width/height when absent (CLS), decoding="async",
and loading="lazy" or fetchpriority="high" for the page's first eager image.
Nothing is removed. alt is never touched.

A candidate URL with no twin on disk is left as-is in the AVIF srcset's place —
i.e. that entry is dropped — so a partially-converted set degrades to fewer
AVIF candidates rather than a broken reference.
"""
import os, re, sys

OUT_DIR = 'assets/img/v2/avif'
SKIP_DIRS = {'node_modules', '.git', '.claude', 'assets', 'tools', 'tests', 'docs', 'netlify'}
IMG = re.compile(r'<img\b[^>]*>')
PICTURE = re.compile(r'<picture>.*?</picture>', re.S)


def twin(url):
    rel = url.lstrip('/')
    if not rel.startswith('assets/img/'):
        return None
    name = rel[len('assets/img/'):].replace('/', '__').rsplit('.', 1)[0] + '.avif'
    p = os.path.join(OUT_DIR, name)
    return '/' + p if os.path.exists(p) else None


def avif_srcset(tag):
    """Mirror the <img>'s srcset (or bare src) into AVIF twins, same descriptors."""
    m = re.search(r'\bsrcset="([^"]+)"', tag)
    if m:
        out = []
        for part in m.group(1).split(','):
            bits = part.strip().split()
            if not bits:
                continue
            t = twin(bits[0])
            if t:
                out.append(t + (' ' + ' '.join(bits[1:]) if len(bits) > 1 else ''))
        return ', '.join(out)
    s = re.search(r'\bsrc="(/assets/img/[^"]+)"', tag)
    if s:
        t = twin(s.group(1))
        return t or ''
    return ''


def main():
    dry = '--dry-run' in sys.argv
    from PIL import Image
    total = pages_done = 0

    for dirpath, dirnames, filenames in os.walk('.'):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        if 'index.html' not in filenames:
            continue
        path = os.path.join(dirpath, 'index.html')
        html = open(path, encoding='utf-8').read()
        spans = [m.span() for m in PICTURE.finditer(html)]
        inside = lambda i: any(a <= i < b for a, b in spans)

        out, last, changed, first_eager = [], 0, 0, True
        for m in IMG.finditer(html):
            if inside(m.start()):
                continue
            tag = m.group(0)
            ss = avif_srcset(tag)
            if not ss:
                continue

            new = tag
            # width/height from the file itself when the builder omitted them
            if not (re.search(r'\bwidth="', new) and re.search(r'\bheight="', new)):
                s = re.search(r'\bsrc="(/assets/img/[^"]+)"', new)
                if s and os.path.exists(s.group(1).lstrip('/')):
                    try:
                        with Image.open(s.group(1).lstrip('/')) as im:
                            w, h = im.size
                        new = re.sub(r'\s*\bwidth="[^"]*"', '', new)
                        new = re.sub(r'\s*\bheight="[^"]*"', '', new)
                        new = new[:-1].rstrip() + ' width="%d" height="%d">' % (w, h)
                    except Exception:
                        pass
            if 'decoding=' not in new:
                new = new[:-1].rstrip() + ' decoding="async">'
            is_lazy = 'loading="lazy"' in new
            if not is_lazy and first_eager and 'fetchpriority' not in new:
                new = new[:-1].rstrip() + ' fetchpriority="high">'
                first_eager = False
            elif is_lazy:
                pass

            sizes = re.search(r'\bsizes="([^"]*)"', tag)
            src_el = '<source type="image/avif" srcset="%s"%s>' % (
                ss, ' sizes="%s"' % sizes.group(1) if sizes else '')
            out.append(html[last:m.start()])
            out.append('<picture>' + src_el + new + '</picture>')
            last = m.end()
            changed += 1

        if changed:
            out.append(html[last:])
            if not dry:
                open(path, 'w', encoding='utf-8').write(''.join(out))
            total += changed
            pages_done += 1

    print('%s %d <img> across %d pages' % ('would wrap' if dry else 'wrapped', total, pages_done))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

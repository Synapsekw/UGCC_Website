#!/usr/bin/env python3
"""tools/refresh-avif-srcset.py — recomputes each <picture>'s AVIF srcset from
its sibling <img>, so the two ladders line up.

Usage:  python3 tools/refresh-avif-srcset.py [--dry-run]

Why this exists. make-avif-twins.py originally skipped sources under 20KB, on
the theory that AVIF could not beat the request overhead. For a standalone
image that is true. For a member of a srcset it is not: the small variants ARE
the mobile candidates, and skipping them left the AVIF ladder starting at 469w
or 720w while the JPEG ladder started at 360w. A phone then picked a ~50KB
AVIF over a 20KB JPEG — 302 <picture> were measurably WORSE on mobile.

Threshold lowered to 4KB and the missing twins generated; this pass rewrites
the <source> srcsets to include them.

Skips any <picture> whose <img> srcset points at assets/img/v2/resp/ — those
are the no-srcset images given a purpose-built ladder, and their AVIF entries
are already correct.
"""
import os, re, sys

OUT_DIR = 'assets/img/v2/avif'
SKIP_DIRS = {'node_modules', '.git', '.claude', 'assets', 'tools', 'tests', 'docs', 'netlify'}


def twin(url):
    rel = url.lstrip('/')
    if not rel.startswith('assets/img/'):
        return None
    name = rel[len('assets/img/'):].replace('/', '__').rsplit('.', 1)[0] + '.avif'
    p = os.path.join(OUT_DIR, name)
    return '/' + p if os.path.exists(p) else None


def main():
    dry = '--dry-run' in sys.argv
    changed = pages = 0
    for dirpath, dirnames, filenames in os.walk('.'):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        if 'index.html' not in filenames:
            continue
        path = os.path.join(dirpath, 'index.html')
        html = open(path, encoding='utf-8').read()
        n = 0

        def fix(m):
            nonlocal n
            block = m.group(0)
            im = re.search(r'<img\b[^>]*>', block)
            so = re.search(r'<source[^>]*type="image/avif"[^>]*>', block)
            if not im or not so:
                return block
            iss = re.search(r'\bsrcset="([^"]+)"', im.group(0))
            if not iss or '/v2/resp/' in iss.group(1):
                return block                      # purpose-built ladder, leave alone
            entries = []
            for part in iss.group(1).split(','):
                bits = part.strip().split()
                if not bits:
                    continue
                t = twin(bits[0])
                if t:
                    entries.append(t + (' ' + ' '.join(bits[1:]) if len(bits) > 1 else ''))
            if not entries:
                return block
            new_ss = ', '.join(entries)
            cur = re.search(r'\bsrcset="([^"]+)"', so.group(0))
            if cur and cur.group(1) == new_ss:
                return block
            n += 1
            new_so = re.sub(r'\bsrcset="[^"]+"', 'srcset="%s"' % new_ss, so.group(0), count=1)
            return block.replace(so.group(0), new_so, 1)

        out = re.sub(r'<picture>.*?</picture>', fix, html, flags=re.S)
        if n:
            if not dry:
                open(path, 'w', encoding='utf-8').write(out)
            changed += n
            pages += 1
    print('%s %d <picture> AVIF srcsets across %d pages'
          % ('would refresh' if dry else 'refreshed', changed, pages))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

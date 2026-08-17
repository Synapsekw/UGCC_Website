#!/usr/bin/env python3
"""tools/make-nosrcset-responsive.py — gives responsive widths to the <img>
that have no srcset at all.

Usage:  python3 tools/make-nosrcset-responsive.py [--dry-run]

Most images on this site already carry a builder srcset, and those are left
strictly alone — see tools/rewrite-picture-avif.py for why. But 210 <img>
(66 distinct files, 25.7 MB) have NO srcset whatsoever, so every phone
downloads them at full resolution. v2/card-kp3.jpg is 674KB filling a 400px
slot, eight times over; v2/kp3-1.jpg fills an 84px slot at 1920px wide.

Adding widths here cannot regress anything, because there is no existing
ladder to regress. That is the whole reason this is safe where re-laddering
the builder images would not be.

Widths are derived from MEASURED rendered sizes (tools/measured-widths.json,
captured in-browser at 1280px and 390px), not guessed: each image gets its 1x
and 2x width at both breakpoints, capped at the source width and at 1920.
sizes is emitted from the same measurements — 100vw for anything rendering at
viewport width, otherwise the explicit measured px per breakpoint.
"""
import json, os, re, sys
from concurrent.futures import ProcessPoolExecutor

AVIF_Q, JPEG_Q = 60, 82
OUT = 'assets/img/v2/resp'
SKIP_DIRS = {'node_modules', '.git', '.claude', 'assets', 'tools', 'tests', 'docs', 'netlify'}
MEAS = 'tools/measured-widths.json'


def stem(rel):
    return rel[len('assets/img/'):].replace('/', '__').rsplit('.', 1)[0]


def plan(meas):
    from PIL import Image
    out = {}
    for rel_short, (d, m) in meas.items():
        rel = 'assets/img/' + rel_short
        if not os.path.exists(rel):
            continue
        with Image.open(rel) as im:
            sw = im.size[0]
        cap = min(sw, 1920)
        want = set()
        for base in (d, m):
            if not base:
                continue
            for mult in (1, 2):
                w = min(int(base * mult), cap)
                if w >= 120:
                    want.add(w)
        want = sorted(want)
        if not want or (len(want) == 1 and want[0] >= sw * 0.95):
            continue                      # nothing narrower worth shipping
        full = d and d >= 1270            # rendered at viewport width
        if full:
            sizes = '100vw'
        elif m:
            sizes = '(max-width:600px) %dpx, %dpx' % (m, d)
        else:
            sizes = '%dpx' % d
        out[rel] = {'widths': want, 'sizes': sizes, 'src_w': sw}
    return out


def encode(job):
    from PIL import Image
    rel, widths = job
    made = 0
    with Image.open(rel) as im:
        im = im.convert('RGB')
        for w in widths:
            for ext, fmt, kw in (('avif', 'AVIF', {'quality': AVIF_Q}),
                                 ('jpg', 'JPEG', {'quality': JPEG_Q, 'optimize': True,
                                                  'progressive': True})):
                dst = os.path.join(OUT, '%s-%d.%s' % (stem(rel), w, ext))
                if os.path.exists(dst):
                    continue
                r = im.copy()
                r.thumbnail((w, 10 ** 6), Image.LANCZOS)   # never upscales
                r.save(dst, fmt, **kw)
                made += 1
    return made


def main():
    dry = '--dry-run' in sys.argv
    os.makedirs(OUT, exist_ok=True)
    meas = json.load(open(MEAS))
    p = plan(meas)
    print('files needing narrower widths: %d' % len(p))
    biggest = sorted(p.items(), key=lambda kv: -os.path.getsize(kv[0]))[:6]
    for rel, info in biggest:
        print('   %7.0f KB %5dpx src -> %-22s %s' % (
            os.path.getsize(rel) / 1024, info['src_w'],
            ','.join(str(w) for w in info['widths']), os.path.basename(rel)[:34]))
    if dry:
        json.dump({k: v for k, v in p.items()}, open('/tmp/nosrcset-plan.json', 'w'))
        print('\n(dry run)')
        return 0

    made = 0
    with ProcessPoolExecutor() as pool:
        for n in pool.map(encode, [(r, i['widths']) for r, i in p.items()]):
            made += n
    print('derivatives written: %d' % made)
    json.dump(p, open('tools/nosrcset-plan.json', 'w'), indent=1)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

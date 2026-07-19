#!/usr/bin/env python3
"""Generate the inline SVG map for the homepage offices block (#zrby1M).

BUILD TIME ONLY. Nothing here runs in a browser. Re-run this by hand when the
office list, the window, or the styling tiers change, then paste the contents
of tools/generated/office-map.svg into index.html (see the offices plan,
Task 4). The site itself stays buildless.

    python3 tools/make-office-map.py

Data: Natural Earth, public domain. From its LICENSE.md: "All versions of
Natural Earth raster + vector map data found on this website are in the public
domain... renounce all financial claim to the maps and invites you to use them
for personal, educational, and commercial purposes." No attribution required.

Resolution is mixed on purpose. The six UGCC countries come from 1:50m; every
other country from 1:110m. At 110m Kuwait simplifies to a 9-point smudge, which
is unacceptable for the head office; at 50m it is 67 points and correctly
shaped. Bytes are spent only where the eye goes.

Output is deterministic: same inputs produce a byte-identical SVG, so a diff on
tools/generated/office-map.svg is meaningful.
"""

import json
import math
import os
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.ne-cache')
OUT = os.path.join(HERE, 'generated', 'office-map.svg')

SOURCES = {
    '50m': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson',
    '110m': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',
}

# Equirectangular window. Chosen to hold all six countries: Malawi at -13.9
# sets the southern bound, India's east coast the eastern one.
WIN = dict(lon0=26.0, lon1=95.0, lat0=41.0, lat1=-19.0)
W = 100.0
H = round(W * (WIN['lat0'] - WIN['lat1']) / (WIN['lon1'] - WIN['lon0']), 1)

OFFICES = ['Kuwait', 'Saudi Arabia', 'Oman']
OPERATIONS = ['Iraq', 'India', 'Malawi']
HIGHLIGHT = OFFICES + OPERATIONS

# (label, longitude, latitude, label dx, label dy) for the three office cities.
PINS = [
    ('Kuwait City', 47.98, 29.37, 3.2, -1.4),
    ('Riyadh', 46.72, 24.69, 3.2, 1.0),
    ('Muscat', 58.41, 23.59, 3.2, 1.0),
]


def fetch(key):
    """Download a Natural Earth file once and cache it next to this script."""
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, 'ne_%s.geojson' % key)
    if not os.path.exists(path):
        print('downloading %s ...' % key)
        with urllib.request.urlopen(SOURCES[key], timeout=180) as r:
            data = r.read()
        with open(path, 'wb') as f:
            f.write(data)
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def proj(lon, lat):
    return ((lon - WIN['lon0']) / (WIN['lon1'] - WIN['lon0']) * W,
            (WIN['lat0'] - lat) / (WIN['lat0'] - WIN['lat1']) * H)


def clip(poly, xmin, ymin, xmax, ymax):
    """Sutherland-Hodgman clip to the frame.

    Without this, China and Russia carry their full outlines into the file for
    the sake of a sliver in frame. Clipping cut the context tier by roughly 60%.
    """
    def half(pts, inside, inter):
        if not pts:
            return []
        out, prev = [], pts[-1]
        for cur in pts:
            ci, pi = inside(cur), inside(prev)
            if ci:
                if not pi:
                    out.append(inter(prev, cur))
                out.append(cur)
            elif pi:
                out.append(inter(prev, cur))
            prev = cur
        return out

    def ix(p, q, x):
        return (x, p[1] + (x - p[0]) / (q[0] - p[0]) * (q[1] - p[1]))

    def iy(p, q, y):
        return (p[0] + (y - p[1]) / (q[1] - p[1]) * (q[0] - p[0]), y)

    poly = half(poly, lambda p: p[0] >= xmin, lambda p, q: ix(p, q, xmin))
    poly = half(poly, lambda p: p[0] <= xmax, lambda p, q: ix(p, q, xmax))
    poly = half(poly, lambda p: p[1] >= ymin, lambda p, q: iy(p, q, ymin))
    poly = half(poly, lambda p: p[1] <= ymax, lambda p, q: iy(p, q, ymax))
    return poly


def rdp(pts, eps):
    """Douglas-Peucker. Iterative stack, not recursion: some rings are long
    enough to blow the default recursion limit."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        lo, hi = stack.pop()
        if hi <= lo + 1:
            continue
        ax, ay = pts[lo]
        bx, by = pts[hi]
        dx, dy = bx - ax, by - ay
        den = math.hypot(dx, dy)
        dmax, idx = 0.0, lo
        for i in range(lo + 1, hi):
            px, py = pts[i]
            d = (abs(dy * px - dx * py + bx * ay - by * ax) / den) if den else math.hypot(px - ax, py - ay)
            if d > dmax:
                dmax, idx = d, i
        if dmax > eps:
            keep[idx] = True
            stack.append((lo, idx))
            stack.append((idx, hi))
    return [p for p, k in zip(pts, keep) if k]


def rings(geom):
    t, c = geom['type'], geom['coordinates']
    if t == 'Polygon':
        return c
    if t == 'MultiPolygon':
        return [r for poly in c for r in poly]
    return []


def area(pts):
    return abs(sum(pts[i][0] * pts[i - 1][1] - pts[i - 1][0] * pts[i][1]
                   for i in range(len(pts)))) / 2


def build_path(feature, eps, min_area, precision):
    """All of one country's rings concatenated into a single `d` string.

    One <path> per country is a contract the harness checks: islands and
    exclaves are extra M...Z subpaths inside this string, never extra elements.
    """
    parts = []
    for ring in rings(feature['geometry']):
        pts = clip([proj(x, y) for x, y in ring], -0.4, -0.4, W + 0.4, H + 0.4)
        if len(pts) < 3:
            continue
        pts = rdp(pts, eps)
        if len(pts) < 4 or area(pts) < min_area:
            continue
        fmt = '%%.%df,%%.%df' % (precision, precision)
        parts.append('M' + ' '.join(fmt % (x, y) for x, y in pts) + 'Z')
    return ''.join(parts)


def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def main():
    fine = {f['properties']['NAME']: f for f in fetch('50m')['features']}
    coarse = fetch('110m')['features']

    missing = [n for n in HIGHLIGHT if n not in fine]
    if missing:
        raise SystemExit('Natural Earth 50m is missing: %s' % ', '.join(missing))

    office_paths = [build_path(fine[n], 0.035, 0.01, 2) for n in OFFICES]
    op_paths = [build_path(fine[n], 0.035, 0.01, 2) for n in OPERATIONS]

    context = []
    for f in coarse:
        if f['properties']['NAME'] in HIGHLIGHT:
            continue
        d = build_path(f, 0.22, 0.45, 1)
        if d:
            context.append(d)

    for name, paths in (('office', office_paths), ('operations', op_paths)):
        empty = [i for i, p in enumerate(paths) if not p]
        if empty:
            raise SystemExit('%s tier produced an empty path at index %s' % (name, empty))

    title = (
        'Map of the Middle East, Africa and South Asia. UGCC offices in '
        + ', '.join(OFFICES)
        + '; project operations in '
        + ', '.join(OPERATIONS)
        + '.'
    )

    out = []
    out.append('<svg class="off__map" viewBox="0 0 %d %s" role="img" aria-labelledby="off-map-title">' % (W, H))
    out.append('<title id="off-map-title">%s</title>' % esc(title))
    out.append('<g class="off__map-ctx">' + ''.join('<path d="%s"/>' % d for d in context) + '</g>')
    out.append('<g class="off__map-op">' + ''.join('<path d="%s"/>' % d for d in op_paths) + '</g>')
    out.append('<g class="off__map-hq">' + ''.join('<path d="%s"/>' % d for d in office_paths) + '</g>')

    pins = []
    for label, lon, lat, dx, dy in PINS:
        x, y = proj(lon, lat)
        pins.append('<circle class="off__halo" cx="%.1f" cy="%.1f" r="2.6"/>' % (x, y))
        pins.append('<circle class="off__pin" cx="%.1f" cy="%.1f" r="0.9"/>' % (x, y))
        pins.append('<text class="off__map-label" x="%.1f" y="%.1f">%s</text>' % (x + dx, y + dy, esc(label)))
    out.append('<g class="off__map-pins">' + ''.join(pins) + '</g>')
    out.append('</svg>')

    svg = ''.join(out)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(svg + '\n')

    print('wrote %s' % OUT)
    print('  viewBox 0 0 %d %s' % (W, H))
    print('  %d office paths, %d operations paths, %d context paths, %d pins'
          % (len(office_paths), len(op_paths), len(context), len(PINS)))
    print('  %d bytes (%.1f KB)' % (len(svg), len(svg) / 1024))


if __name__ == '__main__':
    main()

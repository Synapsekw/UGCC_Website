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

Every country comes from 1:50m. What is mixed is the SIMPLIFICATION, not the
source: the six UGCC countries are simplified at eps 0.035, the context tier at
eps 0.22. Bytes are spent only where the eye goes -- at 110m Kuwait collapses to
a 9-point smudge, unacceptable for the head office, where at 50m it is 67 points
and correctly shaped.

Do not "optimise" the context tier back to 1:110m to save ~2.2 KB. Shared
borders drawn from different source resolutions do not coincide, and the tiers
are painted ctx -> op -> hq, so wherever the highlight polygon was the smaller
of the two a background-coloured sliver opened along the border -- up to 7.9 CSS
px on the desktop render. Moving context to 1:50m collapsed the Indo-Pak border
vertices sitting more than 0.2 units from their neighbour from 34.2% to 5.2%
(Bhutan and Myanmar to 0.0%). Tightening eps does not substitute for this: at
1:110m, eps 0.035 measured no better than eps 0.22 (22.6% vs 22.1%), because the
source resolution, not the simplification, is the floor.

Task 3's CSS closes what is left by stroking each tier in its own fill colour.
Keep that stroke at 0.2 units and never past 0.3: covering the residue needs
~0.9, which visibly bloats coastlines -- the Gulf fills in, Bahrain and Qatar
lose their shape, Musandam merges toward the mainland. If seams reappear, the
answer is source resolution, not a thicker stroke.

Output is deterministic: same inputs produce a byte-identical SVG, so a diff on
tools/generated/office-map.svg is meaningful.
"""

import hashlib
import json
import math
import os
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.ne-cache')
OUT = os.path.join(HERE, 'generated', 'office-map.svg')

# Pinned to a release tag, not `master`. The determinism promise above is only
# true if the inputs cannot move: on `master` an upstream edit would silently
# rewrite the checked-in SVG and turn its diff into noise. The digests are
# verified after download, so a moved tag or a corrupted transfer fails loudly
# instead of producing a plausible-looking map.
NE_VERSION = 'v5.1.2'
BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/%s/geojson/' % NE_VERSION

SOURCES = {
    '50m': (BASE + 'ne_50m_admin_0_countries.geojson',
            '3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb'),
}

# ---------------------------------------------------------------------------
# The window, and why it is this shape.
#
# The register column beside the map is portrait; a map holding Iraq, the Gulf,
# India and Malawi is landscape. The previous window (26..95E by 41N..19S,
# viewBox 100x87) therefore ended ~204 CSS px above the bottom of the register
# at 1280px and left a slab of bare navy there. It also clipped India: the
# 1:50m outline reaches 97.344E and the frame stopped at 95.0.
#
# Measured bounding box of the six countries, from the 1:50m data itself:
#     lon  32.670E .. 97.344E   (span 64.674)
#     lat  17.131S .. 37.372N   (span 54.503)
#
# The map panel now stretches to the register's height (offices.css), so the
# window has to be cut to the aspect ratio the layout hands it. Measured:
#     viewport 1280  -> svg content box 630.7 x 717.8  ->  h/w 1.1381
#     viewport >=1288 -> 635.1 x 717.8                 ->  h/w 1.1302
# Split the difference at 1.134 and the letterbox is under 3 px at both.
#
#     lon span 73.20  (28.4E .. 101.6E)   margins  4.27 W,  4.26 E
#     lat span 83.00  (54.4N .. 28.6S)    margins 17.03 N, 11.47 S
#     viewBox height = 100 * 83.00 / 73.20 = 113.4
#
# The extra latitude is biased north 17:11 because north of the six is land --
# Turkey, the Caucasus, the Caspian, Kazakhstan -- while south of about 30S
# there is nothing but Southern Ocean. Longitude is only widened enough to
# clear India and Malawi with a margin; the horizontal scale is essentially
# unchanged from the old window (8.62 px/deg vs 8.58), so nothing shrank. The
# panel grew from 594x517 to 633x720.
#
# THE SVG IS RENDERED WITH preserveAspectRatio="xMidYMid meet", NOT "slice".
# This is not a preference, it is forced. Between 921px (the narrowest
# two-column viewport) and the 1224px cap, the column aspect ratio runs
# 1.1302 to 1.7021, because the register grows taller as it narrows while the
# map grows narrower. For `slice` to keep the six countries on screen at both
# ends, the window's latitude span must be at least
#     (64.674 + margin) * 1.7021  =  123.7 degrees
# regardless of what aspect ratio you pick -- i.e. roughly 72N to 52S, Arctic
# pack ice to the Southern Ocean. That is far worse than the gap being fixed,
# so `meet` it is. `meet` letterboxes instead of cropping, and the bands are
# invisible because .off__map's background is the same #001b2a the sea is
# drawn in: they read as more ocean, not as empty layout.
#
# If you re-tighten this window, re-check it against the six-country bbox
# above. Nothing in the harness will catch a crop.
# ---------------------------------------------------------------------------
WIN = dict(lon0=28.4, lon1=101.6, lat0=54.4, lat1=-28.6)
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
    """Download a Natural Earth file once and cache it next to this script.

    The download lands on a `.part` file and is renamed into place only after
    its SHA-256 matches: writing straight to the cache path means an
    interrupted download leaves a truncated file that every later run happily
    reuses.
    """
    url, want = SOURCES[key]
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, 'ne_%s.geojson' % key)
    if not os.path.exists(path):
        print('downloading %s ...' % key)
        try:
            with urllib.request.urlopen(url, timeout=180) as r:
                data = r.read()
        except (urllib.error.HTTPError, urllib.error.URLError, OSError) as e:
            raise SystemExit('cannot fetch %s from %s: %s' % (key, url, e))
        got = hashlib.sha256(data).hexdigest()
        if got != want:
            raise SystemExit(
                'checksum mismatch for %s (%s)\n  expected %s\n  got      %s'
                % (key, url, want, got))
        tmp = path + '.part'
        with open(tmp, 'wb') as f:
            f.write(data)
        os.replace(tmp, path)
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
    return (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
             .replace('"', '&quot;'))


def main():
    # One source file for every tier -- see the note on seams in the module
    # docstring. Iterate the feature list, not the dict, so the context order is
    # the file's order and the output stays byte-stable.
    features = fetch('50m')['features']
    by_name = {f['properties']['NAME']: f for f in features}

    missing = [n for n in HIGHLIGHT if n not in by_name]
    if missing:
        raise SystemExit('Natural Earth 50m is missing: %s' % ', '.join(missing))

    # The six must sit INSIDE the window with a real margin, measured against
    # the source coordinates rather than eyeballed on the render. The old
    # window failed this: it stopped at 95.0E and India reaches 97.344E, so
    # Arunachal and Nagaland were cut off and nothing noticed for four tasks.
    # 2 degrees is about 17 CSS px at the desktop scale -- enough that a
    # country cannot appear welded to the frame edge.
    margin = 2.0
    tight = []
    for n in HIGHLIGHT:
        xs = [x for r in rings(by_name[n]['geometry']) for x, _ in r]
        ys = [y for r in rings(by_name[n]['geometry']) for _, y in r]
        for side, slack in (('west', min(xs) - WIN['lon0']),
                            ('east', WIN['lon1'] - max(xs)),
                            ('north', WIN['lat0'] - max(ys)),
                            ('south', min(ys) - WIN['lat1'])):
            if slack < margin:
                tight.append('%s %s edge: %.3f deg of margin' % (n, side, slack))
    if tight:
        raise SystemExit('window does not clear the six countries by %.1f deg:\n  %s'
                         % (margin, '\n  '.join(tight)))

    office_paths = [build_path(by_name[n], 0.035, 0.01, 2) for n in OFFICES]
    op_paths = [build_path(by_name[n], 0.035, 0.01, 2) for n in OPERATIONS]

    # 1:50m carries a few polygons 1:110m does not, so the context tier is 49
    # rather than 48. The extra one is Siachen Glacier. That is intentional and
    # settled: the site keeps Natural Earth's de-facto boundary treatment for
    # India, and this tier draws no internal borders at all (Task 3 strokes each
    # country in its own fill colour), so Siachen renders as undifferentiated
    # background land like every other context country. Nothing to special-case.
    context = []
    excluded = set()
    for f in features:
        name = f['properties']['NAME']
        if name in HIGHLIGHT:
            excluded.add(name)
            continue
        d = build_path(f, 0.22, 0.45, 1)
        if d:
            context.append(d)

    # Redundant while every tier reads one file -- the `missing` check above
    # already proves the six are present. Kept because it costs nothing and
    # re-arms the moment anyone points a tier at a second file, where a NAME
    # spelled differently between resolutions would draw a country twice, once
    # in context and once in its own tier, with the only symptom a context count
    # quietly off by one.
    if len(excluded) != len(HIGHLIGHT):
        raise SystemExit(
            'context loop excluded %d of %d highlight countries; not matched by NAME: %s'
            % (len(excluded), len(HIGHLIGHT),
               ', '.join(sorted(set(HIGHLIGHT) - excluded))))

    for name, paths in (('office', office_paths), ('operations', op_paths)):
        empty = [i for i, p in enumerate(paths) if not p]
        if empty:
            raise SystemExit('%s tier produced an empty path at index %s' % (name, empty))

    # Fail here rather than in a browser: the harness asserts ctx > 20, and a
    # shrunken context tier otherwise writes a perfectly valid-looking SVG.
    if len(context) < 21:
        raise SystemExit('context tier has only %d paths; harness check 7 needs >20' % len(context))

    title = (
        'Map of the Middle East, Africa and South Asia. UGCC offices in '
        + ', '.join(OFFICES)
        + '; project operations in '
        + ', '.join(OPERATIONS)
        + '.'
    )

    out = []
    # meet, explicitly, not the default-by-omission. See the window comment at
    # the top: `slice` cannot hold the six countries across the column aspect
    # ratios this layout produces, and the letterbox `meet` leaves is invisible
    # against .off__map's sea-coloured background.
    out.append('<svg class="off__map" viewBox="0 0 %d %s" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="off-map-title">' % (W, H))
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

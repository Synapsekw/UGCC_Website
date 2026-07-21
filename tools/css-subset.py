#!/usr/bin/env python3
"""tools/css-subset.py — writes assets/css/main.subset.css containing only the
rules from main.css that anything on the site can actually match.

Usage:  python3 tools/css-subset.py [--report]

main.css is Hostinger builder output: 358KB, 1254 class selectors, of which
only ~61 appear anywhere in the site. The dead rules cost style-recalc on
every page load. (Transfer cost is modest — Netlify Brotli-compresses it — so
the win here is parse and match time, not bytes on the wire.)

The keep-set is the union of:
  - every class in a class="..." attribute across all pages
  - every bareword string literal in assets/js/*.js

That second source is essential and easy to forget: classList.add('is-in'),
'burger--open', 'slide--active' and friends never appear in the HTML, so a
keep-set built only from markup would delete the styles for every interactive
state on the site and nothing would fail until a user clicked something.

Conservative by construction:
  - a rule survives if ANY selector in its comma-separated list survives
  - a selector survives if ANY of its classes is in the keep-set
  - a selector with no class at all (element, :root, [data-v-x], *) always
    survives — those are cheap and dropping them breaks resets
  - @media/@supports are recursed into and kept if anything inside survives
  - @keyframes and @font-face are always kept
"""
import os
import re
import sys

SKIP_DIRS = {'node_modules', '.git', '.claude', '.superpowers'}
CLASS_IN_HTML = re.compile(r'class="([^"]*)"')
STRING_IN_JS = re.compile(r'["\']([A-Za-z0-9_-]{2,})["\']')
CLASS_IN_SELECTOR = re.compile(r'\.(-?[A-Za-z_][A-Za-z0-9_-]*)')
SRC = 'assets/css/main.css'
OUT = 'assets/css/main.subset.css'


def repo_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def keep_set(root):
    used = set()
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            path = os.path.join(dirpath, name)
            if name.endswith('.html'):
                text = open(path, encoding='utf-8', errors='ignore').read()
                for group in CLASS_IN_HTML.findall(text):
                    used.update(group.split())
            elif name.endswith(('.js', '.mjs')) and os.sep + 'js' + os.sep in path:
                text = open(path, encoding='utf-8', errors='ignore').read()
                used.update(STRING_IN_JS.findall(text))
    return used


def blocks(css):
    """Split a stylesheet into top-level blocks, brace-balanced."""
    out, depth, start = [], 0, 0
    for i, ch in enumerate(css):
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                out.append(css[start:i + 1])
                start = i + 1
    tail = css[start:].strip()
    if tail:
        out.append(tail)
    return out


def selector_survives(selector, used):
    classes = set(CLASS_IN_SELECTOR.findall(selector))
    return (not classes) or bool(classes & used)


def filter_rule(rule, used):
    """Returns the rule if it survives, else None."""
    head, _, body = rule.partition('{')
    head = head.strip()
    if not head or not body:
        return rule

    if head.startswith('@'):
        kind = head.split()[0].lower()
        if kind in ('@keyframes', '@-webkit-keyframes', '@font-face',
                    '@charset', '@import', '@namespace', '@page'):
            return rule
        if kind in ('@media', '@supports', '@layer', '@container'):
            inner = body.rstrip()
            assert inner.endswith('}')
            inner = inner[:-1]
            kept = [r for r in (filter_rule(b, used) for b in blocks(inner)) if r]
            if not kept:
                return None
            return head + '{' + ''.join(kept) + '}'
        return rule

    if any(selector_survives(s, used) for s in head.split(',')):
        return rule
    return None


def main():
    root = repo_root()
    used = keep_set(root)
    css = open(os.path.join(root, SRC), encoding='utf-8', errors='ignore').read()

    top = blocks(css)
    kept = [r for r in (filter_rule(b, used) for b in top) if r]
    out = ''.join(kept)

    open(os.path.join(root, OUT), 'w', encoding='utf-8').write(out)

    declared = set(CLASS_IN_SELECTOR.findall(css))
    print('keep-set:      %d names (HTML classes + JS string literals)' % len(used))
    print('main.css:      %d top-level blocks, %.1fKB' % (len(top), len(css) / 1024))
    print('main.subset:   %d top-level blocks, %.1fKB' % (len(kept), len(out) / 1024))
    print('reduction:     %.0f%%' % (100 - 100 * len(out) / len(css)))
    print('class selectors declared: %d, of which used: %d'
          % (len(declared), len(declared & used)))

    if '--report' in sys.argv:
        print('\nJS-only names kept (never appear in any class attribute):')
        html_only = set()
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for name in filenames:
                if name.endswith('.html'):
                    text = open(os.path.join(dirpath, name), encoding='utf-8',
                                errors='ignore').read()
                    for group in CLASS_IN_HTML.findall(text):
                        html_only.update(group.split())
        for name in sorted((used - html_only) & declared):
            print('  ' + name)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

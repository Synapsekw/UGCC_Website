#!/usr/bin/env python3
"""tools/find-orphan-assets.py — lists asset files under assets/img and
assets/video that no HTML, CSS or JS file references.

Usage:  python3 tools/find-orphan-assets.py [--delete]

Without --delete it only reports. Always dry-run first and read the MISSING
section: a referenced-but-absent file is a broken page, and a separate bug
from an orphan.

Worktrees under .claude/ are skipped deliberately. They are separate branches
with their own on-disk copies of assets/, so their references neither keep a
file alive here nor are broken by deleting one here.

tools/orphan-keep.txt protects files that are unreferenced on purpose.
"""
import os
import re
import sys

SKIP_DIRS = {'node_modules', '.git', '.claude', '.superpowers'}

# More than the runtime formats are scanned, because a SOURCE image is
# typically referenced by nothing a browser ever loads — only its derivative
# reaches a page.
#
#   .sh/.py  the tools/make-*.sh generators name their inputs directly.
#            Without this, 7 build sources (2.4 MB) were deletable.
#   .tsv     tools/responsive-manifest.tsv lists the source of every AVIF/JPEG
#            derivative. Without this, 248 sources (82 MB) were deletable and
#            `npm run build:images` could never have been re-run.
#
# Both were found the same way: by checking what --delete would actually
# remove before trusting it. Anything that records a build input belongs here.
SCAN_EXT = ('.html', '.css', '.js', '.mjs', '.sh', '.py', '.tsv')
REF = re.compile(r'assets/((?:img|video)/[A-Za-z0-9._\-/]+)')
KEEP_FILE = 'tools/orphan-keep.txt'


def repo_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def kept(root):
    """Paths in tools/orphan-keep.txt are never deleted."""
    path = os.path.join(root, KEEP_FILE)
    if not os.path.exists(path):
        return set()
    keep = set()
    with open(path, encoding='utf-8') as handle:
        for line in handle:
            line = line.strip()
            if line and not line.startswith('#'):
                keep.add(line)
    return keep


def referenced(root):
    """Every assets/{img,video}/... path mentioned anywhere in the source.

    Entries with no file extension are dropped: they come from directory
    joins in tools/*.js (path.join(root, 'assets/img/v3')) and are not
    references to a file.
    """
    found = set()
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if not name.endswith(SCAN_EXT):
                continue
            path = os.path.join(dirpath, name)
            with open(path, encoding='utf-8', errors='ignore') as handle:
                for hit in REF.findall(handle.read()):
                    if os.path.splitext(hit)[1]:
                        found.add(hit)
    return found


def on_disk(root):
    """Maps 'img/foo.jpg' -> absolute path for everything under assets/."""
    files = {}
    for base in ('assets/img', 'assets/video'):
        for dirpath, _, filenames in os.walk(os.path.join(root, base)):
            for name in filenames:
                path = os.path.join(dirpath, name)
                rel = os.path.relpath(path, os.path.join(root, 'assets'))
                files[rel] = path
    return files


def main():
    root = repo_root()
    refs, disk, keep = referenced(root), on_disk(root), kept(root)
    orphans = {rel: p for rel, p in disk.items()
               if rel not in refs and rel not in keep}
    total = sum(os.path.getsize(p) for p in orphans.values())

    print('referenced: %d' % len(refs))
    print('kept:       %d (%s)' % (len(keep), KEEP_FILE))
    print('on disk:    %d' % len(disk))
    print('orphaned:   %d files, %.1f MB' % (len(orphans), total / 1e6))

    absent_keep = sorted(k for k in keep if k not in disk)
    if absent_keep:
        print('\nWARNING: %d kept path(s) are not on disk — stale keep-list:'
              % len(absent_keep))
        for rel in absent_keep:
            print('  ' + rel)

    missing = sorted(r for r in refs if r not in disk)
    if missing:
        print('\nWARNING: %d referenced file(s) MISSING from disk:'
              % len(missing))
        for rel in missing[:20]:
            print('  ' + rel)

    if '--delete' in sys.argv:
        if missing:
            print('\nREFUSING to delete while references are broken.')
            print('Fix the missing files first, then re-run.')
            return 1
        for path in orphans.values():
            os.remove(path)
        print('\ndeleted %d files, freed %.1f MB' % (len(orphans), total / 1e6))
    else:
        print('\n(dry run — pass --delete to remove them)')
    return 0


if __name__ == '__main__':
    sys.exit(main())

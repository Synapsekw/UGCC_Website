#!/usr/bin/env python3
"""tools/make-responsive-images.py — writes AVIF + JPEG derivatives listed in
tools/responsive-manifest.tsv into assets/img/v3/resp/.

Usage:  python3 tools/make-responsive-images.py [--force] [--jobs N]

Idempotent: an output newer than both its source and the manifest is left
alone, so re-running after adding one page costs only the new files. Pass
--force to rebuild everything.

Quality settings are the benchmarked ones (spec, 2026-07-21): AVIF q60 and
JPEG q82 progressive gave 85%/74% savings at a mean channel difference of
1.86-3.54/255 against the source — visually indistinguishable, which is what
the customer content freeze requires.

Resizing never crops: only the width is constrained and the height follows the
source aspect, so framing is untouched. Nothing is ever upscaled.
"""
import os
import sys
from concurrent.futures import ProcessPoolExecutor

AVIF_QUALITY = 60
JPEG_QUALITY = 82
OUT_DIR = 'assets/img/v3/resp'
MANIFEST = 'tools/responsive-manifest.tsv'


def repo_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def rows(root):
    with open(os.path.join(root, MANIFEST), encoding='utf-8') as handle:
        header = handle.readline().rstrip('\n').split('\t')
        for line in handle:
            if line.strip():
                yield dict(zip(header, line.rstrip('\n').split('\t')))


def encode(job):
    """Encode one (stem, width) pair. Runs in a worker process."""
    from PIL import Image

    root, stem, width, src_rel, force, manifest_mtime = job
    src = os.path.join(root, src_rel)
    out_dir = os.path.join(root, OUT_DIR)
    targets = [
        (os.path.join(out_dir, '%s-%d.avif' % (stem, width)), 'AVIF',
         {'quality': AVIF_QUALITY}),
        (os.path.join(out_dir, '%s-%d.jpg' % (stem, width)), 'JPEG',
         {'quality': JPEG_QUALITY, 'optimize': True, 'progressive': True}),
    ]

    def stale(dst):
        if force or not os.path.exists(dst):
            return True
        age = os.path.getmtime(dst)
        return age < os.path.getmtime(src) or age < manifest_mtime

    if not any(stale(dst) for dst, _, _ in targets):
        return (0, 0, 0)

    with Image.open(src) as im:
        im = im.convert('RGB')
        # thumbnail() preserves aspect ratio and never upscales.
        im.thumbnail((width, 10 ** 6), Image.LANCZOS)
        written = out_bytes = 0
        for dst, fmt, kwargs in targets:
            im.save(dst, fmt, **kwargs)
            out_bytes += os.path.getsize(dst)
            written += 1
    return (written, out_bytes, os.path.getsize(src))


def main():
    force = '--force' in sys.argv
    jobs_flag = '--jobs' in sys.argv
    workers = int(sys.argv[sys.argv.index('--jobs') + 1]) if jobs_flag else None

    root = repo_root()
    os.makedirs(os.path.join(root, OUT_DIR), exist_ok=True)
    manifest_mtime = os.path.getmtime(os.path.join(root, MANIFEST))

    # One source can appear on several pages; encode each (stem, width) once.
    work = {}
    for row in rows(root):
        for width in (int(w) for w in row['widths'].split(',')):
            work[(row['stem'], width)] = row['src']

    jobs = [(root, stem, width, src, force, manifest_mtime)
            for (stem, width), src in sorted(work.items())]

    written = out_bytes = src_bytes = 0
    with ProcessPoolExecutor(max_workers=workers) as pool:
        for w, o, s in pool.map(encode, jobs, chunksize=8):
            written += w
            out_bytes += o
            src_bytes += s

    print('encodes requested: %d' % len(jobs))
    print('files written:     %d (%d up to date)'
          % (written, (len(jobs) - written // 2) if written else len(jobs)))
    if src_bytes:
        print('sources touched %.1f MB -> derivatives %.1f MB (%.0f%% smaller)'
              % (src_bytes / 1e6, out_bytes / 1e6,
                 100 - 100 * out_bytes / src_bytes))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

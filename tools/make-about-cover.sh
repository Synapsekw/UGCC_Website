#!/usr/bin/env bash
# Derives the About page's cover image into the same slot and format the other
# four About-family covers already use: a single 1920w JPEG at
# assets/img/v2/hero-<page>.jpg, no srcset, no builder hash in the name.
#
# Before this script, About was the odd one out — it pointed at six hashed
# Hostinger PNG derivatives (*-opt4-copy-F7I0HwQ7cakkCmCV.png) behind a
# `sizes`/`srcset` pair, while credentials/hse/quality/csr each load one plain
# JPEG. Same photograph, same crop; only the plumbing changes, so the page
# looks identical and stops being a special case.
#
# Source: assets/img/59682a2e-opt4-copy-F7I0HwQ7cakkCmCV.png (2800x1061), the
# largest of the six derivatives. Downsampling from it beats re-encoding the
# 1920w PNG, which has already been through one resample.
#
# Idempotent: safe to re-run. Requires macOS `sips` (no dependencies), matching
# make-careers-image.sh and make-rail-images.sh.
set -euo pipefail

cd "$(dirname "$0")/.."
SRC="assets/img/59682a2e-opt4-copy-F7I0HwQ7cakkCmCV.png"
OUT="assets/img/v2/hero-about.jpg"

[ -f "$SRC" ] || { echo "missing $SRC" >&2; exit 1; }

# 1920x728 is the source's own 2.64:1 ratio at 1920 wide — the same frame the
# builder's 1920w derivative showed, so nothing about the composition moves.
# The cover box is full-bleed and 524px tall on desktop, so object-fit:cover
# trims the top and bottom; keeping the full width means the crop never eats
# into the subject horizontally at any viewport.
TMP="$(mktemp -t hero-about).png"
trap 'rm -f "$TMP"' EXIT

sips --resampleWidth 1920 "$SRC" --out "$TMP" >/dev/null
sips -c 728 1920 "$TMP" >/dev/null
sips -s format jpeg -s formatOptions 82 "$TMP" --out "$OUT" >/dev/null

echo "$(basename "$OUT")  $(sips -g pixelWidth -g pixelHeight "$OUT" \
  | awk '/pixelWidth/{w=$2} /pixelHeight/{h=$2} END{print w"x"h}')  $(du -h "$OUT" | cut -f1)"

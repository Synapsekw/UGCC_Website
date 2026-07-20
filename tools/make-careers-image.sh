#!/usr/bin/env bash
# Generates the homepage CAREERS band's background derivatives from the 1920w
# original. Idempotent: safe to re-run. Requires macOS `sips` (no dependencies).
#
# Source: assets/img/v2/slide-09.jpg (1920x1438) — the same aerial the rail
# uses; cropped here to a much wider band because the careers block is a
# full-bleed strip, not a 16:10 card.
#
# Output: assets/img/v2/careers-{960,1280,1920}.jpg, centre-cropped to an exact
# 2.34:1 so every width crops the same part of the frame and swapping between
# srcset candidates never shifts the subject.
set -euo pipefail

cd "$(dirname "$0")/.."
SRC="assets/img/v2/slide-09.jpg"
OUT="assets/img/v2"

[ -f "$SRC" ] || { echo "missing $SRC" >&2; exit 1; }

make_one() {
  local out="$1" tw="$2" th="$3" w h
  read -r w h < <(sips -g pixelWidth -g pixelHeight "$SRC" \
    | awk '/pixelWidth/{w=$2} /pixelHeight/{h=$2} END{print w, h}')

  # Resample along whichever axis leaves both dimensions >= the target, then
  # centre-crop — same two-step as make-rail-images.sh, for the same reason:
  # cropping without the resample letterboxes instead of cropping.
  if [ $(( w * th )) -gt $(( h * tw )) ]; then
    sips --resampleHeight "$th" "$SRC" --out "$out" >/dev/null
  else
    sips --resampleWidth "$tw" "$SRC" --out "$out" >/dev/null
  fi
  sips -c "$th" "$tw" "$out" >/dev/null
}

make_one "$OUT/careers-960.jpg"   960 410
make_one "$OUT/careers-1280.jpg" 1280 547
make_one "$OUT/careers-1920.jpg" 1920 820

for f in careers-960 careers-1280 careers-1920; do
  echo "$f.jpg  $(sips -g pixelWidth -g pixelHeight "$OUT/$f.jpg" \
    | awk '/pixelWidth/{w=$2} /pixelHeight/{h=$2} END{print w"x"h}')  $(du -h "$OUT/$f.jpg" | cut -f1)"
done

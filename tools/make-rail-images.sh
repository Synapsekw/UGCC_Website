#!/usr/bin/env bash
# Generates the homepage rail's downscaled derivatives from the 1920w originals.
# Idempotent: safe to re-run. Requires macOS `sips` (no external dependencies).
#
# Output: assets/img/v3/rail/slide-NN-{480,960}.jpg, centre-cropped to an exact
# 480x316 / 960x632 so every card reserves the same layout space.
set -euo pipefail

cd "$(dirname "$0")/.."
SRC="assets/img/v2"
OUT="assets/img/v3/rail"
mkdir -p "$OUT"

make_one() {
  local src="$1" out="$2" tw="$3" th="$4" w h
  read -r w h < <(sips -g pixelWidth -g pixelHeight "$src" \
    | awk '/pixelWidth/{w=$2} /pixelHeight/{h=$2} END{print w, h}')

  # Resample along whichever axis leaves both dimensions >= the target,
  # then centre-crop. Cropping without this can letterbox instead of crop.
  if [ $(( w * th )) -gt $(( h * tw )) ]; then
    sips --resampleHeight "$th" "$src" --out "$out" >/dev/null
  else
    sips --resampleWidth "$tw" "$src" --out "$out" >/dev/null
  fi
  sips -c "$th" "$tw" "$out" >/dev/null
}

for n in 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15; do
  src="$SRC/slide-$n.jpg"
  [ -f "$src" ] || { echo "missing $src" >&2; exit 1; }
  make_one "$src" "$OUT/slide-$n-480.jpg" 480 316
  make_one "$src" "$OUT/slide-$n-960.jpg" 960 632
  echo "slide-$n done"
done

echo
echo "Total: $(du -sh "$OUT" | cut -f1) in $OUT"

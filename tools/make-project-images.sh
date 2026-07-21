#!/usr/bin/env bash
# Generates the homepage PROJECTS block's card derivatives from the project
# cover images already in assets/img/.
# Idempotent: safe to re-run. Requires macOS `sips` (no external dependencies).
#
# Output: assets/img/v3/proj/<slug>-{440,880}.jpg, centre-cropped to an exact
# 440x275 / 880x550 (16:10) so every card reserves the same layout space and
# no card shifts as its image arrives.
set -euo pipefail

cd "$(dirname "$0")/.."
OUT="assets/img/v3/proj"
mkdir -p "$OUT"

# slug|source. The slug is the derivative filename stem and matches the project
# directory, except Duqm which is shortened so the file is not named after a
# 74-character directory. Every source was verified landscape and >= 1024px wide.
ROWS=(
  "kp3cns301|assets/img/v3/card-kp3.jpg"
  "ra-259|assets/img/c253e1af-60-mnl4x5okE6sxOWwl.png"
  "pahwc1151|assets/img/37063398-cover-mxB26lNQqxfoZnna.jpg"
  "pai18pa|assets/img/d09f536f-cover-AzGMBZ95W8tqw0VQ.JPG"
  "c502015|assets/img/c98236de-c50-2015-cover-dZsizRULbSONi57t.webp"
  "zorepc0059|assets/img/2310a664-zor-epc-cover-YBgjQp23yeipGgMV.jpg"
)

make_one() {
  local src="$1" out="$2" tw="$3" th="$4" w h
  read -r w h < <(sips -g pixelWidth -g pixelHeight "$src" \
    | awk '/pixelWidth/{w=$2} /pixelHeight/{h=$2} END{print w, h}')

  # Resample along whichever axis leaves both dimensions >= the target, then
  # centre-crop. Cropping without this can letterbox instead of crop.
  # -s format jpeg: two sources carry .png/.webp extensions. sips picks the
  # output format from the .jpg extension anyway, so this is belt-and-braces
  # for the day a source is swapped for a genuine PNG or WebP.
  if [ $(( w * th )) -gt $(( h * tw )) ]; then
    sips -s format jpeg --resampleHeight "$th" "$src" --out "$out" >/dev/null
  else
    sips -s format jpeg --resampleWidth "$tw" "$src" --out "$out" >/dev/null
  fi
  sips -c "$th" "$tw" "$out" >/dev/null
}

for row in "${ROWS[@]}"; do
  slug="${row%%|*}"
  src="${row#*|}"
  [ -f "$src" ] || { echo "missing $src" >&2; exit 1; }
  make_one "$src" "$OUT/$slug-440.jpg" 440 275
  make_one "$src" "$OUT/$slug-880.jpg" 880 550
  echo "$slug done"
done

echo
echo "Total: $(du -sh "$OUT" | cut -f1) in $OUT"

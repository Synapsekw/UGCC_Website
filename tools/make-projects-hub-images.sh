#!/bin/bash
# make-projects-hub-images.sh — 440/880 JPEG+AVIF card derivatives for the
# projects hub, from tools/projects-hub-manifest.tsv. Resample only (sips
# crop is broken on this machine); CSS crops in the 4/3 box. Idempotent:
# skips outputs that already exist. Never upscales: the 880 pair is only
# produced when the source frame is >=880px wide.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=assets/img/v3/proj
mkdir -p "$OUT"

emit () { # emit <src> <base> <width>  -> base-<w>.jpg + base-<w>.avif
  local src=$1 base=$2 w=$3
  [ -f "$base-$w.jpg" ]  || sips --resampleWidth "$w" -s format jpeg -s formatOptions 80 "$src" --out "$base-$w.jpg"  >/dev/null
  [ -f "$base-$w.avif" ] || sips --resampleWidth "$w" -s format avif -s formatOptions 60 "$src" --out "$base-$w.avif" >/dev/null
}

while IFS=$'\t' read -r slug status lines src; do
  f=".$src"
  sw=$(sips -g pixelWidth "$f" | awk '/pixelWidth/{print $2}')
  emit "$f" "$OUT/$slug" 440
  if [ "$sw" -ge 880 ]; then emit "$f" "$OUT/$slug" 880; fi
done < tools/projects-hub-manifest.tsv

for h in hero-projects hero-current; do
  for w in 960 1440 1920; do emit "assets/img/v3/$h.jpg" "assets/img/v3/$h" "$w"; done
done
echo "done"

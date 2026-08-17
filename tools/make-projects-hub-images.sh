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

# Page covers. Each hero names its own source frame, because there is no
# assets/img/v3/<hero>.jpg base on disk. Widths are capped at the source width
# for the same reason the card ladder is: never upscale. hero-projects comes
# from the builder export of the Duqm Port access road, which is 1440px wide,
# so it stops at 1440 and has no 1920 rung.
hero_src () {
  case "$1" in
    hero-projects) echo "assets/img/d77048a1-picture2-1-pKDxGNfmrARsgc0e.jpg" ;;
    *)             echo "" ;;
  esac
}

for h in hero-projects hero-current; do
  src=$(hero_src "$h")
  [ -n "$src" ] && [ -f "$src" ] || continue   # no known source: leave existing derivatives alone
  sw=$(sips -g pixelWidth "$src" | awk '/pixelWidth/{print $2}')
  for w in 960 1440 1920; do
    [ "$sw" -ge "$w" ] && emit "$src" "assets/img/v3/$h" "$w"
  done
done
echo "done"

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

# sips writes AVIF that sometimes carries an undecodable image grid: it reports
# the right dimensions and exits 0, but browsers paint nothing. It bit
# hero-projects-1440.avif, which is why the projects hub cover was blank at
# viewport widths where the 1440 rung wins. Every AVIF this script writes is
# therefore decoded before it is accepted, and re-encoded with Pillow — the
# encoder make-responsive-images.py uses for the other 838 files on disk — when
# the decode fails. Same quality (60) either way.
reencode_avif () { # reencode_avif <src> <dst> <width>
  python3 - "$1" "$2" "$3" <<'PY'
import sys
from PIL import Image
src, dst, width = sys.argv[1], sys.argv[2], int(sys.argv[3])
with Image.open(src) as im:
    im = im.convert('RGB')
    im.thumbnail((width, 10 ** 6), Image.LANCZOS)
    im.save(dst, 'AVIF', quality=60)
PY
}

avif_decodes () { python3 -c "
from PIL import Image
import sys
with Image.open(sys.argv[1]) as im: im.load()
" "$1" >/dev/null 2>&1; }

emit () { # emit <src> <base> <width>  -> base-<w>.jpg + base-<w>.avif
  local src=$1 base=$2 w=$3
  [ -f "$base-$w.jpg" ]  || sips --resampleWidth "$w" -s format jpeg -s formatOptions 80 "$src" --out "$base-$w.jpg"  >/dev/null
  if [ ! -f "$base-$w.avif" ]; then
    sips --resampleWidth "$w" -s format avif -s formatOptions 60 "$src" --out "$base-$w.avif" >/dev/null
    if ! avif_decodes "$base-$w.avif"; then
      echo "  sips wrote an undecodable $base-$w.avif — re-encoding with Pillow" >&2
      reencode_avif "$src" "$base-$w.avif" "$w"
      avif_decodes "$base-$w.avif" || { echo "FATAL: $base-$w.avif still will not decode" >&2; exit 1; }
    fi
  fi
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

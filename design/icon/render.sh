#!/bin/bash
# Renders every app icon and in-app logo from llama-foreground.svg.
# Needs inkscape and ImageMagick 7 (magick). Run from anywhere.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$here/../.."
res="$root/android/app/src/main/res"
assets="$root/src/assets"
green='#059669'
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# One big render of the 108x108 adaptive canvas, then everything is cut from it.
inkscape "$here/llama-foreground.svg" --export-type=png --export-filename="$tmp/fg.png" -w 1296 -h 1296 2>/dev/null
# Launchers show the middle 72 of the 108 units.
magick -size 1296x1296 xc:"$green" "$tmp/fg.png" -composite -gravity center -crop 864x864+0+0 +repage "$tmp/face.png"
magick "$tmp/face.png" \( -size 864x864 xc:none -fill white -draw "circle 432,432 432,0" \) -compose DstIn -composite "$tmp/round.png"
magick "$tmp/face.png" \( -size 864x864 xc:none -fill white -draw "roundrectangle 0,0 863,863 190,190" \) -compose DstIn -composite "$tmp/square.png"

# density: legacy icon px, adaptive foreground px
for d in mdpi:48:108 hdpi:72:162 xhdpi:96:216 xxhdpi:144:324 xxxhdpi:192:432; do
  IFS=: read -r name px fpx <<<"$d"
  magick "$tmp/fg.png" -resize "${fpx}x${fpx}" "$res/mipmap-$name/ic_launcher_foreground.png"
  magick "$tmp/square.png" -resize "${px}x${px}" "$res/mipmap-$name/ic_launcher.png"
  magick "$tmp/round.png" -resize "${px}x${px}" "$res/mipmap-$name/ic_launcher_round.png"
done

magick "$tmp/round.png" -resize 192x192 "$res/drawable/splash_logo.png"
magick "$tmp/round.png" -resize 512x512 "$assets/logo.png"
for t in light dark; do
  magick "$tmp/round.png" -resize 32x32 "$assets/home-logo-$t.png"
  magick "$tmp/round.png" -resize 64x64 "$assets/home-logo-$t@2x.png"
  magick "$tmp/round.png" -resize 96x96 "$assets/home-logo-$t@3x.png"
done
echo "Icons written."

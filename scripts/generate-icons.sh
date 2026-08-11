#!/usr/bin/env bash
# Regenerate every app icon/splash density from the SVG masters.
# Run from repo root: bash scripts/generate-icons.sh (or npm run mobile:icons)
# Sources:
#   assets/icon.svg                  — master art (rounded, full-bleed) → legacy/round icons
#   assets/icon-foreground.svg            — pulse line only, adaptive safe zone
#   assets/icon-background.svg            — brand gradient, full square
#   assets/icon-ios.svg                   — square, no rounded corners (App Store + favicon source)
#   assets/splash.svg                     — 2732² splash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Rendering 1024² sources..."
rsvg-convert -w 1024 -h 1024 assets/icon.svg -o assets/icon-only.png
rsvg-convert -w 1024 -h 1024 assets/icon-foreground.svg -o assets/icon-foreground.png
rsvg-convert -w 1024 -h 1024 assets/icon-background.svg -o assets/icon-background.png
rsvg-convert -w 1024 -h 1024 assets/icon-ios.svg -o assets/icon-ios.png
# iOS AppIcon override: square master, NO baked rounded corners (Apple applies
# its own mask). The tool consumes assets/ios/icon.png — the root icon-ios.png
# only feeds the web apple-touch-icon.
mkdir -p assets/ios
rsvg-convert -w 1024 -h 1024 assets/icon-ios.svg -o assets/ios/icon.png

echo "→ Rendering 2732² splash..."
rsvg-convert -w 2732 -h 2732 assets/splash.svg -o assets/splash.png
rsvg-convert -w 2732 -h 2732 assets/splash-dark.svg -o assets/splash-dark.png

echo "→ Rendering web apple-touch-icon (180²)..."
rsvg-convert -w 180 -h 180 assets/icon-ios.svg -o public/apple-touch-icon.png

echo "→ Generating platform densities..."
if [ -d android ]; then
  npx @capacitor/assets generate --android
fi
if [ -d ios ]; then
  npx @capacitor/assets generate --ios
fi

echo "→ Done. Sources in assets/, densities in android/app/src/main/res/ and ios/App/App/Assets.xcassets/"

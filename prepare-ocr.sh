#!/bin/sh
# Prepare same-origin browser OCR assets for a static host. Requires Node/npm.
set -eu
dest=${1:-"$(dirname "$0")/ocr"}
mkdir -p "$dest"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
npm install --prefix "$tmp" --ignore-scripts --no-audit --no-fund tesseract.js@6.0.1 tesseract.js-core@6.1.2 @tesseract.js-data/eng@1.0.0
src="$tmp/node_modules"
cp "$src/tesseract.js/dist/tesseract.min.js" "$src/tesseract.js/dist/worker.min.js" "$src/tesseract.js/dist/"*.LICENSE.txt "$dest/"
cp "$src/tesseract.js-core/tesseract-core-lstm.wasm.js" "$dest/"
cp "$src/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz" "$dest/"
cp "$src/tesseract.js/LICENSE.md" "$dest/LICENSE-tesseract-js.txt"
cp "$src/tesseract.js-core/LICENSE" "$dest/LICENSE-core.txt"
python3 "$(dirname "$0")/prepare-languages.py" "$dest"

#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "${SCRIPT_DIR}/wails.json" ]]; then
  PROJECT_ROOT="${SCRIPT_DIR}"
elif [[ -f "${SCRIPT_DIR}/source/wails.json" ]]; then
  PROJECT_ROOT="${SCRIPT_DIR}/source"
elif [[ -f "${SCRIPT_DIR}/../../wails.json" ]]; then
  PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
else
  echo "Failed to locate project root with wails.json"
  exit 1
fi

cd "${PROJECT_ROOT}"

if ! command -v go >/dev/null 2>&1; then
  echo "Go is required on Steam Deck to build FF Vless."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required on Steam Deck to build FF Vless."
  exit 1
fi

if [[ ! -x "${HOME}/go/bin/wails" ]]; then
  echo "Installing Wails CLI..."
  go install github.com/wailsapp/wails/v2/cmd/wails@v2.11.0
fi

echo "Building Linux binary..."
"${HOME}/go/bin/wails" build -clean -nopackage -platform linux/amd64 -tags webkit2_41 -o ff-vless

echo "Assembling Steam Deck package..."
bash "${PROJECT_ROOT}/build/steamdeck/package-steamdeck.sh"

if [[ -x "${PROJECT_ROOT}/build/tools/appimagetool-x86_64.AppImage" ]] || command -v appimagetool >/dev/null 2>&1; then
  echo "Assembling Steam Deck AppImage..."
  bash "${PROJECT_ROOT}/build/steamdeck/package-appimage.sh"
else
  echo "Skipping AppImage: appimagetool was not found."
  echo "Download appimagetool to ${PROJECT_ROOT}/build/tools/appimagetool-x86_64.AppImage and rerun:"
  echo "  bash ${PROJECT_ROOT}/build/steamdeck/package-appimage.sh"
fi

echo
echo "Done. Package locations:"
echo "  ${PROJECT_ROOT}/build/dist/steamdeck/FF-Vless-SteamDeck.tar.gz"
echo "  ${PROJECT_ROOT}/build/dist/steamdeck/FF-Vless-x86_64.AppImage"

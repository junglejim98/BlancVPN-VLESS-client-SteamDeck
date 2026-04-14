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
  echo "Go is required on Steam Deck to build BlancVPN."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required on Steam Deck to build BlancVPN."
  exit 1
fi

if [[ ! -x "${HOME}/go/bin/wails" ]]; then
  echo "Installing Wails CLI..."
  go install github.com/wailsapp/wails/v2/cmd/wails@v2.11.0
fi

echo "Building Linux binary..."
"${HOME}/go/bin/wails" build -clean -nopackage -platform linux/amd64 -tags webkit2_41 -o vless-ui

echo "Assembling Steam Deck package..."
bash "${PROJECT_ROOT}/build/steamdeck/package-steamdeck.sh"

echo
echo "Done. Package location:"
echo "  ${PROJECT_ROOT}/build/dist/steamdeck/BlancVPN-SteamDeck.tar.gz"

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

DIST_ROOT="${PROJECT_ROOT}/build/dist/steamdeck"
PACKAGE_NAME="BlancVPN-SteamDeck"
PACKAGE_DIR="${DIST_ROOT}/${PACKAGE_NAME}"
ARCHIVE_PATH="${DIST_ROOT}/${PACKAGE_NAME}.tar.gz"

cd "${PROJECT_ROOT}"

if [[ -f "${SCRIPT_DIR}/install-toolchain-steamdeck.sh" ]]; then
  bash "${SCRIPT_DIR}/install-toolchain-steamdeck.sh"
else
  bash "${PROJECT_ROOT}/build/steamdeck/install-toolchain-steamdeck.sh"
fi

if [[ ! -x "${HOME}/go/bin/wails" ]]; then
  echo "Installing Wails CLI..."
  go install github.com/wailsapp/wails/v2/cmd/wails@v2.11.0
fi

echo "Checking Wails toolchain..."
"${HOME}/go/bin/wails" doctor || true

echo "Building Linux binary..."
"${HOME}/go/bin/wails" build -clean -nopackage -platform linux/amd64 -tags webkit2_41 -o vless-ui

echo "Assembling Steam Deck package..."
bash "${PROJECT_ROOT}/build/steamdeck/package-steamdeck.sh"

if [[ ! -f "${ARCHIVE_PATH}" ]]; then
  echo "Expected package archive was not created: ${ARCHIVE_PATH}"
  exit 1
fi

rm -rf "${PACKAGE_DIR}"
mkdir -p "${DIST_ROOT}"
tar -C "${DIST_ROOT}" -xzf "${ARCHIVE_PATH}"

echo "Running installer..."
bash "${PACKAGE_DIR}/install.sh"

echo
echo "BlancVPN bootstrap completed."
echo "If needed, uninstall later with:"
echo "  ${PACKAGE_DIR}/uninstall.sh"

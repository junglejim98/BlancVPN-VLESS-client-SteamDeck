#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_BIN="${PROJECT_ROOT}/build/bin/vless-ui"
DIST_ROOT="${PROJECT_ROOT}/build/dist/steamdeck"
PACKAGE_NAME="BlancVPN-SteamDeck"
PACKAGE_ROOT="${DIST_ROOT}/${PACKAGE_NAME}"
ARCHIVE_PATH="${DIST_ROOT}/${PACKAGE_NAME}.tar.gz"

if [[ ! -f "${BUILD_BIN}" ]]; then
  echo "Linux binary not found at ${BUILD_BIN}"
  echo "Build it first, for example:"
  echo "  ~/go/bin/wails build -clean -nopackage -platform linux/amd64 -o vless-ui"
  exit 1
fi

rm -rf "${PACKAGE_ROOT}"
mkdir -p "${PACKAGE_ROOT}/app" "${PACKAGE_ROOT}/assets"

cp "${BUILD_BIN}" "${PACKAGE_ROOT}/app/vless-ui"
chmod +x "${PACKAGE_ROOT}/app/vless-ui"

cp -R "${PROJECT_ROOT}/assets/shell" "${PACKAGE_ROOT}/assets/"
find "${PACKAGE_ROOT}/assets/shell" -type f -name '*.sh' -exec chmod +x {} \;

cp "${PROJECT_ROOT}/build/appicon.png" "${PACKAGE_ROOT}/assets/appicon.png"
cp "${SCRIPT_DIR}/install.sh" "${PACKAGE_ROOT}/install.sh"
cp "${SCRIPT_DIR}/uninstall.sh" "${PACKAGE_ROOT}/uninstall.sh"
cp "${SCRIPT_DIR}/blancvpn.desktop" "${PACKAGE_ROOT}/blancvpn.desktop"
cp "${SCRIPT_DIR}/README.md" "${PACKAGE_ROOT}/README.txt"

chmod +x "${PACKAGE_ROOT}/install.sh" "${PACKAGE_ROOT}/uninstall.sh"

mkdir -p "${DIST_ROOT}"
tar -C "${DIST_ROOT}" -czf "${ARCHIVE_PATH}" "${PACKAGE_NAME}"

echo "Steam Deck package created:"
echo "  ${ARCHIVE_PATH}"

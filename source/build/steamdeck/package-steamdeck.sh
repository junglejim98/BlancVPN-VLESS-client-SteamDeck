#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_BIN="${PROJECT_ROOT}/build/bin/ff-vless"
DIST_ROOT="${PROJECT_ROOT}/build/dist/steamdeck"
PACKAGE_NAME="FF-Vless-SteamDeck"
PACKAGE_ROOT="${DIST_ROOT}/${PACKAGE_NAME}"
ARCHIVE_PATH="${DIST_ROOT}/${PACKAGE_NAME}.tar.gz"
ICON_SOURCE="${PROJECT_ROOT}/build/appicon.png"

if [[ ! -f "${BUILD_BIN}" ]]; then
  echo "Linux binary not found at ${BUILD_BIN}"
  echo "Build it first, for example:"
  echo "  ~/go/bin/wails build -clean -nopackage -platform linux/amd64 -o ff-vless"
  exit 1
fi

if [[ ! -f "${ICON_SOURCE}" ]]; then
  echo "App icon not found at ${ICON_SOURCE}"
  exit 1
fi

rm -rf "${PACKAGE_ROOT}"
mkdir -p "${PACKAGE_ROOT}/app" "${PACKAGE_ROOT}/assets"

cp "${BUILD_BIN}" "${PACKAGE_ROOT}/app/ff-vless"
chmod +x "${PACKAGE_ROOT}/app/ff-vless"

cp -R "${PROJECT_ROOT}/assets/shell" "${PACKAGE_ROOT}/assets/"
find "${PACKAGE_ROOT}/assets/shell" -type f -name '*.sh' -exec chmod +x {} \;

cp "${ICON_SOURCE}" "${PACKAGE_ROOT}/assets/appicon.png"
cp "${SCRIPT_DIR}/install.sh" "${PACKAGE_ROOT}/install.sh"
cp "${SCRIPT_DIR}/install-ff-vless.sh" "${PACKAGE_ROOT}/install-ff-vless.sh"
cp "${SCRIPT_DIR}/install-ff-vless.desktop" "${PACKAGE_ROOT}/install-ff-vless.desktop"
cp "${SCRIPT_DIR}/uninstall.sh" "${PACKAGE_ROOT}/uninstall.sh"
cp "${SCRIPT_DIR}/uninstall-old-blancvpn.sh" "${PACKAGE_ROOT}/uninstall-old-blancvpn.sh"
cp "${SCRIPT_DIR}/uninstall-old-blancvpn.desktop" "${PACKAGE_ROOT}/uninstall-old-blancvpn.desktop"
cp "${SCRIPT_DIR}/blancvpn.desktop" "${PACKAGE_ROOT}/blancvpn.desktop"
cp "${SCRIPT_DIR}/README.md" "${PACKAGE_ROOT}/README.txt"

chmod +x \
  "${PACKAGE_ROOT}/install.sh" \
  "${PACKAGE_ROOT}/install-ff-vless.sh" \
  "${PACKAGE_ROOT}/install-ff-vless.desktop" \
  "${PACKAGE_ROOT}/uninstall.sh" \
  "${PACKAGE_ROOT}/uninstall-old-blancvpn.sh" \
  "${PACKAGE_ROOT}/uninstall-old-blancvpn.desktop"

mkdir -p "${DIST_ROOT}"
tar -C "${DIST_ROOT}" -czf "${ARCHIVE_PATH}" "${PACKAGE_NAME}"

echo "Steam Deck package created:"
echo "  ${ARCHIVE_PATH}"

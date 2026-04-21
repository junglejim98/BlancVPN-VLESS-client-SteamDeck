#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DIST_ROOT="${PROJECT_ROOT}/build/dist/steamdeck"
PACKAGE_NAME="FF-Vless-SteamDeck-source"
PACKAGE_ROOT="${DIST_ROOT}/${PACKAGE_NAME}"
ARCHIVE_PATH="${DIST_ROOT}/${PACKAGE_NAME}.tar.gz"

rm -rf "${PACKAGE_ROOT}"
mkdir -p "${PACKAGE_ROOT}"

rsync -a \
  --exclude 'frontend/node_modules' \
  --exclude 'frontend/dist' \
  --exclude 'build/bin' \
  --exclude 'build/dist' \
  --exclude '.git' \
  "${PROJECT_ROOT}/" "${PACKAGE_ROOT}/source/"

cp "${SCRIPT_DIR}/build-on-steamdeck.sh" "${PACKAGE_ROOT}/build-on-steamdeck.sh"
cp "${SCRIPT_DIR}/bootstrap-steamdeck.sh" "${PACKAGE_ROOT}/bootstrap-steamdeck.sh"
cp "${SCRIPT_DIR}/install-toolchain-steamdeck.sh" "${PACKAGE_ROOT}/install-toolchain-steamdeck.sh"
mkdir -p "${PACKAGE_ROOT}/source/build/tools"
chmod +x "${PACKAGE_ROOT}/build-on-steamdeck.sh" "${PACKAGE_ROOT}/bootstrap-steamdeck.sh" "${PACKAGE_ROOT}/install-toolchain-steamdeck.sh"

cat > "${PACKAGE_ROOT}/README.txt" <<'EOF'
FF Vless Steam Deck source package

Usage on Steam Deck:
1. Extract this archive.
2. cd into the extracted directory.
3. Run:
   ./bootstrap-steamdeck.sh

Lower-level manual flow is still available:
- ./install-toolchain-steamdeck.sh
- ./build-on-steamdeck.sh
- then run install.sh from source/build/dist/steamdeck/FF-Vless-SteamDeck

Requirements on Steam Deck:
- Go
- Node.js + npm
- build tools needed by Wails/Linux

bootstrap-steamdeck.sh installs:
- go, nodejs, npm
- docker
- base-devel
- gcc, glibc, linux-api-headers, make
- gtk3
- webkit2gtk
- pkgconf
- wget, unzip, curl, rsync

The Wails build is executed with:
-tags webkit2_41

AppImage:
- put appimagetool at source/build/tools/appimagetool-x86_64.AppImage
- or install appimagetool into PATH
- then run ./build-on-steamdeck.sh
EOF

mkdir -p "${DIST_ROOT}"
tar -C "${DIST_ROOT}" -czf "${ARCHIVE_PATH}" "${PACKAGE_NAME}"

echo "Steam Deck source package created:"
echo "  ${ARCHIVE_PATH}"

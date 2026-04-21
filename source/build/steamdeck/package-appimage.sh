#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_BIN="${PROJECT_ROOT}/build/bin/ff-vless"
DIST_ROOT="${PROJECT_ROOT}/build/dist/steamdeck"
APPDIR="${DIST_ROOT}/FF-Vless-Installer.AppDir"
APPIMAGE_PATH="${DIST_ROOT}/FF-Vless-Installer-x86_64.AppImage"
APPIMAGETOOL="${APPIMAGETOOL:-}"

if [[ ! -f "${BUILD_BIN}" ]]; then
  echo "Linux binary not found at ${BUILD_BIN}"
  echo "Build it first, for example:"
  echo "  ~/go/bin/wails build -clean -nopackage -platform linux/amd64 -tags webkit2_41 -o ff-vless"
  exit 1
fi

if [[ ! -f "${PROJECT_ROOT}/build/appicon.png" ]]; then
  echo "App icon not found at ${PROJECT_ROOT}/build/appicon.png"
  exit 1
fi

if [[ -z "${APPIMAGETOOL}" ]]; then
  if command -v appimagetool >/dev/null 2>&1; then
    APPIMAGETOOL="$(command -v appimagetool)"
  elif [[ -x "${PROJECT_ROOT}/build/tools/appimagetool-x86_64.AppImage" ]]; then
    APPIMAGETOOL="${PROJECT_ROOT}/build/tools/appimagetool-x86_64.AppImage"
  else
    echo "appimagetool not found."
    echo "Install it or download it to:"
    echo "  ${PROJECT_ROOT}/build/tools/appimagetool-x86_64.AppImage"
    exit 1
  fi
fi

rm -rf "${APPDIR}" "${APPIMAGE_PATH}"
mkdir -p \
  "${APPDIR}/app" \
  "${APPDIR}/assets" \
  "${APPDIR}/usr/share/applications" \
  "${APPDIR}/usr/share/icons/hicolor/256x256/apps"

cp "${BUILD_BIN}" "${APPDIR}/app/ff-vless"
chmod +x "${APPDIR}/app/ff-vless"

cp -R "${PROJECT_ROOT}/assets/shell" "${APPDIR}/assets/"
find "${APPDIR}/assets/shell" -type f -name '._*' -delete
find "${APPDIR}/assets/shell" -type f -name '*.sh' -exec chmod +x {} \;

cp "${PROJECT_ROOT}/build/appicon.png" "${APPDIR}/ff-vless.png"
cp "${PROJECT_ROOT}/build/appicon.png" "${APPDIR}/usr/share/icons/hicolor/256x256/apps/ff-vless.png"
cp "${PROJECT_ROOT}/build/appicon.png" "${APPDIR}/assets/appicon.png"
cp "${SCRIPT_DIR}/install.sh" "${APPDIR}/install.sh"
cp "${SCRIPT_DIR}/install-ff-vless.sh" "${APPDIR}/install-ff-vless.sh"
cp "${SCRIPT_DIR}/uninstall.sh" "${APPDIR}/uninstall.sh"
cp "${SCRIPT_DIR}/uninstall-old-blancvpn.sh" "${APPDIR}/uninstall-old-blancvpn.sh"
cp "${SCRIPT_DIR}/blancvpn.desktop" "${APPDIR}/blancvpn.template.desktop"
cp "${SCRIPT_DIR}/README.md" "${APPDIR}/README.txt"
chmod +x \
  "${APPDIR}/install.sh" \
  "${APPDIR}/install-ff-vless.sh" \
  "${APPDIR}/uninstall.sh" \
  "${APPDIR}/uninstall-old-blancvpn.sh"

cat > "${APPDIR}/ff-vless-installer.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Version=1.0
Name=Install FF Vless
Comment=Install FF Vless and create the desktop launcher
Exec=AppRun
Icon=ff-vless
Terminal=false
Categories=Utility;Network;
StartupNotify=true
EOF
cp "${APPDIR}/ff-vless-installer.desktop" "${APPDIR}/usr/share/applications/ff-vless-installer.desktop"

cat > "${APPDIR}/AppRun" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

APPDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLER="${APPDIR}/install-ff-vless.sh"

if [[ ! -x "${INSTALLER}" ]]; then
  echo "Installer is missing or not executable: ${INSTALLER}" >&2
  exit 1
fi

if [[ -t 0 && -t 1 ]]; then
  exec "${INSTALLER}" "$@"
fi

if command -v konsole >/dev/null 2>&1; then
  exec konsole --noclose -e "${INSTALLER}" "$@"
fi

if command -v xterm >/dev/null 2>&1; then
  exec xterm -hold -e "${INSTALLER}" "$@"
fi

if command -v gnome-terminal >/dev/null 2>&1; then
  exec gnome-terminal -- "${INSTALLER}" "$@"
fi

if command -v kdialog >/dev/null 2>&1; then
  kdialog --error "No terminal emulator found. Run this AppImage from Terminal to install FF Vless."
elif command -v zenity >/dev/null 2>&1; then
  zenity --error --text="No terminal emulator found. Run this AppImage from Terminal to install FF Vless."
else
  echo "No terminal emulator found. Run this AppImage from Terminal to install FF Vless." >&2
fi

exit 1
EOF
chmod +x "${APPDIR}/AppRun"

mkdir -p "${DIST_ROOT}"
ARCH=x86_64 APPIMAGE_EXTRACT_AND_RUN=1 "${APPIMAGETOOL}" "${APPDIR}" "${APPIMAGE_PATH}"
chmod +x "${APPIMAGE_PATH}"

echo "Steam Deck installer AppImage created:"
echo "  ${APPIMAGE_PATH}"

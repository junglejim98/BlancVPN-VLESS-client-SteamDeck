#!/usr/bin/env bash

set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_ROOT="${HOME}/.local/share/blancvpn"
BIN_DIR="${HOME}/.local/bin"
APPLICATIONS_DIR="${HOME}/.local/share/applications"
APP_BINARY_NAME="vless-ui"
APP_BINARY_SOURCE="${PACKAGE_DIR}/app/${APP_BINARY_NAME}"
APP_BINARY_TARGET="${INSTALL_ROOT}/${APP_BINARY_NAME}"
LAUNCHER_PATH="${BIN_DIR}/blancvpn"
ICON_SOURCE="${PACKAGE_DIR}/assets/appicon.png"
ICON_TARGET="${INSTALL_ROOT}/appicon.png"
DESKTOP_TEMPLATE="${PACKAGE_DIR}/blancvpn.desktop"
DESKTOP_TARGET="${APPLICATIONS_DIR}/blancvpn.desktop"

if [[ ! -f "${APP_BINARY_SOURCE}" ]]; then
  echo "Missing app binary: ${APP_BINARY_SOURCE}"
  echo "Build the Linux binary first or recreate the package with package-steamdeck.sh"
  exit 1
fi

mkdir -p "${INSTALL_ROOT}" "${BIN_DIR}" "${APPLICATIONS_DIR}"
rm -rf "${INSTALL_ROOT}/assets"

cp "${APP_BINARY_SOURCE}" "${APP_BINARY_TARGET}"
chmod +x "${APP_BINARY_TARGET}"

mkdir -p "${INSTALL_ROOT}/assets"
cp -R "${PACKAGE_DIR}/assets/shell" "${INSTALL_ROOT}/assets/"
find "${INSTALL_ROOT}/assets/shell" -type f -name '*.sh' -exec chmod +x {} \;

cp "${ICON_SOURCE}" "${ICON_TARGET}"

cat > "${LAUNCHER_PATH}" <<EOF
#!/usr/bin/env bash
set -euo pipefail
exec "${APP_BINARY_TARGET}" "\$@"
EOF
chmod +x "${LAUNCHER_PATH}"

sed \
  -e "s|__BLANCVPN_EXEC__|${LAUNCHER_PATH}|g" \
  -e "s|__BLANCVPN_ICON__|${ICON_TARGET}|g" \
  "${DESKTOP_TEMPLATE}" > "${DESKTOP_TARGET}"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${APPLICATIONS_DIR}" >/dev/null 2>&1 || true
fi

echo "Installing runtime dependencies..."
bash "${INSTALL_ROOT}/assets/shell/xrayDownload.sh"
bash "${INSTALL_ROOT}/assets/shell/tun2SocksDownload.sh"

echo
echo "BlancVPN installed."
echo "Launcher: ${LAUNCHER_PATH}"
echo "Desktop entry: ${DESKTOP_TARGET}"
echo
echo "Note: full VPN connect still requires sudo during tunnel setup."

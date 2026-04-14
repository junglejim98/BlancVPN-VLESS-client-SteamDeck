#!/usr/bin/env bash

set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_BINARY_NAME="vless-ui"

resolve_target_user() {
  if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
    echo "${SUDO_USER}"
    return
  fi

  if [[ "$(id -u)" -eq 0 && -d "/home/deck" ]]; then
    echo "deck"
    return
  fi

  id -un
}

resolve_target_home() {
  local target_user="$1"

  if [[ "${target_user}" == "$(id -un)" ]]; then
    echo "${HOME}"
    return
  fi

  local passwd_entry
  passwd_entry="$(getent passwd "${target_user}" || true)"
  if [[ -n "${passwd_entry}" ]]; then
    echo "${passwd_entry}" | cut -d: -f6
    return
  fi

  echo "${HOME}"
}

resolve_desktop_dir() {
  local target_user="$1"
  local target_home="$2"

  if command -v xdg-user-dir >/dev/null 2>&1; then
    if [[ "$(id -un)" == "${target_user}" ]]; then
      xdg-user-dir DESKTOP
      return
    fi

    if command -v sudo >/dev/null 2>&1; then
      sudo -H -u "${target_user}" xdg-user-dir DESKTOP
      return
    fi
  fi

  echo "${target_home}/Desktop"
}

TARGET_USER="$(resolve_target_user)"
TARGET_HOME="$(resolve_target_home "${TARGET_USER}")"
INSTALL_ROOT="${TARGET_HOME}/.local/share/blancvpn"
BIN_DIR="${TARGET_HOME}/.local/bin"
APPLICATIONS_DIR="${TARGET_HOME}/.local/share/applications"
APP_BINARY_SOURCE="${PACKAGE_DIR}/app/${APP_BINARY_NAME}"
APP_BINARY_TARGET="${INSTALL_ROOT}/${APP_BINARY_NAME}"
LAUNCHER_PATH="${BIN_DIR}/blancvpn"
ICON_SOURCE="${PACKAGE_DIR}/assets/appicon.png"
ICON_TARGET="${INSTALL_ROOT}/appicon.png"
DESKTOP_TEMPLATE="${PACKAGE_DIR}/blancvpn.desktop"
DESKTOP_TARGET="${APPLICATIONS_DIR}/blancvpn.desktop"
DESKTOP_DIR="$(resolve_desktop_dir "${TARGET_USER}" "${TARGET_HOME}")"
DESKTOP_SHORTCUT="${DESKTOP_DIR}/BlancVPN.desktop"

if [[ ! -f "${APP_BINARY_SOURCE}" ]]; then
  echo "Missing app binary: ${APP_BINARY_SOURCE}"
  echo "Build the Linux binary first or recreate the package with package-steamdeck.sh"
  exit 1
fi

if [[ -z "${DESKTOP_DIR}" ]]; then
  DESKTOP_DIR="${TARGET_HOME}/Desktop"
  DESKTOP_SHORTCUT="${DESKTOP_DIR}/BlancVPN.desktop"
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

mkdir -p "${DESKTOP_DIR}"
cp "${DESKTOP_TARGET}" "${DESKTOP_SHORTCUT}"
chmod +x "${DESKTOP_SHORTCUT}"

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
echo "Desktop shortcut: ${DESKTOP_SHORTCUT}"
echo
echo "Note: full VPN connect still requires sudo during tunnel setup."

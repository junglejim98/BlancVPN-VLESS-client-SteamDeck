#!/usr/bin/env bash

set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_BINARY_NAME="ff-vless"

require_commands() {
  local missing=()
  local cmd

  for cmd in "$@"; do
    if ! command -v "${cmd}" >/dev/null 2>&1; then
      missing+=("${cmd}")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "Missing required command(s): ${missing[*]}"
    echo "Install them first, then run this installer again."
    exit 1
  fi
}

webkitgtk_available() {
  [[ -e /usr/lib/libwebkit2gtk-4.1.so.0 ]] || ldconfig -p 2>/dev/null | grep -q 'libwebkit2gtk-4\.1\.so\.0'
}

install_system_packages_with_pkexec() {
  pkexec /usr/bin/env bash -s -- "$@" <<'PKEXEC_SCRIPT'
set -euo pipefail

readonly_was_enabled=0
if command -v steamos-readonly >/dev/null 2>&1 && [[ "$(steamos-readonly status 2>/dev/null || true)" == "enabled" ]]; then
  readonly_was_enabled=1
  steamos-readonly disable
fi

if [[ ! -d /etc/pacman.d/gnupg/private-keys-v1.d ]]; then
  pacman-key --init
  pacman-key --populate archlinux holo
fi

pacman -S --noconfirm --needed "$@"

if [[ "${readonly_was_enabled}" == "1" ]]; then
  steamos-readonly enable
fi
PKEXEC_SCRIPT
}

install_system_packages_with_sudo() {
  sudo /usr/bin/env bash -s -- "$@" <<'SUDO_SCRIPT'
set -euo pipefail

readonly_was_enabled=0
if command -v steamos-readonly >/dev/null 2>&1 && [[ "$(steamos-readonly status 2>/dev/null || true)" == "enabled" ]]; then
  readonly_was_enabled=1
  steamos-readonly disable
fi

if [[ ! -d /etc/pacman.d/gnupg/private-keys-v1.d ]]; then
  pacman-key --init
  pacman-key --populate archlinux holo
fi

pacman -S --noconfirm --needed "$@"

if [[ "${readonly_was_enabled}" == "1" ]]; then
  steamos-readonly enable
fi
SUDO_SCRIPT
}

install_system_packages() {
  if ! command -v pacman >/dev/null 2>&1; then
    echo "Automatic system dependency installation requires pacman."
    echo "Install these packages manually: $*"
    exit 1
  fi

  if command -v pkexec >/dev/null 2>&1; then
    install_system_packages_with_pkexec "$@"
    return
  fi

  if command -v sudo >/dev/null 2>&1; then
    install_system_packages_with_sudo "$@"
    return
  fi

  echo "Missing pkexec/sudo. Install these packages manually: $*"
  exit 1
}

ensure_runtime_dependencies() {
  local packages=()

  if ! command -v wget >/dev/null 2>&1; then
    packages+=(wget)
  fi

  if ! command -v unzip >/dev/null 2>&1; then
    packages+=(unzip)
  fi

  if ! webkitgtk_available; then
    packages+=(webkit2gtk-4.1)
  fi

  if [[ ${#packages[@]} -gt 0 ]]; then
    echo "Installing runtime package(s): ${packages[*]}"
    echo "A system authorization prompt may appear."
    install_system_packages "${packages[@]}"
  fi

  require_commands wget unzip
}

maybe_install_build_toolchain() {
  if [[ "${FF_VLESS_INSTALL_BUILD_TOOLCHAIN:-0}" != "1" ]]; then
    return
  fi

  if [[ ! -x "${PACKAGE_DIR}/install-toolchain-steamdeck.sh" ]]; then
    echo "Build toolchain installer is missing: ${PACKAGE_DIR}/install-toolchain-steamdeck.sh"
    exit 1
  fi

  echo "Installing optional build toolchain packages..."
  bash "${PACKAGE_DIR}/install-toolchain-steamdeck.sh"
}

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

run_as_target_user() {
  if [[ "$(id -un)" == "${TARGET_USER}" ]]; then
    HOME="${TARGET_HOME}" "$@"
    return
  fi

  if command -v sudo >/dev/null 2>&1; then
    sudo -H -u "${TARGET_USER}" "$@"
    return
  fi

  HOME="${TARGET_HOME}" "$@"
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
if [[ ! -f "${DESKTOP_TEMPLATE}" && -f "${PACKAGE_DIR}/blancvpn.desktop.template" ]]; then
  DESKTOP_TEMPLATE="${PACKAGE_DIR}/blancvpn.desktop.template"
fi
if [[ ! -f "${DESKTOP_TEMPLATE}" && -f "${PACKAGE_DIR}/blancvpn.template.desktop" ]]; then
  DESKTOP_TEMPLATE="${PACKAGE_DIR}/blancvpn.template.desktop"
fi
DESKTOP_TARGET="${APPLICATIONS_DIR}/blancvpn.desktop"
DESKTOP_DIR="$(resolve_desktop_dir "${TARGET_USER}" "${TARGET_HOME}")"
DESKTOP_SHORTCUT="${DESKTOP_DIR}/FF Vless.desktop"

if [[ ! -f "${APP_BINARY_SOURCE}" ]]; then
  echo "Missing app binary: ${APP_BINARY_SOURCE}"
  echo "Build the Linux binary first or recreate the package with package-steamdeck.sh"
  exit 1
fi

maybe_install_build_toolchain
ensure_runtime_dependencies

if [[ -z "${DESKTOP_DIR}" ]]; then
  DESKTOP_DIR="${TARGET_HOME}/Desktop"
  DESKTOP_SHORTCUT="${DESKTOP_DIR}/FF Vless.desktop"
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
run_as_target_user bash "${INSTALL_ROOT}/assets/shell/xrayDownload.sh"
run_as_target_user bash "${INSTALL_ROOT}/assets/shell/tun2SocksDownload.sh"

echo
echo "FF Vless installed."
echo "Launcher: ${LAUNCHER_PATH}"
echo "Desktop entry: ${DESKTOP_TARGET}"
echo "Desktop shortcut: ${DESKTOP_SHORTCUT}"
echo
echo "Note: full VPN connect still requires sudo during tunnel setup."

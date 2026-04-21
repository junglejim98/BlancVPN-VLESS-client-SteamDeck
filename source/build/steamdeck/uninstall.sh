#!/usr/bin/env bash

set -euo pipefail

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
LAUNCHER_PATH="${TARGET_HOME}/.local/bin/blancvpn"
DESKTOP_TARGET="${TARGET_HOME}/.local/share/applications/blancvpn.desktop"
DESKTOP_DIR="$(resolve_desktop_dir "${TARGET_USER}" "${TARGET_HOME}")"
DESKTOP_SHORTCUT="${DESKTOP_DIR}/FF Vless.desktop"
LEGACY_DESKTOP_SHORTCUT="${DESKTOP_DIR}/BlancVPN.desktop"

rm -f "${LAUNCHER_PATH}"
rm -f "${DESKTOP_TARGET}"
rm -f "${DESKTOP_SHORTCUT}"
rm -f "${LEGACY_DESKTOP_SHORTCUT}"
rm -rf "${INSTALL_ROOT}"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${TARGET_HOME}/.local/share/applications" >/dev/null 2>&1 || true
fi

echo "FF Vless uninstalled from user-space paths."

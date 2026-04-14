#!/usr/bin/env bash

set -euo pipefail

INSTALL_ROOT="${HOME}/.local/share/blancvpn"
LAUNCHER_PATH="${HOME}/.local/bin/blancvpn"
DESKTOP_TARGET="${HOME}/.local/share/applications/blancvpn.desktop"

rm -f "${LAUNCHER_PATH}"
rm -f "${DESKTOP_TARGET}"
rm -rf "${INSTALL_ROOT}"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${HOME}/.local/share/applications" >/dev/null 2>&1 || true
fi

echo "BlancVPN uninstalled from user-space paths."

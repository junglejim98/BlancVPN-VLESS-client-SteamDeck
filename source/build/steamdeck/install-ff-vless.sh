#!/usr/bin/env bash

set -u

PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLER="${PACKAGE_DIR}/install.sh"

clear
echo "FF Vless Steam Deck installer"
echo

if [[ ! -x "${INSTALLER}" ]]; then
  echo "Installer script is missing or not executable:"
  echo "  ${INSTALLER}"
  echo
  echo "Press Enter to close this window."
  read -r _
  exit 1
fi

"${INSTALLER}"
status=$?

echo
if [[ ${status} -eq 0 ]]; then
  echo "Install complete. You can launch FF Vless from the Desktop shortcut or app launcher."
else
  echo "Install failed with exit code ${status}."
fi

echo
echo "Press Enter to close this window."
read -r _
exit "${status}"

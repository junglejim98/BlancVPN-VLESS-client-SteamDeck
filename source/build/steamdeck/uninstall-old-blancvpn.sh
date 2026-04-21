#!/usr/bin/env bash

set -u

PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UNINSTALLER="${PACKAGE_DIR}/uninstall.sh"

clear
echo "FF Vless cleanup"
echo

if [[ ! -x "${UNINSTALLER}" ]]; then
  echo "Uninstaller script is missing or not executable:"
  echo "  ${UNINSTALLER}"
  echo
  echo "Press Enter to close this window."
  read -r _
  exit 1
fi

"${UNINSTALLER}"
status=$?

echo
if [[ ${status} -eq 0 ]]; then
  echo "Old BlancVPN / FF Vless files were removed."
else
  echo "Cleanup failed with exit code ${status}."
fi

echo
echo "Press Enter to close this window."
read -r _
exit "${status}"

#!/usr/bin/env bash

set -euo pipefail

target_dir="${XRAY_DIR:-${HOME}/xray}"
archive_path="${target_dir}/Xray-linux-64.zip"

mkdir -p "${target_dir}"
mkdir -p "${HOME}/.config/v2ray" "${HOME}/.config/xray"

if [[ -x "${target_dir}/xray" ]]; then
  echo "Xray already installed: ${target_dir}/xray"
  exit 0
fi

cd "${target_dir}"

wget -O "${archive_path}" https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip
unzip -o "${archive_path}"
chmod +x xray

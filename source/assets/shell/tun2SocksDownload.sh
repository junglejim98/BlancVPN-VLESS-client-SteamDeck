#!/usr/bin/env bash

set -euo pipefail

target_dir="${TUN2SOCKS_DIR:-${HOME}/tun2socks}"
archive_path="${target_dir}/tun2socks-linux-amd64.zip"

mkdir -p "${target_dir}"

if [[ -x "${target_dir}/tun2socks" ]]; then
  echo "tun2socks already installed: ${target_dir}/tun2socks"
  exit 0
fi

cd "${target_dir}"

wget -O "${archive_path}" https://github.com/xjasonlyu/tun2socks/releases/download/v2.6.0/tun2socks-linux-amd64.zip
unzip -o "${archive_path}"
mv -f tun2socks-linux-amd64 tun2socks
chmod +x tun2socks

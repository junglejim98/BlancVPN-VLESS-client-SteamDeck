#!/usr/bin/env bash

set -euo pipefail

if command -v go >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  echo "Go and npm are already installed."
  exit 0
fi

if ! command -v pacman >/dev/null 2>&1; then
  echo "Unsupported system: pacman is required to install Go and npm automatically."
  exit 1
fi

if command -v steamos-readonly >/dev/null 2>&1; then
  echo "Disabling SteamOS readonly mode..."
  sudo steamos-readonly disable
fi

echo "Initializing pacman keys..."
sudo pacman-key --init
sudo pacman-key --populate archlinux holo

echo "Installing build toolchain packages..."
sudo pacman -Sy --needed --noconfirm \
  go \
  nodejs \
  npm \
  docker \
  base-devel \
  gcc \
  glibc \
  linux-api-headers \
  make \
  gtk3 \
  webkit2gtk \
  pkgconf \
  wget \
  unzip \
  curl \
  rsync

echo "Toolchain installation completed."

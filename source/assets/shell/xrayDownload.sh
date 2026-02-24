#!/usr/bin/env bash

mkdir -p ~/xray
mkdir -p ~/.config/v2ray
cd ~/xray

wget https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip
unzip -o Xray-linux-64.zip
chmod +x xray

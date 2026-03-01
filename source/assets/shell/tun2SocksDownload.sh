#!/usr/bin/env bash

mkdir -p ~/tun2socks
cd ~/tun2socks

wget https://github.com/xjasonlyu/tun2socks/releases/download/v2.6.0/tun2socks-linux-amd64.zip
unzip tun2socks-linux-amd64.zip
mv tun2socks-linux-amd64 tun2socks
chmod +x tun2socks

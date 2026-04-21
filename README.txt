FF Vless Steam Deck source package

Usage on Steam Deck:
1. Extract this archive.
2. cd into the extracted directory.
3. Run:
   ./bootstrap-steamdeck.sh

Lower-level manual flow is still available:
- ./install-toolchain-steamdeck.sh
- ./build-on-steamdeck.sh
- then run install.sh from source/build/dist/steamdeck/FF-Vless-SteamDeck

Requirements on Steam Deck:
- Go
- Node.js + npm
- build tools needed by Wails/Linux

bootstrap-steamdeck.sh installs:
- go, nodejs, npm
- docker
- base-devel
- gcc, glibc, linux-api-headers, make
- gtk3
- webkit2gtk
- pkgconf
- wget, unzip, curl, rsync

The Wails build is executed with:
-tags webkit2_41

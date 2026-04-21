# FF Vless Steam Deck Package

This directory contains the packaging assets for Steam Deck/Linux:

- `install-toolchain-steamdeck.sh` installs `go` and `npm` through SteamOS/Arch tooling
- `bootstrap-steamdeck.sh` builds, packages and installs on Steam Deck
- `package-steamdeck.sh` assembles a distributable `tar.gz`
- `build-on-steamdeck.sh` builds the Linux binary and package on Steam Deck
- `install.sh` installs the app into the current user's home directory
- `install-ff-vless.desktop` starts the installer by double click in Desktop Mode
- `install-ff-vless.sh` is the wrapper used by the desktop installer
- `uninstall.sh` removes the installed app
- `uninstall-old-blancvpn.desktop` starts the old install cleanup by double click
- `blancvpn.desktop` is the launcher template

Expected package layout:

- `app/ff-vless`
- `assets/shell/*`
- `assets/appicon.png`
- `install-ff-vless.desktop`
- `install-ff-vless.sh`
- `install.sh`
- `uninstall.sh`
- `uninstall-old-blancvpn.desktop`
- `uninstall-old-blancvpn.sh`
- `README.txt`

The installer performs a user-space install:

- app: `~/.local/share/blancvpn`
- launcher: `~/.local/bin/blancvpn`
- desktop entry: `~/.local/share/applications/blancvpn.desktop`

The included installer can also install `xray` and `tun2socks` into the user's home directory by running the bundled shell scripts.

Desktop Mode install without typing commands:

1. Extract the package.
2. Double click `install-ff-vless.desktop`.
3. Approve running the launcher if KDE asks for confirmation.
4. Wait for the installer window to finish.

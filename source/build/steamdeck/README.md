# Steam Deck Package

This directory contains the packaging assets for Steam Deck/Linux:

- `install-toolchain-steamdeck.sh` installs `go` and `npm` through SteamOS/Arch tooling
- `bootstrap-steamdeck.sh` builds, packages and installs on Steam Deck
- `package-steamdeck.sh` assembles a distributable `tar.gz`
- `build-on-steamdeck.sh` builds the Linux binary and package on Steam Deck
- `install.sh` installs the app into the current user's home directory
- `uninstall.sh` removes the installed app
- `blancvpn.desktop` is the launcher template

Expected package layout:

- `app/vless-ui`
- `assets/shell/*`
- `assets/appicon.png`
- `install.sh`
- `uninstall.sh`
- `README.txt`

The installer performs a user-space install:

- app: `~/.local/share/blancvpn`
- launcher: `~/.local/bin/blancvpn`
- desktop entry: `~/.local/share/applications/blancvpn.desktop`

The included installer can also install `xray` and `tun2socks` into the user's home directory by running the bundled shell scripts.

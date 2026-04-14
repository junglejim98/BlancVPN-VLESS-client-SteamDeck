package main

import (
	"os"
	"path/filepath"
	goruntime "runtime"
	"strings"
)

func dependenciesInstalled() bool {
	return getDependencyStatus().Ready
}

func getDependencyStatus() DependencyStatus {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return DependencyStatus{
			Message: "Failed to resolve user home directory",
		}
	}

	xrayBinary := filepath.Join(homeDir, "xray", "xray")
	xrayConfigDir := filepath.Join(homeDir, ".config", "xray")
	v2rayConfigDir := filepath.Join(homeDir, ".config", "v2ray")
	tun2socksBinary := filepath.Join(homeDir, "tun2socks", "tun2socks")

	status := DependencyStatus{
		Xray:           isExecutableFile(xrayBinary),
		XrayConfigDir:  isDirectoryReady(xrayConfigDir),
		V2rayConfigDir: isDirectoryReady(v2rayConfigDir),
	}

	if goruntime.GOOS == "linux" {
		status.Tun2socks = isExecutableFile(tun2socksBinary)
	} else {
		status.Tun2socks = true
	}

	status.Ready = status.Xray && status.XrayConfigDir && status.V2rayConfigDir && status.Tun2socks
	status.Message = buildDependencyStatusMessage(status)

	return status
}

func buildDependencyStatusMessage(status DependencyStatus) string {
	if status.Ready {
		return "Dependencies installed"
	}

	missing := make([]string, 0, 4)
	if !status.Xray {
		missing = append(missing, "xray binary")
	}
	if !status.XrayConfigDir {
		missing = append(missing, "~/.config/xray")
	}
	if !status.V2rayConfigDir {
		missing = append(missing, "~/.config/v2ray")
	}
	if goruntime.GOOS == "linux" && !status.Tun2socks {
		missing = append(missing, "tun2socks binary")
	}

	if len(missing) == 0 {
		return "Dependencies are not ready"
	}

	return "Missing: " + strings.Join(missing, ", ")
}

func isExecutableFile(path string) bool {
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		return false
	}

	return info.Mode().Perm()&0o111 != 0
}

func isDirectoryReady(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}

	return info.IsDir()
}

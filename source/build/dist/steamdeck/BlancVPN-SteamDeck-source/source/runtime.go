package main

import (
	"errors"
	"fmt"
	"net"
	neturl "net/url"
	"os"
	"os/exec"
	"path/filepath"
	goruntime "runtime"
	"strings"
	"syscall"
)

func getConnectionStatus() RuntimeStatus {
	if goruntime.GOOS != "linux" {
		return RuntimeStatus("idle")
	}

	xrayRunning := isProcessAliveFromPIDFile("/tmp/xray.pid")
	tun2socksRunning := isProcessAliveFromPIDFile("/tmp/tun2socks.pid")
	tunReady := isTunInterfaceReady("tun0")

	if xrayRunning && tun2socksRunning && tunReady {
		return RuntimeStatus("connected")
	}

	if xrayRunning || tun2socksRunning {
		return RuntimeStatus("connecting")
	}

	return RuntimeStatus("idle")
}

func isProcessAliveFromPIDFile(pidPath string) bool {
	raw, err := os.ReadFile(pidPath)
	if err != nil {
		return false
	}

	pid := strings.TrimSpace(string(raw))
	if pid == "" {
		return false
	}

	processID := 0
	if _, err := fmt.Sscanf(pid, "%d", &processID); err != nil || processID <= 0 {
		return false
	}

	process, err := os.FindProcess(processID)
	if err != nil {
		return false
	}

	return process.Signal(syscall.Signal(0)) == nil
}

func isTunInterfaceReady(name string) bool {
	command := exec.Command("ip", "link", "show", name)
	return command.Run() == nil
}

func resolveServerIPv4(serverURL string) (string, error) {
	parsedURL, err := neturl.Parse(strings.TrimSpace(serverURL))
	if err != nil {
		return "", err
	}

	host := strings.TrimSpace(parsedURL.Hostname())
	if host == "" {
		return "", errors.New("server host is empty")
	}

	ips, err := net.LookupIP(host)
	if err != nil {
		return "", err
	}

	for _, ip := range ips {
		if ipv4 := ip.To4(); ipv4 != nil {
			return ipv4.String(), nil
		}
	}

	return "", fmt.Errorf("no IPv4 address found for host %s", host)
}

func resolveShellScriptPath(fileName string) (string, error) {
	candidates := []string{}

	if workingDir, err := os.Getwd(); err == nil {
		candidates = append(candidates,
			filepath.Join(workingDir, "assets", "shell", fileName),
			filepath.Join(workingDir, "source", "assets", "shell", fileName),
		)
	}

	if executablePath, err := os.Executable(); err == nil {
		executableDir := filepath.Dir(executablePath)
		candidates = append(candidates,
			filepath.Join(executableDir, "assets", "shell", fileName),
			filepath.Join(executableDir, "..", "Resources", "assets", "shell", fileName),
		)
	}

	for _, candidate := range candidates {
		info, err := os.Stat(candidate)
		if err == nil && !info.IsDir() {
			return candidate, nil
		}
	}

	return "", fmt.Errorf("shell script %s not found", fileName)
}

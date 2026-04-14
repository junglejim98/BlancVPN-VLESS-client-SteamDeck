package main

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"math"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/net/proxy"
)

func measureServerLatency(serverURL string) (int, error) {
	xrayPath, err := resolveXrayBinary()
	if err != nil {
		return 0, err
	}

	socksPort, err := getFreeTCPPort()
	if err != nil {
		return 0, err
	}

	configPath, cleanupConfig, err := writeProbeConfig(serverURL, socksPort)
	if err != nil {
		return 0, err
	}
	defer cleanupConfig()

	var stdout bytes.Buffer
	var stderr bytes.Buffer

	command := exec.Command(xrayPath, "run", "-config", configPath)
	command.Stdout = &stdout
	command.Stderr = &stderr

	if err := command.Start(); err != nil {
		return 0, err
	}

	defer func() {
		if command.Process != nil {
			_ = command.Process.Kill()
		}
		if command.Process != nil {
			_, _ = command.Process.Wait()
		}
	}()

	if err := waitForSocksReady(socksPort, 5*time.Second); err != nil {
		return 0, formatProbeError(err, stderr.Bytes(), stdout.Bytes())
	}

	best := math.MaxInt

	for range 2 {
		latencyMs, err := measureThroughSocks(socksPort)
		if err != nil {
			continue
		}

		if latencyMs < best {
			best = latencyMs
		}
	}

	if best == math.MaxInt {
		return 0, formatProbeError(errors.New("latency probe failed"), stderr.Bytes(), stdout.Bytes())
	}

	return best, nil
}

func resolveXrayBinary() (string, error) {
	candidates := []string{
		strings.TrimSpace(os.Getenv("XRAY_BIN")),
		filepath.Join(os.Getenv("HOME"), "xray", "xray"),
		"/usr/local/bin/xray",
		"/opt/homebrew/bin/xray",
	}

	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}

		info, err := os.Stat(candidate)
		if err == nil && !info.IsDir() {
			return candidate, nil
		}
	}

	if path, err := exec.LookPath("xray"); err == nil {
		return path, nil
	}

	return "", errors.New("xray binary not found; set XRAY_BIN or install xray for this platform")
}

func getFreeTCPPort() (int, error) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	defer listener.Close()

	address, ok := listener.Addr().(*net.TCPAddr)
	if !ok {
		return 0, errors.New("failed to allocate local TCP port")
	}

	return address.Port, nil
}

func waitForSocksReady(port int, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	address := net.JoinHostPort("127.0.0.1", fmt.Sprintf("%d", port))

	for time.Now().Before(deadline) {
		connection, err := net.DialTimeout("tcp", address, 250*time.Millisecond)
		if err == nil {
			_ = connection.Close()
			return nil
		}

		time.Sleep(150 * time.Millisecond)
	}

	return errors.New("xray socks inbound did not start in time")
}

func measureThroughSocks(socksPort int) (int, error) {
	dialer, err := proxy.SOCKS5("tcp", net.JoinHostPort("127.0.0.1", fmt.Sprintf("%d", socksPort)), nil, proxy.Direct)
	if err != nil {
		return 0, err
	}

	transport := &http.Transport{
		DialContext: func(ctx context.Context, network string, address string) (net.Conn, error) {
			return dialer.Dial(network, address)
		},
		ForceAttemptHTTP2:   true,
		MaxIdleConns:        1,
		IdleConnTimeout:     5 * time.Second,
		TLSHandshakeTimeout: 5 * time.Second,
	}
	defer transport.CloseIdleConnections()

	client := &http.Client{
		Timeout:   10 * time.Second,
		Transport: transport,
	}

	request, err := http.NewRequest(http.MethodGet, "https://cp.cloudflare.com/generate_204", nil)
	if err != nil {
		return 0, err
	}
	request.Header.Set("User-Agent", "BlancVPN-LatencyProbe/0.1")

	startedAt := time.Now()
	response, err := client.Do(request)
	if err != nil {
		return 0, err
	}
	defer response.Body.Close()
	_, _ = io.Copy(io.Discard, response.Body)

	latencyMs := time.Since(startedAt).Milliseconds()
	if latencyMs <= 0 {
		latencyMs = 1
	}

	return int(latencyMs), nil
}

func formatProbeError(baseErr error, stderr []byte, stdout []byte) error {
	details := trimResponseBody(stderr)
	if details == "<empty>" {
		details = trimResponseBody(stdout)
	}

	if details == "<empty>" {
		return baseErr
	}

	return fmt.Errorf("%w: %s", baseErr, details)
}

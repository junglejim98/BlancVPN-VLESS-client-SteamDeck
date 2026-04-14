package main

import (
	"encoding/json"
	"errors"
	"fmt"
	neturl "net/url"
	"os"
	"path/filepath"
	"strings"
)

func writeProbeConfig(serverURL string, socksPort int) (string, func(), error) {
	configBytes, err := buildProbeConfig(serverURL, socksPort)
	if err != nil {
		return "", nil, err
	}

	tempDir, err := os.MkdirTemp("", "blancvpn-xray-probe-*")
	if err != nil {
		return "", nil, err
	}

	configPath := filepath.Join(tempDir, "config.json")
	if err := os.WriteFile(configPath, configBytes, 0o600); err != nil {
		_ = os.RemoveAll(tempDir)
		return "", nil, err
	}

	return configPath, func() {
		_ = os.RemoveAll(tempDir)
	}, nil
}

func buildProbeConfig(serverURL string, socksPort int) ([]byte, error) {
	return buildXrayConfig(serverURL, socksPort, false, false)
}

func writeRuntimeConfig(serverURL string) (string, error) {
	configBytes, err := buildXrayConfig(serverURL, 1080, true, true)
	if err != nil {
		return "", err
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	configDir := filepath.Join(homeDir, ".config", "xray")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		return "", err
	}

	configPath := filepath.Join(configDir, "config.json")
	if err := os.WriteFile(configPath, configBytes, 0o600); err != nil {
		return "", err
	}

	return configPath, nil
}

func buildXrayConfig(serverURL string, socksPort int, udpEnabled bool, includeLogFiles bool) ([]byte, error) {
	parsedURL, err := neturl.Parse(strings.TrimSpace(serverURL))
	if err != nil {
		return nil, err
	}

	address := parsedURL.Hostname()
	if address == "" {
		return nil, errors.New("server host is empty")
	}

	serverPort := 443
	if parsedURL.Port() != "" {
		fmt.Sscanf(parsedURL.Port(), "%d", &serverPort)
	}

	query := parsedURL.Query()
	security := defaultString(query.Get("security"), "tls")
	networkType := defaultString(query.Get("type"), "tcp")
	sni := defaultString(query.Get("sni"), address)
	flow := strings.TrimSpace(query.Get("flow"))
	fingerprint := defaultString(query.Get("fp"), "chrome")
	publicKey := strings.TrimSpace(query.Get("pbk"))
	shortID := strings.TrimSpace(query.Get("sid"))
	path := defaultString(query.Get("path"), "/")
	hostHeader := strings.TrimSpace(query.Get("host"))
	serviceName := strings.TrimSpace(query.Get("serviceName"))
	headerType := strings.TrimSpace(query.Get("headerType"))
	allowInsecure := query.Get("allowInsecure") == "1" || strings.EqualFold(query.Get("allowInsecure"), "true")

	streamSettings := map[string]any{
		"network":  networkType,
		"security": security,
	}

	switch security {
	case "tls":
		tlsSettings := map[string]any{
			"serverName": sni,
		}
		if fingerprint != "" {
			tlsSettings["fingerprint"] = fingerprint
		}
		if allowInsecure {
			tlsSettings["allowInsecure"] = true
		}
		if alpn := parseCSVValues(query.Get("alpn")); len(alpn) > 0 {
			tlsSettings["alpn"] = alpn
		}
		streamSettings["tlsSettings"] = tlsSettings
	case "reality":
		streamSettings["realitySettings"] = map[string]any{
			"serverName":  sni,
			"fingerprint": fingerprint,
			"publicKey":   publicKey,
			"shortId":     shortID,
		}
	case "", "none":
		streamSettings["security"] = "none"
	}

	switch networkType {
	case "ws":
		wsSettings := map[string]any{
			"path": path,
		}
		if hostHeader != "" {
			wsSettings["headers"] = map[string]any{
				"Host": hostHeader,
			}
		}
		streamSettings["wsSettings"] = wsSettings
	case "grpc":
		streamSettings["grpcSettings"] = map[string]any{
			"serviceName": serviceName,
		}
	case "tcp":
		if headerType != "" && headerType != "none" {
			streamSettings["tcpSettings"] = map[string]any{
				"header": map[string]any{
					"type": headerType,
				},
			}
		}
	}

	user := map[string]any{
		"id":         parsedURL.User.Username(),
		"encryption": "none",
	}
	if flow != "" {
		user["flow"] = flow
	}

	logConfig := map[string]any{
		"loglevel": "warning",
	}
	if includeLogFiles {
		logConfig["error"] = "/tmp/xray_error.log"
		logConfig["access"] = "/tmp/xray_access.log"
	}

	config := map[string]any{
		"log": logConfig,
		"inbounds": []any{
			map[string]any{
				"listen":   "127.0.0.1",
				"port":     socksPort,
				"protocol": "socks",
				"settings": map[string]any{
					"udp": udpEnabled,
				},
			},
		},
		"outbounds": []any{
			map[string]any{
				"protocol": "vless",
				"settings": map[string]any{
					"vnext": []any{
						map[string]any{
							"address": address,
							"port":    serverPort,
							"users":   []any{user},
						},
					},
				},
				"streamSettings": streamSettings,
			},
		},
	}

	return json.MarshalIndent(config, "", "  ")
}

func defaultString(value string, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}

	return strings.TrimSpace(value)
}

func parseCSVValues(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}

	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))

	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		result = append(result, trimmed)
	}

	return result
}

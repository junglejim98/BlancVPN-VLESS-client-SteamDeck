package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net"
	"net/http"
	neturl "net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"golang.org/x/net/proxy"
)

// App struct
type App struct {
	ctx context.Context
}

type AppSettings struct {
	SelectedServerURL string         `json:"selectedServerUrl"`
	Servers           []ServerOption `json:"servers"`
	SubscriptionURL   string         `json:"subscriptionUrl"`
	ProviderName      string         `json:"providerName"`
}

type ServerOption struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	URL       string `json:"url"`
	Host      string `json:"host"`
	LatencyMs int    `json:"latencyMs"`
}

type VpnBootstrapData struct {
	Servers      []ServerOption `json:"servers"`
	SelectedURL  string         `json:"selectedUrl"`
	ProviderName string         `json:"providerName"`
}

type LatencyUpdateEvent struct {
	URL       string `json:"url"`
	LatencyMs int    `json:"latencyMs"`
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

func (a *App) GetVpnBootstrap() (VpnBootstrapData, error) {
	settings, err := loadSettings()
	if err != nil {
		return VpnBootstrapData{}, err
	}

	servers := getConfiguredServers(settings)
	selectedURL := settings.SelectedServerURL

	if selectedURL != "" && !serverExists(servers, selectedURL) {
		selectedURL = ""
	}

	return VpnBootstrapData{
		Servers:      servers,
		SelectedURL:  selectedURL,
		ProviderName: getProviderName(settings),
	}, nil
}

func (a *App) SaveSelectedServer(url string) error {
	settings, err := loadSettings()
	if err != nil {
		return err
	}

	servers := getConfiguredServers(settings)
	if url != "" && !serverExists(servers, url) {
		return fmt.Errorf("unknown server url: %s", url)
	}

	settings.SelectedServerURL = url

	return saveSettings(settings)
}

func (a *App) ImportConfig(link string) (VpnBootstrapData, error) {
	servers, err := importServers(link)
	if err != nil {
		return VpnBootstrapData{}, err
	}

	if len(servers) == 0 {
		return VpnBootstrapData{}, errors.New("no VLESS servers found in imported config")
	}

	settings, err := loadSettings()
	if err != nil {
		return VpnBootstrapData{}, err
	}

	settings.SubscriptionURL = strings.TrimSpace(link)
	settings.Servers = servers
	settings.ProviderName = deriveProviderName(settings.SubscriptionURL)

	if !serverExists(servers, settings.SelectedServerURL) {
		settings.SelectedServerURL = servers[0].URL
	}

	if err := saveSettings(settings); err != nil {
		return VpnBootstrapData{}, err
	}

	return VpnBootstrapData{
		Servers:      settings.Servers,
		SelectedURL:  settings.SelectedServerURL,
		ProviderName: settings.ProviderName,
	}, nil
}

func (a *App) MeasureAllServerLatencies() (VpnBootstrapData, error) {
	settings, err := loadSettings()
	if err != nil {
		return VpnBootstrapData{}, err
	}

	servers := getConfiguredServers(settings)
	measuredServers := make([]ServerOption, len(servers))
	copy(measuredServers, servers)

	type latencyResult struct {
		index     int
		latencyMs int
	}

	results := make(chan latencyResult, len(measuredServers))
	semaphore := make(chan struct{}, 4)

	for index, server := range measuredServers {
		go func(index int, server ServerOption) {
			semaphore <- struct{}{}
			defer func() {
				<-semaphore
			}()

			latencyMs, err := measureServerLatency(server.URL)
			if err != nil {
				latencyMs = 0
			}

			results <- latencyResult{
				index:     index,
				latencyMs: latencyMs,
			}
		}(index, server)
	}

	for range measuredServers {
		result := <-results
		measuredServers[result.index].LatencyMs = result.latencyMs

		if a.ctx != nil {
			runtime.EventsEmit(a.ctx, "latency:update", LatencyUpdateEvent{
				URL:       measuredServers[result.index].URL,
				LatencyMs: result.latencyMs,
			})
		}
	}

	if settings.ProviderName == "" {
		settings.ProviderName = getProviderName(settings)
	}

	selectedURL := settings.SelectedServerURL
	if selectedURL != "" && !serverExists(measuredServers, selectedURL) {
		selectedURL = ""
	}

	return VpnBootstrapData{
		Servers:      measuredServers,
		SelectedURL:  selectedURL,
		ProviderName: settings.ProviderName,
	}, nil
}

func (a *App) MeasureSelectedServerLatency(url string) (VpnBootstrapData, error) {
	settings, err := loadSettings()
	if err != nil {
		return VpnBootstrapData{}, err
	}

	servers := getConfiguredServers(settings)
	measuredServers := make([]ServerOption, 0, len(servers))
	found := false

	for _, server := range servers {
		if server.URL == url {
			latencyMs, err := measureServerLatency(server.URL)
			if err != nil {
				return VpnBootstrapData{}, err
			}

			server.LatencyMs = latencyMs
			found = true
		}

		measuredServers = append(measuredServers, server)
	}

	if !found {
		return VpnBootstrapData{}, fmt.Errorf("unknown server url: %s", url)
	}

	if settings.ProviderName == "" {
		settings.ProviderName = getProviderName(settings)
	}

	selectedURL := settings.SelectedServerURL
	if selectedURL != "" && !serverExists(measuredServers, selectedURL) {
		selectedURL = ""
	}

	return VpnBootstrapData{
		Servers:      measuredServers,
		SelectedURL:  selectedURL,
		ProviderName: settings.ProviderName,
	}, nil
}

func loadSettings() (AppSettings, error) {
	settingsPath, err := getSettingsPath()
	if err != nil {
		return AppSettings{}, err
	}

	raw, err := os.ReadFile(settingsPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return AppSettings{}, nil
		}

		return AppSettings{}, err
	}

	var settings AppSettings
	if err := json.Unmarshal(raw, &settings); err != nil {
		return AppSettings{}, err
	}

	return settings, nil
}

func saveSettings(settings AppSettings) error {
	settingsPath, err := getSettingsPath()
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(settingsPath), 0o755); err != nil {
		return err
	}

	raw, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(settingsPath, raw, 0o644)
}

func getSettingsPath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}

	return filepath.Join(configDir, "blancvpn", "settings.json"), nil
}

func getDefaultServers() []ServerOption {
	return []ServerOption{
		{
			ID:        "nl-1",
			Label:     "🇳🇱 Netherlands, Amsterdam",
			URL:       "vless://example-nl",
			Host:      "nl.example.com",
			LatencyMs: 0,
		},
		{
			ID:        "jp-1",
			Label:     "🇯🇵 Japan, Tokyo",
			URL:       "vless://example-jp",
			Host:      "jp.example.com",
			LatencyMs: 0,
		},
	}
}

func getConfiguredServers(settings AppSettings) []ServerOption {
	if len(settings.Servers) > 0 {
		return resetServerLatencies(settings.Servers)
	}

	return getDefaultServers()
}

func serverExists(servers []ServerOption, url string) bool {
	for _, server := range servers {
		if server.URL == url {
			return true
		}
	}

	return false
}

func getProviderName(settings AppSettings) string {
	if settings.ProviderName != "" {
		return normalizeProviderName(settings.ProviderName)
	}

	if settings.SubscriptionURL != "" {
		return deriveProviderName(settings.SubscriptionURL)
	}

	return "Name of Connection"
}

func importServers(link string) ([]ServerOption, error) {
	decodedText, err := downloadAndDecode(link)
	if err != nil {
		return nil, err
	}

	lines := strings.Split(decodedText, "\n")
	servers := make([]ServerOption, 0, len(lines))

	for _, line := range lines {
		value := strings.TrimSpace(line)
		if value == "" || !strings.HasPrefix(value, "vless://") {
			continue
		}

		server, err := parseServerOption(value, len(servers)+1)
		if err != nil {
			return nil, err
		}

		servers = append(servers, server)
	}

	return servers, nil
}

func downloadAndDecode(link string) (string, error) {
	trimmedLink := strings.TrimSpace(link)

	request, err := http.NewRequest(http.MethodGet, trimmedLink, nil)
	if err != nil {
		return "", err
	}

	request.Header.Set("User-Agent", "Mozilla/5.0 (Steam Deck; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) BlancVPN/0.1")
	request.Header.Set("Accept", "text/plain, */*")
	request.Header.Set("Accept-Language", "en-US,en;q=0.9")
	request.Header.Set("Cache-Control", "no-cache")
	request.Header.Set("Pragma", "no-cache")

	client := &http.Client{
		Timeout: 20 * time.Second,
	}

	response, err := client.Do(request)
	if err != nil {
		return "", err
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return "", err
	}

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		if response.StatusCode == http.StatusTooManyRequests {
			fallbackBody, fallbackErr := downloadWithCurl(trimmedLink)
			if fallbackErr == nil {
				decoded, err := decodeBase64String(fallbackBody)
				if err != nil {
					return "", err
				}

				return string(decoded), nil
			}

			return "", fmt.Errorf(
				"unexpected status code: %d, body: %s, curl fallback failed: %v",
				response.StatusCode,
				trimResponseBody(body),
				fallbackErr,
			)
		}

		return "", fmt.Errorf("unexpected status code: %d, body: %s", response.StatusCode, trimResponseBody(body))
	}

	decoded, err := decodeBase64String(string(body))
	if err != nil {
		return "", err
	}

	return string(decoded), nil
}

func decodeBase64String(value string) ([]byte, error) {
	normalized := strings.TrimSpace(value)
	normalized = strings.ReplaceAll(normalized, "\n", "")
	normalized = strings.ReplaceAll(normalized, "\r", "")

	encodings := []*base64.Encoding{
		base64.StdEncoding,
		base64.RawStdEncoding,
		base64.URLEncoding,
		base64.RawURLEncoding,
	}

	for _, encoding := range encodings {
		decoded, err := encoding.DecodeString(normalized)
		if err == nil {
			return decoded, nil
		}
	}

	if remainder := len(normalized) % 4; remainder != 0 {
		normalized += strings.Repeat("=", 4-remainder)
	}

	for _, encoding := range encodings {
		decoded, err := encoding.DecodeString(normalized)
		if err == nil {
			return decoded, nil
		}
	}

	return nil, errors.New("failed to decode imported config as base64")
}

func downloadWithCurl(link string) (string, error) {
	command := exec.Command(
		"curl",
		"--silent",
		"--show-error",
		"--location",
		"--max-time", "20",
		"--user-agent", "Mozilla/5.0 (Steam Deck; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) BlancVPN/0.1",
		"--header", "Accept: text/plain, */*",
		"--header", "Accept-Language: en-US,en;q=0.9",
		"--header", "Cache-Control: no-cache",
		"--header", "Pragma: no-cache",
		link,
	)

	output, err := command.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("%w: %s", err, trimResponseBody(output))
	}

	return string(output), nil
}

func trimResponseBody(body []byte) string {
	text := strings.TrimSpace(string(body))
	if text == "" {
		return "<empty>"
	}

	if len(text) > 300 {
		return text[:300]
	}

	return text
}

func parseServerOption(value string, index int) (ServerOption, error) {
	parsedURL, err := neturl.Parse(strings.TrimSpace(value))
	if err != nil {
		return ServerOption{}, err
	}

	label := strings.TrimSpace(parsedURL.Fragment)
	if label != "" {
		label, err = neturl.QueryUnescape(label)
		if err != nil {
			return ServerOption{}, err
		}
	}

	host := parsedURL.Hostname()
	if label == "" {
		label = host
	}

	return ServerOption{
		ID:        fmt.Sprintf("server-%d", index),
		Label:     label,
		URL:       strings.TrimSpace(value),
		Host:      host,
		LatencyMs: 0,
	}, nil
}

func deriveProviderName(link string) string {
	parsedURL, err := neturl.Parse(strings.TrimSpace(link))
	if err != nil {
		return "Name of Connection"
	}

	host := strings.TrimSpace(parsedURL.Hostname())
	if host == "" {
		return "Name of Connection"
	}

	parts := strings.Split(host, ".")
	filtered := make([]string, 0, len(parts))
	for _, part := range parts {
		if part == "" || part == "www" {
			continue
		}
		filtered = append(filtered, part)
	}

	if len(filtered) == 0 {
		return host
	}

	base := filtered[0]
	if len(filtered) >= 2 {
		base = filtered[len(filtered)-2]
	}

	words := strings.Fields(strings.NewReplacer("-", " ", "_", " ").Replace(base))
	if len(words) == 0 {
		return host
	}

	for index, word := range words {
		if strings.EqualFold(word, "with") {
			continue
		}

		words[index] = normalizeProviderName(word)
	}

	filteredWords := make([]string, 0, len(words))
	for _, word := range words {
		if word == "" {
			continue
		}
		filteredWords = append(filteredWords, word)
	}

	if len(filteredWords) == 0 {
		return host
	}

	return strings.Join(filteredWords, " ")
}

func normalizeProviderName(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return trimmed
	}

	lower := strings.ToLower(trimmed)

	switch lower {
	case "withblancvpn":
		return "BlancVPN"
	case "blancvpn":
		return "BlancVPN"
	}

	runes := []rune(lower)
	runes[0] = []rune(strings.ToUpper(string(runes[0])))[0]
	return string(runes)
}

func resetServerLatencies(servers []ServerOption) []ServerOption {
	resetServers := make([]ServerOption, 0, len(servers))

	for _, server := range servers {
		server.LatencyMs = 0
		resetServers = append(resetServers, server)
	}

	return resetServers
}

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
	parsedURL, err := neturl.Parse(strings.TrimSpace(serverURL))
	if err != nil {
		return nil, err
	}

	address := parsedURL.Hostname()
	if address == "" {
		return nil, errors.New("server host is empty")
	}

	port := parsedURL.Port()
	if port == "" {
		port = "443"
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

	config := map[string]any{
		"log": map[string]any{
			"loglevel": "warning",
		},
		"inbounds": []any{
			map[string]any{
				"listen":   "127.0.0.1",
				"port":     socksPort,
				"protocol": "socks",
				"settings": map[string]any{
					"udp": false,
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

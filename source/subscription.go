package main

import (
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"net/http"
	neturl "net/url"
	"os/exec"
	"strings"
	"time"
)

func getDefaultServers() []ServerOption {
	return []ServerOption{}
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

	return defaultProvider
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

	request.Header.Set("User-Agent", appUserAgent)
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
		"--user-agent", appUserAgent,
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
		return defaultProvider
	}

	host := strings.TrimSpace(parsedURL.Hostname())
	if host == "" {
		return defaultProvider
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

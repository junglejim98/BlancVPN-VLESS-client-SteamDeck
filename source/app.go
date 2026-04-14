package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	goruntime "runtime"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) GetVpnBootstrap() (VpnBootstrapData, error) {
	settings, err := loadSettings()
	if err != nil {
		return VpnBootstrapData{}, err
	}

	return buildVpnBootstrap(settings, getConfiguredServers(settings)), nil
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

	return buildVpnBootstrap(settings, settings.Servers), nil
}

func (a *App) InstallDependencies() (string, error) {
	switch goruntime.GOOS {
	case "darwin":
		if err := installXrayForCurrentPlatform(); err != nil {
			return "", err
		}

		return "Xray installed", nil
	case "linux":
		if err := installXrayForCurrentPlatform(); err != nil {
			return "", err
		}

		if err := installTun2socksForLinux(); err != nil {
			return "", err
		}

		return "Dependencies installed", nil
	default:
		return "", fmt.Errorf("unsupported platform: %s", goruntime.GOOS)
	}
}

func (a *App) GetDependencyStatus() DependencyStatus {
	return getDependencyStatus()
}

func (a *App) GetConnectionStatus() RuntimeStatus {
	return getConnectionStatus()
}

func (a *App) Connect(url string) error {
	if goruntime.GOOS != "linux" {
		return errors.New("full VPN tunnel is currently supported only on Linux/Steam Deck")
	}

	if !dependenciesInstalled() {
		return errors.New("dependencies are not installed")
	}

	trimmedURL := strings.TrimSpace(url)
	if trimmedURL == "" {
		return errors.New("server url is required")
	}

	if _, err := writeRuntimeConfig(trimmedURL); err != nil {
		return err
	}

	serverIP, err := resolveServerIPv4(trimmedURL)
	if err != nil {
		return err
	}

	scriptPath, err := resolveShellScriptPath("start-vpn.sh")
	if err != nil {
		return err
	}

	command := exec.Command("bash", scriptPath)
	command.Env = append(os.Environ(),
		"VPN_SERVER_IP="+serverIP,
		fmt.Sprintf("SOCKS_PORT=%d", runtimeSocksPort),
	)

	output, err := command.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to start vpn: %w: %s", err, strings.TrimSpace(string(output)))
	}

	if status := getConnectionStatus(); status != RuntimeStatusConnected {
		return fmt.Errorf("vpn start finished but runtime is not connected: %s", status)
	}

	return nil
}

func (a *App) Disconnect() error {
	if goruntime.GOOS != "linux" {
		return nil
	}

	scriptPath, err := resolveShellScriptPath("stop-vpn.sh")
	if err != nil {
		return err
	}

	command := exec.Command("bash", scriptPath)
	output, err := command.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to stop vpn: %w: %s", err, strings.TrimSpace(string(output)))
	}

	return nil
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

	return buildVpnBootstrap(settings, measuredServers), nil
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

	return buildVpnBootstrap(settings, measuredServers), nil
}

func buildVpnBootstrap(settings AppSettings, servers []ServerOption) VpnBootstrapData {
	selectedURL := settings.SelectedServerURL
	if selectedURL != "" && !serverExists(servers, selectedURL) {
		selectedURL = ""
	}

	return VpnBootstrapData{
		Servers:               servers,
		SelectedURL:           selectedURL,
		ProviderName:          getProviderName(settings),
		DependenciesInstalled: dependenciesInstalled(),
	}
}

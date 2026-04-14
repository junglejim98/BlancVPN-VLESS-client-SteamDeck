package main

import "context"

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
	Servers               []ServerOption `json:"servers"`
	SelectedURL           string         `json:"selectedUrl"`
	ProviderName          string         `json:"providerName"`
	DependenciesInstalled bool           `json:"dependenciesInstalled"`
}

type DependencyStatus struct {
	Ready          bool   `json:"ready"`
	Xray           bool   `json:"xray"`
	Tun2socks      bool   `json:"tun2socks"`
	XrayConfigDir  bool   `json:"xrayConfigDir"`
	V2rayConfigDir bool   `json:"v2rayConfigDir"`
	Message        string `json:"message"`
}

type RuntimeStatus string

type LatencyUpdateEvent struct {
	URL       string `json:"url"`
	LatencyMs int    `json:"latencyMs"`
}

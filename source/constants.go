package main

const (
	appUserAgent      = "Mozilla/5.0 (Steam Deck; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) FFVless/0.1"
	probeUserAgent    = "FFVless-LatencyProbe/0.1"
	latencyProbeURL   = "https://cp.cloudflare.com/generate_204"
	defaultProvider   = "Name of Connection"
	runtimeSocksPort  = 1080
	runtimeTunName    = "tun0"
	xrayPIDPath       = "/tmp/xray.pid"
	tun2socksPIDPath  = "/tmp/tun2socks.pid"
	xrayErrorLogPath  = "/tmp/xray_error.log"
	xrayAccessLogPath = "/tmp/xray_access.log"
)

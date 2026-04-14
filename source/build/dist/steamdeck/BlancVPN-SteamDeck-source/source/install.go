package main

import (
	"archive/zip"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	goruntime "runtime"
	"time"
)

func installXrayForCurrentPlatform() error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return err
	}

	targetDir := filepath.Join(homeDir, "xray")
	v2rayConfigDir := filepath.Join(homeDir, ".config", "v2ray")
	xrayConfigDir := filepath.Join(homeDir, ".config", "xray")
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return err
	}
	if err := os.MkdirAll(v2rayConfigDir, 0o755); err != nil {
		return err
	}
	if err := os.MkdirAll(xrayConfigDir, 0o755); err != nil {
		return err
	}

	archiveURL, err := getXrayArchiveURL()
	if err != nil {
		return err
	}

	return downloadAndExtractBinary(archiveURL, targetDir, "xray", "xray")
}

func installTun2socksForLinux() error {
	if goruntime.GOOS != "linux" {
		return nil
	}

	if goruntime.GOARCH != "amd64" {
		return fmt.Errorf("unsupported linux architecture for tun2socks: %s", goruntime.GOARCH)
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		return err
	}

	targetDir := filepath.Join(homeDir, "tun2socks")
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return err
	}

	return downloadAndExtractBinary(
		"https://github.com/xjasonlyu/tun2socks/releases/download/v2.6.0/tun2socks-linux-amd64.zip",
		targetDir,
		"tun2socks-linux-amd64",
		"tun2socks",
	)
}

func getXrayArchiveURL() (string, error) {
	switch goruntime.GOOS {
	case "linux":
		if goruntime.GOARCH == "amd64" {
			return "https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip", nil
		}
	case "darwin":
		if goruntime.GOARCH == "amd64" {
			return "https://github.com/XTLS/Xray-core/releases/latest/download/Xray-macos-64.zip", nil
		}
	}

	return "", fmt.Errorf("unsupported platform for xray install: %s/%s", goruntime.GOOS, goruntime.GOARCH)
}

func downloadAndExtractBinary(archiveURL string, targetDir string, archiveBinaryName string, finalBinaryName string) error {
	archiveBody, err := downloadBinaryArchive(archiveURL)
	if err != nil {
		return err
	}

	tempDir, err := os.MkdirTemp("", "blancvpn-install-*")
	if err != nil {
		return err
	}
	defer os.RemoveAll(tempDir)

	archivePath := filepath.Join(tempDir, "archive.zip")
	if err := os.WriteFile(archivePath, archiveBody, 0o600); err != nil {
		return err
	}

	extractedBinary, err := extractBinaryFromZip(archivePath, tempDir, archiveBinaryName)
	if err != nil {
		return err
	}

	finalPath := filepath.Join(targetDir, finalBinaryName)
	if err := copyFile(extractedBinary, finalPath, 0o755); err != nil {
		return err
	}

	return nil
}

func downloadBinaryArchive(archiveURL string) ([]byte, error) {
	request, err := http.NewRequest(http.MethodGet, archiveURL, nil)
	if err != nil {
		return nil, err
	}

	request.Header.Set("User-Agent", "Mozilla/5.0 (Steam Deck; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) BlancVPN/0.1")
	request.Header.Set("Accept", "application/octet-stream, application/zip, */*")

	client := &http.Client{
		Timeout: 60 * time.Second,
	}

	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("unexpected status code: %d, body: %s", response.StatusCode, trimResponseBody(body))
	}

	return body, nil
}

func extractBinaryFromZip(archivePath string, destinationDir string, binaryName string) (string, error) {
	reader, err := zip.OpenReader(archivePath)
	if err != nil {
		return "", err
	}
	defer reader.Close()

	for _, file := range reader.File {
		if filepath.Base(file.Name) != binaryName {
			continue
		}

		input, err := file.Open()
		if err != nil {
			return "", err
		}

		outputPath := filepath.Join(destinationDir, binaryName)
		output, err := os.OpenFile(outputPath, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o755)
		if err != nil {
			input.Close()
			return "", err
		}

		_, copyErr := io.Copy(output, input)
		closeErr := output.Close()
		inputCloseErr := input.Close()
		if copyErr != nil {
			return "", copyErr
		}
		if closeErr != nil {
			return "", closeErr
		}
		if inputCloseErr != nil {
			return "", inputCloseErr
		}

		return outputPath, nil
	}

	return "", fmt.Errorf("binary %s not found in archive", binaryName)
}

func copyFile(sourcePath string, destinationPath string, mode os.FileMode) error {
	input, err := os.Open(sourcePath)
	if err != nil {
		return err
	}
	defer input.Close()

	output, err := os.OpenFile(destinationPath, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, mode)
	if err != nil {
		return err
	}

	_, copyErr := io.Copy(output, input)
	closeErr := output.Close()
	if copyErr != nil {
		return copyErr
	}
	if closeErr != nil {
		return closeErr
	}

	return os.Chmod(destinationPath, mode)
}

package main

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
)

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

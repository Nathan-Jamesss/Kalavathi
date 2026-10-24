#pragma once
// Edit these three values before uploading. Use a 2.4 GHz trusted hotspot.
#define WIFI_SSID "YOUR_HOTSPOT_NAME"
#define WIFI_PASSWORD "YOUR_HOTSPOT_PASSWORD"
#define SERVER_URL "http://192.168.137.1:8000"
// Copy deviceKey from data/config.json after starting the server once.
#define DEVICE_KEY "COPY_DEVICE_KEY_HERE"

// Revision B: photographed classic ESP32 30-pin board, NOT the XIAO C3.
// GPIO numbers are NOT physical header positions. Select ESP32 Dev Module.
#define EMERGENCY_PIN 25
#define RESET_PIN 26
#define RED_PIN 27
#define AMBER_PIN 32
#define GREEN_PIN 33
#define GPS_RX_PIN 16
#define GPS_TX_PIN 17
// Leave disabled until the buzzer is identified. Only a suitable passive piezo
// or a transistor-driven buzzer may be connected; never an unknown load directly.
#define ENABLE_PASSIVE_PIEZO 0
#define PIEZO_PIN 23

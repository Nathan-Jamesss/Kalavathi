// Standalone hardware bring-up, NOT the hospital/backend firmware.
// Board: photographed classic ESP32 30-pin; Arduino IDE: ESP32 Dev Module.
#include <Arduino.h>
#include <TinyGPSPlus.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#if !defined(CONFIG_IDF_TARGET_ESP32)
#error "Select ESP32 Dev Module for the large classic ESP32 board."
#endif

// Enable only after the corresponding hardware checks in the guide.
#define ENABLE_GPS 0
#define ENABLE_OLED 1
#define ENABLE_ACTIVE_BUZZER_DRIVER 0

// true = NO contact closes to GND when pressed. false = NC opens when pressed.
constexpr bool EMERGENCY_ACTIVE_LOW = true;
constexpr uint8_t EMERGENCY_PIN = 25, RESET_PIN = 26;
constexpr uint8_t RED_PIN = 27, AMBER_PIN = 32, GREEN_PIN = 33;
constexpr uint8_t GPS_RX_PIN = 16, GPS_TX_PIN = 17, BUZZER_PIN = 23;
constexpr uint8_t OLED_CLK = 18, OLED_DATA = 19, OLED_RES = 21;
constexpr uint8_t OLED_DC = 22, OLED_CS = 14;

// Software SPI intentionally uses D19 for DATA, leaving D23 for buzzer control.
Adafruit_SSD1306 screen(128, 64, OLED_DATA, OLED_CLK, OLED_DC, OLED_RES, OLED_CS);
TinyGPSPlus gps;

enum class BenchState { Ready, Pending, Approved, Refused, Cancelled };
// Explicit declaration avoids Arduino-generated prototypes preceding this enum.
void setState(BenchState next);
BenchState state = BenchState::Ready;
unsigned long screenAt = 0, beepAt = 0;
unsigned int presses = 0;
bool screenReady = false, beepOn = false;

struct DebouncedButton {
  uint8_t pin;
  bool activeLow;
  bool lastRaw = HIGH, stable = HIGH, armed = false;
  unsigned long changedAt = 0;
  void begin() {
    pinMode(pin, INPUT_PULLUP);
    lastRaw = stable = digitalRead(pin);
    armed = !isActive(stable);
  }
  bool isActive(bool level) const { return activeLow ? level == LOW : level == HIGH; }
  bool pressed() {
    bool raw = digitalRead(pin);
    if (raw != lastRaw) { lastRaw = raw; changedAt = millis(); }
    if (raw != stable && millis() - changedAt >= 45) {
      stable = raw;
      if (!isActive(stable)) armed = true;
      else if (armed) { armed = false; return true; }
    }
    return false;
  }
};
DebouncedButton emergency{EMERGENCY_PIN, EMERGENCY_ACTIVE_LOW};
DebouncedButton resetButton{RESET_PIN, true};

const char* stateText() {
  switch (state) {
    case BenchState::Pending: return "WAITING";
    case BenchState::Approved: return "BENCH APPROVED";
    case BenchState::Refused: return "BENCH REFUSED";
    case BenchState::Cancelled: return "CANCELLED";
    default: return "READY";
  }
}
void feedbackBeep() {
#if ENABLE_ACTIVE_BUZZER_DRIVER
  digitalWrite(BUZZER_PIN, HIGH); beepAt = millis(); beepOn = true;
#endif
}
void setState(BenchState next) {
  state = next;
  digitalWrite(RED_PIN, state == BenchState::Refused);
  digitalWrite(AMBER_PIN, state == BenchState::Pending);
  digitalWrite(GREEN_PIN, state == BenchState::Approved);
  Serial.print("Bench status: "); Serial.println(stateText());
}
bool gpsFresh() {
#if ENABLE_GPS
  return gps.location.isValid() && gps.location.age() < 3000;
#else
  return false;
#endif
}
void drawScreen() {
#if ENABLE_OLED
  if (!screenReady) return;
  screen.clearDisplay(); screen.setTextColor(SSD1306_WHITE);
  screen.setTextSize(1); screen.setCursor(0, 0);
  screen.println("KALAVATHI BENCH TEST");
  screen.setCursor(0, 14); screen.println(stateText());
  screen.setCursor(0, 26); screen.print("Presses: "); screen.println(presses);
#if ENABLE_GPS
  if (gpsFresh()) {
    screen.setCursor(0, 38); screen.print("Lat "); screen.println(gps.location.lat(), 5);
    screen.setCursor(0, 50); screen.print("Lon "); screen.println(gps.location.lng(), 5);
  } else {
    screen.setCursor(0, 38); screen.println("GPS: searching/stale");
    screen.setCursor(0, 50); screen.print("RX chars: "); screen.println(gps.charsProcessed());
  }
#else
  screen.setCursor(0, 38); screen.println("GPS disabled for test");
  screen.setCursor(0, 50); screen.println("Serial g/r/c/i");
#endif
  screen.display();
#endif
}
void setup() {
  Serial.begin(115200);
  pinMode(RED_PIN, OUTPUT); pinMode(AMBER_PIN, OUTPUT); pinMode(GREEN_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT); digitalWrite(BUZZER_PIN, LOW);
  emergency.begin(); resetButton.begin();
#if ENABLE_GPS
  Serial2.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
#endif
#if ENABLE_OLED
  screenReady = screen.begin(SSD1306_SWITCHCAPVCC);
  // SPI begin() cannot confirm the physical controller or detect missing wires.
  if (!screenReady) Serial.println("OLED buffer allocation failed; continue without screen.");
#endif
  setState(BenchState::Ready);
  Serial.println("Hardware bench only: no WiFi, hospital approval or persistent quota.");
  Serial.println("Commands: p=pending, g=bench green, r=bench red, c=cancel, i=idle, z=reset.");
}
void loop() {
#if ENABLE_GPS
  while (Serial2.available()) gps.encode(Serial2.read());
#endif
  if (emergency.pressed()) {
    // Release/twist-release between presses; no long-press interpretation here.
    if (state == BenchState::Pending || state == BenchState::Approved) setState(BenchState::Cancelled);
    else { ++presses; setState(BenchState::Pending); }
    feedbackBeep();
  }
  if (resetButton.pressed()) { presses = 0; setState(BenchState::Ready); feedbackBeep(); }
  while (Serial.available()) {
    switch (Serial.read()) {
      case 'p': setState(BenchState::Pending); break;
      case 'g': setState(BenchState::Approved); break;
      case 'r': setState(BenchState::Refused); break;
      case 'c': setState(BenchState::Cancelled); break;
      case 'i': setState(BenchState::Ready); break;
      case 'z': presses = 0; setState(BenchState::Ready); break;
    }
  }
  if (beepOn && millis() - beepAt >= 100) { digitalWrite(BUZZER_PIN, LOW); beepOn = false; }
  if (millis() - screenAt >= 250) { screenAt = millis(); drawScreen(); }
  delay(1);
}

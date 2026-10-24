# Kalavathi hardware connections and starter Arduino code

Updated 22 October 2026. This is the current connection reference for the parts
identified in this chat. It supersedes the earlier ESP32-C3 pin mapping and adds
the seven-pin OLED. Read the power checks before applying power.

## 1 What we are building

There are two separate hardware assemblies.

**Main button unit:** large ESP32, emergency button, reset button, red/yellow/green
status LEDs, NEO-6M GPS, its antenna, and the small OLED. A buzzer can be fitted
through a transistor driver after its rating is identified.

**Traffic junction unit:** Arduino Uno R3 and twelve LEDs representing four
junctions. Each junction has one red, one yellow and one green LED.

The large ESP32 handles the request device. The Uno handles the model traffic
lights. The laptop links them: ESP32 over Wi-Fi, Uno over USB serial. Do not wire
ESP32 pins directly to Uno pins. The Uno replaces the classic Nano requested in
the project document for this twelve-LED task.

No secure element is fitted. Software usage limits do not provide hardware tamper
resistance. The standalone starter code later in this guide does not implement
the backend/hospital system or any persistent quota.

## 2 Component types and quantities

| Component | Type or identification | Quantity and purpose |
|---|---|---|
| Main controller | Large classic ESP32 30-pin board, micro-USB, onboard PCB Wi-Fi antenna; photo `components/esp 32 normal.jpeg` | 1; reads controls and drives indicators/display |
| Small ESP boards | Seeed Studio XIAO ESP32C3 | Spares; do not use this guide's pins on them |
| Junction controller | Arduino Uno R3/ATmega328P-compatible | 1; replaces classic Nano for junction LEDs |
| Emergency switch | LAY37 / LAY7 marking, red mushroom, two visible screw terminals | 1; verify normally-open/closed and latching/momentary behaviour |
| Reset switch | Small normally-open tactile push button | 1; resets demo state, not the ESP32 EN pin |
| Main status LEDs | Separate two-legged red, yellow and green LEDs | 3 total |
| Junction LEDs | Separate two-legged red, yellow and green LEDs | 12 total: four of each colour |
| LED resistors | Confirmed 330 Ω; 1 kΩ is also a dimmer option | 15 total, one per LED |
| GPS | GY-NEO6MV2 breakout carrying NEO-6M-0-001, header VCC/RX/TX/GND | 1; real outdoor position input |
| GPS antenna | Coax-fed patch-like antenna and mating GPS RF connector | 1; verify RF/active-bias compatibility rather than assuming from shape |
| GPS series resistor | 1 kΩ | 1; series connection on GPS TX, not a voltage level shifter |
| Display | 0.96-inch seven-pin SPI OLED, GND/VCC/D0/D1/RES/DC/CS | 1; exact controller/resolution unconfirmed; starter assumes SSD1306 128×64 |
| Display header | Soldered seven-pin header or secure soldered wires | 1 set; holes alone do not hold jumper contacts reliably |
| Buzzer | User's two-terminal sounder has no readable rating | 1 optional; identify before powering |
| Buzzer transistor | 2N3904 NPN or verified suitable equivalent | 1 optional; switches buzzer current |
| Buzzer diode | 1N4148 for the specified small-load reference circuit | 1 optional; clamp path for inductive sounder |
| Buzzer resistors | 1 kΩ base resistor and 100 kΩ base-to-ground resistor | 1 each, optional driver |
| Optional button pull-ups | 10 kΩ | 2; not required for this bench code because INPUT_PULLUP is enabled |
| Bypass/filter capacitors | 100 nF ×2 for GPS/buzzer; optionally another ×2 for buttons; 10 µF ×1 at GPS | Check availability; use >=10 V ratings on 5 V rails |
| Wiring and power | Breadboard, jumpers, ESP32 micro-USB data cable and Uno USB data cable | One working set; each board gets its own USB cable |

Parts left aside: MCP2515 CAN board, Pico, infrared sensors and extra ESP boards.
They have no role in this version. The screen is an intentional addition to the
original documents. GPS is used outdoors; indoor demo position is simulated.

### Resistor colours

| Resistance | Common four-band code |
|---|---|
| 330 Ω | Orange – Orange – Brown – Gold |
| 1 kΩ | Brown – Black – Red – Gold |
| 10 kΩ | Brown – Black – Orange – Gold |
| 100 kΩ | Brown – Black – Yellow – Gold |

The top resistor in the earlier photo appeared to be 330 Ω; colours were not
certain. Confirm bands or measure it. Do not substitute the possibly 1 Ω middle
resistor for an LED resistor. The 330 Ω choice applies to LEDs, not automatically
to the GPS or transistor base. Resistors can face either direction.

## 3 Identify the correct ESP32

Use the large board from `components/esp 32 normal.jpeg`. With its PCB antenna
at the top and micro-USB at the bottom, D25/D26/D27/D32/D33 are on the left;
RX2/D18/D19/D21/D22/D23/D14 labels identify the other required signals (D14 is
on the left). Read the labels rather than counting physical header positions.

In Arduino IDE select **ESP32 Dev Module**, not ESP32C3 or ESP32-S3. Do not use
GPIO6/7/10 from the earlier C3 diagram: classic ESP32 uses those for flash.

## 4 Power and common ground

1. Unplug USB before installing or moving wires.
2. For initial setup use **laptop USB → large ESP32 micro-USB**. This powers it
   and provides the programming/debug connection.
3. Connect **one ESP32 GND pin → breadboard ground rail**. Put LED short legs,
   switch ground wires, GPS GND, screen GND and transistor emitter on that rail.
4. Breadboard rails can be split midway. Use continuity testing and a bridging
   wire if necessary; do not assume the full coloured strip is connected.
5. Later a power bank may power the ESP32 through the same micro-USB connector.
   Disconnect the laptop cable first. The backend laptop still needs to run for
   the full network demo; the ESP32 must join its network.
6. Power the Uno with its own laptop USB data cable. A power bank alone would not
   carry the laptop serial commands, so the Uno would revert to all-red.
7. Do not join either board's 5 V power rail to the other board or attach external
   power while its USB supply is connected. No extra ESP32–Uno signal/ground
   cable is needed for the Wi-Fi/USB architecture.

Measure the large ESP32's **VIN-to-GND** and **3V3-to-GND** with USB attached.
Expected values are approximately 5 V and 3.3 V. The GPS power branch below assumes
the usual regulated GY-NEO6MV2 input circuit, whose exact regulator marking was not
readable. Do not treat the photo or simulation as measurement of those rails.

## 5 Main unit wiring

### 5.1 Red, yellow and green LEDs

| ESP32 label | Exact wire path | Meaning |
|---|---|---|
| D27 | D27 → 330 Ω resistor → red LED long leg | Refused |
| D32 | D32 → 330 Ω resistor → yellow LED long leg | Pending |
| D33 | D33 → 330 Ω resistor → green LED long leg | Approved |
| GND | Every LED short leg → ground rail → ESP32 GND | Current return |

Use a separate resistor for every LED. If legs were cut, the flat body edge usually
marks the cathode; use a diode test if unsure. A confirmed 1 kΩ resistor can be
used instead, but the LED may be dimmer. The resistor limits current; never omit it.

### 5.2 Emergency mushroom switch

The pictured switch has **two screw terminals**, with no separate COM/NO labelling
established from the photos:

- **ESP32 D25 → either screw terminal.**
- **ESP32 GND → the other screw terminal.**
- No external resistor for the starter code: it enables the internal pull-up.
- The 660 V / 10 A markings are switch ratings, not a supply requirement.
- Use only dry switch contacts; no supply goes to this switch.

With all power disconnected, test continuity:

| Released | Pressed | Contact behaviour | Starter-code setting |
|---|---|---|---|
| Open/no beep | Closed/beep | Normally open | `EMERGENCY_ACTIVE_LOW = true` |
| Closed/beep | Open/no beep | Normally closed | `EMERGENCY_ACTIVE_LOW = false` |

Both arrangements use the same two wires. The setting changes the interpretation.
If the button stays down, twist-release between presses. The starter code ignores
a switch held active during boot until it is released and pressed again. A held
latching contact creates one event, not many. It does not implement long-press
cancel; that feature in the DOCX needs momentary-button-specific final firmware.

### 5.3 Small demo-reset button

- **ESP32 D26 → one switched contact.**
- **ESP32 GND → the opposite switched contact.**
- No external resistor needed with INPUT_PULLUP.
- Do not connect it to the board's EN pin.

For a four-legged tactile switch, two legs on a side may already be joined.
Choose a pair that becomes connected only while pressed. Continuity-test it.
The software uses this button to clear the bench press count and return to Ready.

### 5.4 NEO-6M GPS and antenna

| GPS header pin | Exact connection |
|---|---|
| VCC | Intended: ESP32 **VIN**, with no series resistor in power, after supply verification |
| GND | ESP32 GND/common ground rail |
| TX | GPS TX → **1 kΩ resistor** → ESP32 **RX2/GPIO16** |
| RX | Leave disconnected |
| RF socket | Matching GPS antenna coax connector; not an ESP32 pin |

The breakout VCC input supplies its onboard regulator. The bare GPS chip and
ESP32 GPIOs must not receive 5 V. Before attaching the data wire, verify the GPS
regulator output/chip supply is near 3.3 V; if it is wrong or overheating, stop.
The series resistor is not a level shifter; TX is assumed to be 3.3 V logic.
Keep this branch disconnected if those checks cannot yet be made.

Recommended local bypass: 100 nF plus 10 µF between GPS VCC and GND, near the
header. Electrolytic positive to VCC, negative to GND. These capacitors help supply
stability; they do not correct an incorrect supply voltage.

The GPS uses hardware UART2 at 9600 baud, 8N1 initially. ESP32 TX2/GPIO17 is reserved
by code but left unwired; do not connect TX to TX. Actual baud may differ if the
GPS was previously configured. Receiving NMEA characters does not prove a fix.
Test outdoors with the antenna's actual radiating face toward open sky. The photo
showed its back; neither antenna frequency nor active-bias compatibility was
established solely from the picture. Fit its matching coax plug gently, not forcibly.

### 5.5 Seven-pin SPI OLED screen

The front labels are **GND, VCC, D0, D1, RES, DC, CS**. This is not the four-pin
I²C module. Use the original labelled SPI configuration; do not move the rear
configuration resistors. Its data/clock labels are D1/D0, not ESP32 D1/D0.

| Screen pin | ESP32 label | Purpose |
|---|---|---|
| GND | GND | Ground |
| VCC | **3V3** | 3.3 V supply; not VIN |
| D0 | **D18** | SPI clock |
| D1 | **D19** | SPI data from ESP32 to screen |
| RES | **D21** | Screen reset; not ESP32 EN |
| DC | **D22** | Data/command selection |
| CS | **D14** | Screen selection |

No series resistors are required in these seven connections. The starter uses
software SPI so D19 can carry data while D23 stays free for the buzzer. Do not
substitute default MOSI D23 without changing the design.

Solder a seven-pin header or suitable wires. Loose wires through unsoldered holes
are unreliable. Avoid damaging the ribbon cable while soldering.

The board says 0.96 OLED, but the photos do not prove its controller/resolution.
The starter assumes **SSD1306, 128×64**. A different controller needs its matching
library/constructor; do not change power voltage to fix a blank display. SPI
initialisation cannot automatically prove that the physical screen is connected.

### 5.6 Optional buzzer through a transistor

Do not connect the unidentified sounder straight to an ESP32 GPIO. First identify
its voltage/current/type or use a known **5 V active buzzer, nominal <=20 mA**, rated
for the actual supply range. The reference driver is:

| Component terminal | Connection |
|---|---|
| ESP32 D23 | Through **1 kΩ resistor** to Q1 base |
| Q1 | **2N3904 NPN**, with actual manufacturer E/B/C pin order checked |
| Q1 emitter | GND |
| Q1 collector | Buzzer minus |
| Buzzer plus | Verified USB-derived VIN/5 V |
| 100 kΩ resistor | Between Q1 base and GND |
| 1N4148 diode banded end/cathode | Buzzer plus |
| 1N4148 diode other end/anode | Buzzer minus/Q1 collector |
| Optional 100 nF bypass | Across buzzer supply and GND, locally |

The transistor switches load current; the 1 kΩ limits base current, 100 kΩ keeps
the buzzer off while the pin floats, and the diode provides an inductive clamp
path. This does not establish a safe voltage for an unknown sounder. A passive
sounder needs a waveform rather than the active-buzzer on/off pulse in this starter.
Leave the buzzer disconnected and its code flag at 0 until verified.

## 6 Complete ESP32 pin summary

| ESP32 pin | Part |
|---|---|
| D25 | Emergency switch |
| D26 | Demo-reset button |
| D27 | Resistor → red LED |
| D32 | Resistor → yellow LED |
| D33 | Resistor → green LED |
| RX2/GPIO16 | GPS TX through 1 kΩ |
| TX2/GPIO17 | Unwired reserved GPS transmit |
| D18 | Screen D0/clock |
| D19 | Screen D1/data |
| D21 | Screen RES |
| D22 | Screen DC |
| D14 | Screen CS |
| D23 | Optional transistor base through 1 kΩ |
| 3V3 | Screen VCC, optional external button pull-ups |
| VIN | Verified GPS breakout VCC and rated buzzer supply |
| GND | All component grounds within this unit |

## 7 Arduino Uno traffic-junction wiring

Every LED is wired **Uno pin → its own 330 Ω resistor → LED long leg**.
Every short leg goes to an Uno GND rail. Confirmed 1 kΩ resistors are an alternative
with lower brightness. Do not share one resistor among several LEDs.

| Junction | Red | Yellow/amber | Green |
|---|---|---|---|
| J1 | D2 → resistor → red LED | D3 → resistor → yellow LED | D4 → resistor → green LED |
| J2 | D5 → resistor → red LED | D6 → resistor → yellow LED | D7 → resistor → green LED |
| J3 | D8 → resistor → red LED | D9 → resistor → yellow LED | D10 → resistor → green LED |
| J4 | D11 → resistor → red LED | D12 → resistor → yellow LED | D13 → resistor → green LED |

Use **twelve resistors**, not four. Keep D0/RX and D1/TX free for USB serial.
The Uno's built-in D13 LED may follow J4 green; this is expected. Power by its
own USB data cable. Do not connect Uno 5 V outputs to ESP32 GPIOs.

The Uno starter runs at 115200 baud. It receives four letters with spaces and a
newline. R=red, A=amber, G=green:

| Serial command | Result |
|---|---|
| `R R R R` | All four junctions red |
| `G R R R` | J1 green, others red |
| `A R R R` | J1 yellow, others red |
| `R G R R` | J2 green |
| `R R G R` | J3 green |
| `R R R G` | J4 green |

Invalid commands and commands with multiple greens force all-red. If no valid
command arrives for three seconds, the lights return to all-red. Send repeated
commands from the bridge to hold a state. A one-off Serial Monitor command will
therefore show its colour only briefly. This is a simplified model, not a real
traffic intersection safety controller.

## 8 Arduino IDE setup and first test

### ESP32 standalone bench sketch

Open `firmware/kalavathi_bench/kalavathi_bench.ino`. Install **esp32 by Espressif
Systems**, select **ESP32 Dev Module**, and select the board's USB port.
Install these through Library Manager, including their requested dependencies:

- TinyGPSPlus by Mikal Hart.
- Adafruit GFX Library.
- Adafruit SSD1306.

Do not select a four-pin I²C display example for this seven-pin SPI wiring.
The software-SPI construction matches the pattern in Adafruit's upstream SPI
example, with our own pin assignments.

Default flags in the starter:

```cpp
#define ENABLE_GPS 0
#define ENABLE_OLED 1
#define ENABLE_ACTIVE_BUZZER_DRIVER 0
```

GPS and buzzer remain disabled until their power checks are completed. Set
`ENABLE_OLED` to 0 if the display is not yet wired. Set `EMERGENCY_ACTIVE_LOW`
according to the continuity table above. All switches should be released at boot.

Upload and open Serial Monitor at **115200 baud**. A physical emergency press
turns on yellow and increments the RAM bench count. Release/twist-release before
another press. A second press while pending/approved cancels. Reset returns Ready.

| Send in ESP32 Serial Monitor | Bench action |
|---|---|
| `p` | Pending/yellow |
| `g` | Simulated approval/green |
| `r` | Simulated refusal/red |
| `c` | Cancel/LEDs off |
| `i` | Ready/LEDs off |
| `z` | Clear RAM bench count and return Ready |

The screen says BENCH TEST. The `g` command is not hospital authentication or a
real priority grant. No Wi-Fi, backend request, persistent counter or route logic
is included in this standalone starter. GPS support only parses local position
and shows a fresh fix or a searching/stale message. It is not transmitted.

### Uno sketch

Open `firmware/kalavathi_junctions/kalavathi_junctions.ino`, select **Arduino Uno**,
and select its separate USB port. Upload. The four red LEDs should light.
Open its Serial Monitor at **115200** and set line ending to **Newline**. Test the
commands in section 7. No external libraries are required for the Uno sketch.

### Full network demonstration later

The separate existing `firmware/kalavathi_device/kalavathi_device.ino` is the
Wi-Fi/backend bench sketch with the same classic ESP32 main-button/LED pins.
It currently does not include the new OLED/GPS bench integrations. Do not assume
the two sketches merge automatically: uploading one replaces the other.

For the existing network bench, edit its `config.h` locally with hotspot credentials,
laptop URL and device key; do not copy credentials into this reference document.
Run `node server.js` on the laptop and use the browser dashboard/hospital page.

For laptop-controlled junctions, close the Uno Serial Monitor and run in a second
terminal, replacing COM5 with its actual port:

```powershell
powershell -NoProfile -File .\scripts\serial-bridge.ps1 -Port COM5
```

The bridge sends the backend's four-letter states repeatedly. Opening both Serial
Monitor and the bridge on the same Uno port can prevent connection. The standalone
ESP32 bench sketch does not send hospital requests into that backend.

## 9 Before saying the complete hardware works

- Verify resistor values and LED polarity; no loose copper shorts.
- Measure supply rails; validate the GPS regulator and buzzer rating.
- Check both switch contacts and emergency latch behaviour.
- Confirm each status LED and every individual junction output.
- Test OLED content with a compatible controller/driver; SPI init success is not detection.
- Test GPS outdoors for a valid, fresh fix, not merely incoming characters.
- Verify Uno all-red after bridge timeout and after invalid commands.
- Run power-cycle and unplug/reconnect checks on the actual boards.

The earlier twelve CircuitJS checks covered reference 1 kΩ LED branches, button
levels and a generic transistor/load. They did **not** validate the added OLED,
this complete firmware, radio/GPS hardware, or the later 330 Ω LED substitution.
The previously saved simulation remains a limited electrical model, not a full
system simulation. These starter sketches have not been compiled or flashed here.

## 10 Related files and sources

- `hardware/FINAL_MAIN_UNIT.md`: prior detailed Revision B reference.
- `hardware/main-unit-schematic.svg`: prior drawing, before the OLED addition and
  before the 330 Ω LED option; use this guide's current connection table.
- `hardware/simulation/SIMULATION_REPORT.md`: scope of the earlier model checks.
- Upstream OLED software-SPI example:
  https://github.com/adafruit/Adafruit_SSD1306/blob/master/examples/ssd1306_128x64_spi/ssd1306_128x64_spi.ino
- GPS parser: https://github.com/mikalhart/TinyGPSPlus

## 11 Complete ESP32 standalone starter sketch

The following code is copied from the accompanying `.ino` file so this Markdown
can be used by itself. Use the Arduino IDE setup and safety flags in section 8.

<!-- ESP32_CODE -->

```cpp
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
```

<!-- ESP32_CODE_END -->

## 12 Complete Arduino Uno junction sketch

The following code is copied from the accompanying Uno `.ino` file.

<!-- UNO_CODE -->

```cpp
// Arduino Uno R3. Each LED has its own confirmed 330-ohm or 1k resistor.
// Order within each group: red, amber, green. LED cathodes go to GND.
const byte pins[4][3]={{2,3,4},{5,6,7},{8,9,10},{11,12,13}};
char line[16];byte length=0;bool overflow=false;
unsigned long lastCommand=0;

void allRed(){
  for(byte j=0;j<4;j++)for(byte c=0;c<3;c++)digitalWrite(pins[j][c],c==0?HIGH:LOW);
}
void applyLine(){
  if(overflow||length!=7){allRed();return;}
  byte greens=0;
  for(byte j=0;j<4;j++){
    char c=line[j*2];
    if(c!='R'&&c!='A'&&c!='G'){allRed();return;}
    if(c=='G')greens++;
    if(j<3&&line[j*2+1]!=' '){allRed();return;}
  }
  if(greens>1){allRed();return;}
  // Turn every green off before applying the new state.
  for(byte j=0;j<4;j++)for(byte c=0;c<3;c++)digitalWrite(pins[j][c],LOW);
  for(byte j=0;j<4;j++){
    byte colour=line[j*2]=='R'?0:line[j*2]=='A'?1:2;
    digitalWrite(pins[j][colour],HIGH);
  }
  lastCommand=millis();
}
void setup(){
  for(byte j=0;j<4;j++)for(byte c=0;c<3;c++)pinMode(pins[j][c],OUTPUT);
  allRed();Serial.begin(115200);
}
void loop(){
  while(Serial.available()){
    char c=Serial.read();
    if(c=='\n'){applyLine();length=0;overflow=false;}
    else if(c!='\r'){if(length<sizeof(line)-1)line[length++]=c;else overflow=true;}
  }
  // Laptop, bridge or cable failure: no command for 3 seconds means all red.
  if(millis()-lastCommand>3000)allRed();
}
```

<!-- UNO_CODE_END -->

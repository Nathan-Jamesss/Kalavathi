# Kalavathi main button unit schematic and build specification

Revision A reference design, 21 October 2026. The schematic covers hardware set 1
only. It is not yet verified against the user's exact ESP32-C3 board, GPS breakout
regulator or buzzer. Do not power the two conditional supply connections until
those components have been identified. The requested secure element is omitted.

## The two hardware sets

1. Main emergency unit: ESP32-C3, emergency switch, demo-reset switch, three status
   LED channels, buzzer and driver, NEO-6M GPS breakout and its RF antenna, USB power.
2. Junction unit: Uno, twelve LEDs and resistors, USB connection to laptop. The Uno
   replaces the document's Nano here only; it is not needed inside the main unit.

For the documented classic ATmega328P Nano, an Uno R3 is a suitable functional
substitute for these twelve LED outputs and USB serial commands. Both expose
enough digital outputs; keep D0/D1 available for serial, use D2-D13 for the lights,
observe current limits, and change the board selection to Uno before uploading.
The footprint and USB connector differ. This is not a universal claim about every
Nano or Uno generation. The user's Uno model still needs confirming.

## Requirements traced to both source documents

Both DOCX files were reread, including the three embedded expo diagrams.

| Source | Main unit requirement | Design treatment |
|---|---|---|
| Expo §3.1 and Week 2 Day 2 | Obvious emergency push button, debounce, long-press cancellation | S1 on GPIO3, pull-up, optional RC filter; short/long press semantics must be implemented in firmware |
| Expo §3.1 | ESP32-C3 DevKitM-1, requests over Wi-Fi | Reference board U1, laptop hotspot and fixed backend address |
| Expo demonstration step 2 | Amber LED plus beep immediately after press | D2 and BZ1; do not wait for network acknowledgement to give local feedback |
| Expo §3.1 | Green granted, red refused; RGB indicator | Three separate LEDs reproduce these three states; intentional substitution for RGB package |
| Expo §3.1, Week 3 Day 4 | Physical demo reset, under 30 seconds | S2 on GPIO4, software reset endpoint; not connected to chip EN/RST |
| Expo §3.1, §4.1, Week 6 Day 1 | NEO-6M with antenna, outdoor position video | U2 GPS UART connected to ESP32 and ANT1 connected to its RF socket |
| Expo §1.1 | Indoor recorded position track; no live GPS dependency | Explicit firmware mode; GPS absence must not prevent indoor button requests |
| Expo §4.2 and Week 6 Day 3 | Laptop USB power, reconnect/recovery | U1 powered through USB only; power-on state clears active grant; reconnect state queried from backend |
| Week 3 fallback | Software counter if secure element unavailable | Explicit user-approved omission; no hardware anti-tamper or protected signing claim |

The source timeline proposes a counter in ESP32 flash. The existing first-pass
software instead stores its authoritative allowance on the laptop. Those are
different choices. A future firmware update can mirror usage to NVS, but neither
approach recreates the ATECC608A guarantee. The document's signed-request feature
is also not supplied by the current shared-key firmware.

The source's GPS-based cancellation claim is additional software logic, not an
automatic function of the GPS module. Invalid/stale/no-fix data must never be
treated as a valid vehicle position. Heading at walking/static speed is unreliable.

## Schematic conventions

Open `main-unit-schematic.svg` or the PNG. Matching net names are electrically
connected even when drawn in different panels. GND symbols all refer to one common
ground inside this unit. GPIO numbers are silicon signal names, not header positions.
This is an electrical reference schematic, not a photograph-based breadboard layout.

The reference board is Espressif ESP32-C3-DevKitM-1. Its regulator, USB interface,
EN pull-up and chip decoupling are already on the development board. They are not
parts to recreate on the breadboard. The large dual-USB board in the existing group
photo is not sufficient evidence of the user's separate C3 boards' exact model.

## Pin assignment and complete connection table

| Reference | Terminal | Connection | Notes |
|---|---|---|---|
| U1 | USB | Laptop USB data/power cable | Only power source; no external 5 V or car battery |
| U1 | GPIO3 | BTN_EMERGENCY | S1 and R1/C1 node |
| U1 | GPIO4 | BTN_RESET | S2 and R2/C2 node |
| U1 | GPIO5 | LED_RED | Through R3 to red anode |
| U1 | GPIO6 | LED_AMBER | Through R4 to amber anode |
| U1 | GPIO7 | LED_GREEN | Through R5 to green anode |
| U1 | GPIO0 | GPS_RX | Receives GPS TX through R8 |
| U1 | GPIO1 | Unconnected/reserved GPS TX | Do not attach to GPS TX; RX-to-TX crossing matters |
| U1 | GPIO10 | BUZZER_DRIVE | Through R6 to Q1 base |
| U1 | 3V3 | +3V3 | Logic and button pull-ups; potential GPS supply only after checking breakout |
| U1 | 5V | USB_5V | Use as peripheral source only if board documentation confirms USB-derived 5 V here |
| U1 | GND | GND | Common return for buttons, LEDs, GPS and buzzer driver |
| S1 | COM and NO | BTN_EMERGENCY and GND | Dry normally-open contacts only |
| R1 | 10 kΩ | +3V3 to BTN_EMERGENCY | Defined released level |
| C1 | 100 nF | BTN_EMERGENCY to GND | Optional RC/noise filter; does not replace debounce |
| S2 | Normally-open pair | BTN_RESET to GND | Find correct pair on four-leg tactile switch |
| R2/C2 | 10 kΩ / 100 nF | Same arrangement as S1 | External reset is a demo control |
| R3/R4/R5 | 1 kΩ each | GPIO to respective LED anode | Each LED needs its own resistor |
| D1/D2/D3 | Cathodes | GND | Three separate two-leg indicators |
| U2 | VCC | VGPS | Select supply after breakout identification; see below |
| U2 | GND | GND | Required for UART reference |
| U2 | TX | R8 1 kΩ then GPS_RX | Must be compatible with 3.3 V ESP32 input |
| U2 | RX and PPS | Unconnected | Standard default NMEA reception does not require configuring GPS |
| U2 | RF socket | ANT1 mating coax plug | No connection to ESP32 Wi-Fi antenna |
| C3/C4 | 100 nF / 10 µF | VGPS to GND, near GPS header | Capacitor voltage rating at least 10 V; electrolytic negative to GND |
| R6 | 1 kΩ | BUZZER_DRIVE to Q1 base | About 2.5 mA base current when high |
| R7 | 100 kΩ | Q1 base to GND | Keeps buzzer off while GPIO floats |
| Q1 | 2N3904 NPN | Emitter GND; collector BZ_LOW | Verify actual transistor E/B/C package pinout |
| BZ1 | Plus/minus | VBUZZ / BZ_LOW | Reference is a rated 5 V active buzzer drawing no more than 20 mA |
| D4 | 1N4148 | Cathode VBUZZ; anode BZ_LOW | Clamp for inductive sounder; band points toward supply |
| VBUZZ | Supply | Verified USB_5V, for specified 5 V buzzer | Do not assume user's unidentified buzzer is 5 V |

### Button compatibility

The source specifies a momentary switch. Your red mushroom switch appears to be
twist-release/latching. Verify with continuity testing, disconnected from power:
COM-NO should be open released and closed pressed. If it latches, either replace
it with a momentary switch for the source's long-press behaviour, or explicitly
use press-to-request, twist-to-release and a separate cancellation control. A
latched switch must not be interpreted as an intentional long-press cancel.
Do not silently use the momentary long-press algorithm on the latching mushroom.
Do not connect any switch lamp terminals or mains wiring.

Use approximately 40 ms software debounce. For a confirmed momentary switch,
one possible implementation is: a short release submits once, holding 2 seconds
cancels once, and releasing after a cancel must not submit a new request. That
2-second threshold is an engineering choice, not a number specified in the DOCX.

### GPS voltage is a verification point

The photo identifies a GY-NEO6MV2-style breakout, not the Waveshare board used as a
comparative reference. Their regulator circuits can differ. The NEO-6M chip itself
is not a 5 V chip. Do not infer breakout VCC tolerance from a generic listing.

Two acceptable supply arrangements, depending on the actual board:

- If documentation confirms its VCC input accepts regulated 5 V and contains the
  proper 3.3 V regulator: VGPS = verified USB_5V.
- If documentation confirms its VCC input operates correctly at 3.3 V: VGPS = +3V3,
  with adequate regulator capacity. A breakout's LDO dropout can prevent this even
  though the bare GPS chip accepts 3.3 V.

Choose only one. A connector carrying 5 V power does not prove 5 V UART logic is
safe. Confirm TX is 3.3 V compatible before connecting to GPIO0; R8 is a series
resistor, not a level shifter. If TX is actually 5 V, use a proper level shifter
or a calculated divider instead of the shown direct 3.3 V logic path.

Start with UART1, 9600 baud, 8N1, RX GPIO0. The GPS may have been reconfigured, so
check NMEA output if nothing arrives. For the intended firmware use
`Serial1.begin(9600, SERIAL_8N1, 0, 1)` and leave GPIO1's output physically
unconnected. This reserves a defined unused TX pin without relying on default
UART pin assignments. Do not use Uno-style SoftwareSerial on the C3.

The antenna coax plugs into the GPS board's matching RF socket. Confirm the
connector type mechanically; do not force it. Verify any active antenna's bias
requirements against the breakout circuit. Put the ceramic radiating face toward
open sky, not against metal or inside a closed metal box. Keep it away from the
ESP32 antenna and buzzer wiring where practical. Expect minutes for a cold fix;
receiving serial sentences is not proof of a valid position fix.

### Buzzer compatibility

The photo shows two unidentified two-terminal sounders. The diagram specifies a
known 5 V, <=20 mA active buzzer to make a definite reference circuit. Your existing
one can be used only after confirming its type, voltage and current. If it is a
compatible passive sounder, keep the transistor stage and drive a rated waveform
instead of DC. A driver does not make an unknown buzzer's voltage rating irrelevant.
For a different current rating the transistor/base resistor and clamp may need
changing. This design is for a brief feedback beep, not a vehicle siren.

## Parts used and small supporting parts to check

Use: one C3 board, emergency and reset switches, three LEDs, NEO-6M and antenna,
one identified buzzer, breadboard, wiring, USB cable, eventual enclosure. Keep the
second C3 as spare. No CAN board, Pico, screens, IR sensors, or WROOM board here.

Check your resistor collection for five 1 kΩ resistors (three LEDs, transistor
base, GPS series), two 10 kΩ resistors and one 100 kΩ resistor. Also check for one
2N3904, one 1N4148, four 100 nF capacitors (two optional button filters, GPS bypass,
and buzzer supply bypass), and one 10 µF GPS capacitor. A 100 nF capacitor across
VBUZZ/GND near the sounder is recommended and shown as C5. Keep capacitors local.
The transistor/diode/capacitors were not separately itemised in the source BOM;
they are support parts added for the chosen driver and power/noise handling.
Do not buy them twice if you already have suitable equivalents.

At 3.3 V, 1 kΩ series resistors typically give roughly 0.3–1.5 mA depending on LED
forward voltage. Verify visibility; a high-forward-voltage green LED may be dim.
Do not reduce resistance without checking LED and GPIO current. Use efficient LEDs.

## What the existing firmware does not yet implement

The previously generated sketch is a bench skeleton, not complete DOCX firmware.
It lacks GPS parsing/reporting, the document's momentary long-press cancellation,
transistor-driven active-buzzer handling, and secure/software signing. Its current
second-press cancellation and laptop-only quota differ from source behaviour.
The schematic adds GPS on GPIO0 and a transistor driver on GPIO10; simply wiring
these parts will not add the missing firmware features. The earlier direct-piezo
flag is not the driver control implementation specified here.

No firmware is changed as part of this schematic request. Resolve actual board,
switch, GPS power and buzzer identity before producing the final matching sketch.

## Staged validation before saying it works

1. With all power removed, identify switch contacts, C3 board model, regulator and
   buzzer markings. Check all resistor values and transistor package pins.
2. Power U1 alone by USB and measure its 3V3 and USB-derived 5 V rails. Do not join
   external supplies to its power headers while USB is connected.
3. Test LEDs one at a time; verify button nodes go from 3.3 V released to 0 V pressed.
4. Test the buzzer driver using the identified/rated sounder and brief commands.
5. Power GPS with the verified supply; inspect its TX signal level, then connect
   UART and confirm valid NMEA data. Test a valid fix outdoors with antenna attached.
6. Test the button over hotspot with indoor simulated position, then outdoor GPS
   mode separately. Network/GPS failure must not fabricate approval or coordinates.
7. Verify granted/refused indicators and reset, power-cycle recovery, and repeated
   presses. Only after this does this reference become a tested assembly.

## Research and similar reference implementations

- [Espressif C3 DevKitM-1 guide](https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32c3/esp32-c3-devkitm-1/user_guide.html): USB power, exposed GPIOs, GPIO2/8/9 boot strapping,
  GPIO18/19 USB, GPIO20/21 UART0. The proposed pins avoid those occupied groups.
- [Espressif UART GitHub example](https://github.com/espressif/arduino-esp32/blob/master/libraries/ESP32/examples/Serial/OnReceive_Demo/OnReceive_Demo.ino): confirms C3 UART1 and explicit RX/TX remapping. Its
  example pins are not copied because GPIO4/5 are already allocated here.
- [TinyGPSPlus upstream](https://github.com/mikalhart/TinyGPSPlus): the GPS/NMEA
  parser named in the DOCX, providing position, time, speed and course. Its
  `DeviceExample` is an integration reference; do not copy Uno SoftwareSerial
  pin examples or baud assumptions blindly onto this C3 design.
- [Waveshare UART NEO-6M guide](https://www.waveshare.com/wiki/UART_GPS_NEO-6M):
  similar hardware example confirming GPS TX-to-controller RX, default 9600 8N1,
  outdoor fix testing. Its stated supply range belongs to its own breakout.
- [u-blox NEO-6 product information](https://www.u-blox.com/en/product/neo-6-series):
  GPS module/interface family; does not identify a third-party breakout regulator.
- [Arduino Uno R3](https://docs.arduino.cc/hardware/uno-rev3/): confirms sufficient
  digital outputs and USB for the separate junction unit.
- [Adafruit transistor switching explanation](https://learn.adafruit.com/adafruit-arduino-lesson-13-dc-motors/transistors):
  comparable NPN low-side switching circuit, base-current resistor and clamp diode
  for an inductive load. Its example uses a motor and PN2222, not the unidentified
  user buzzer or the exact Q1 selection; the 20 mA reference load limit is this
  design's conservative engineering constraint.

These are subsystem references. No identical, tested end-to-end Kalavathi hardware
repository has been established. Combining examples is an engineering design
proposal, not proof that this physical assembly has already been tested.

# Kalavathi main unit revision B

21 October 2026. This supersedes the C3 reference pin mapping in Revision A.
The board choice and electrical plan are finalised. Twelve CircuitJS model checks
passed; this does not constitute physical commissioning of the actual components.

## Identified components and selection

| Photo in components | Identification | Decision |
|---|---|---|
| esp 32 normal.jpeg | Classic ESP32 30-pin development board, micro-USB, PCB Wi-Fi antenna, DevKit-V1 style | Selected; exact clone manufacturer not established |
| esp 32 c3 back.jpeg | Seeed Studio XIAO ESP32C3, printed on PCB | Suitable alternative/spare; different pin mapping and external Wi-Fi antenna connection |
| neo .jpeg | GY-NEO6MV2 breakout; NEO-6M-0-001 module; VCC/RX/TX/GND header | Selected GPS |
| antenna.jpeg | Coax-fed patch-like antenna, back/ground face shown | Intended GPS use; photograph alone cannot prove frequency or bias requirements |
| buzzer.jpg | Unmarked two-terminal sounders | Rating not identified; fit only if compatible with the specified driver/load |

The larger ESP32 is chosen for its readable labels, onboard Wi-Fi antenna and easy
bench wiring. The XIAO is also capable, but its separate Wi-Fi antenna must not be
confused with the GPS antenna. The user's instruction permits this substitution
for the DOCX's ESP32-C3 DevKitM-1. Keep the smaller boards aside.

Hardware set 1 is this main unit. Set 2 remains the Uno plus twelve junction LEDs,
connected to the laptop by USB; it has no direct signal wiring to this ESP32.
The Uno R3 substitutes for the classic Nano for that separate task. MCP2515,
Pico, screens and IR modules are not used. The secure element is omitted as requested.

## Exact pin and connection table

Orient the photographed board with antenna at top, micro-USB at bottom. Use
printed labels, not physical header numbers or the earlier C3 assignments.

| Function | Printed ESP32 label | GPIO | Connection |
|---|---|---|---|
| Emergency switch | D25, left | 25 | S1 NO/input node; S1 COM to GND |
| Demo reset | D26, left | 26 | S2 contact; opposite contact to GND |
| Red refused LED | D27, left | 27 | R3 1 kΩ → red anode; cathode GND |
| Amber pending LED | D32, left | 32 | R4 1 kΩ → yellow anode; cathode GND |
| Green approved LED | D33, left | 33 | R5 1 kΩ → green anode; cathode GND |
| GPS receive | RX2, right | 16 | GPS TX → R8 1 kΩ → RX2 |
| UART transmit | TX2, right | 17 | Reserved; physically unconnected |
| Buzzer drive | D23, right top | 23 | R6 1 kΩ → Q1 base |
| Logic rail | 3V3, right bottom | — | R1/R2 pull-ups |
| Peripheral rail | VIN, left bottom | — | USB-derived 5 V to GPS input and rated buzzer; measure first |
| Ground | GND | — | All circuit GND symbols tied together |

These assignments avoid flash pins GPIO6-11, input-only GPIO34-39, UART0 programming
pins and boot strapping pins on classic ESP32. The firmware configuration was
updated to this mapping and rejects a C3 target at compile time. Select **ESP32 Dev
Module** in Arduino IDE. The original sketch is still only a bench skeleton.

## Power, GPS and antenna

Power the ESP32 through micro-USB only. Do not connect an external supply at VIN
while USB is plugged in. Measure VIN-to-GND and 3V3-to-GND on this clone; intended
rails are approximately 5 V and 3.3 V. Board regulator capacity/thermal behaviour,
USB protection and source impedance were not simulated.

Revision B specifies USB-derived 5 V into the **regulated GY-NEO6MV2 breakout VCC
header**, never into the bare GPS chip. This is the intended standard breakout
connection, but its exact regulator marking remains unreadable. Verify the GPS
regulator/chip supply is near 3.3 V before attaching GPS TX to the ESP32. If not,
stop and identify the regulator. GPS TX must be 3.3 V logic; R8 is not a level shifter.

GPS header GND goes to common GND; RX is unused. C3 100 nF and C4 10 µF go across
the GPS input near its header. Use >=10 V rated capacitors; electrolytic minus to GND.
Future firmware: `Serial2.begin(9600, SERIAL_8N1, 16, 17)`. Check actual NMEA output
in case the module's baud rate was previously changed. Serial sentences alone do
not establish a valid position fix. Indoor mode uses simulated position, per DOCX.

ANT1 coax attaches to the GPS RF socket only. Confirm connector and antenna
frequency/bias compatibility; neither is proven by shape. The supplied image shows
the back. Point its actual radiating face toward open sky and keep it away from
the ESP32 antenna where practical. Test real GPS outdoors.

## Switches and LEDs

R1/R2 are 10 kΩ pull-ups from each input to 3.3 V. Optional C1/C2 100 nF go from
each input to GND, with software debounce still required. S2 resets the demo,
not the board: use D26, not EN. Identify the correct pair on a four-leg tactile switch.

The DOCX specifies a momentary emergency button and long-press cancel. The red
mushroom appears latching. Verify COM/NO contacts with power disconnected. Use a
momentary button for long-press behaviour, or explicitly adapt firmware for the
latching mushroom so a held emergency request is not automatically cancelled.
The present bench sketch uses second-press cancellation, not the final DOCX semantics.

Three individual LEDs substitute for the RGB package while reproducing its states.
Each has a separate 1 kΩ resistor. The generic simulated LED draws 1.69 mA; actual
LED colour, forward voltage and brightness differ. Some green LEDs may be dim.

## Buzzer driver

Reference: **5 V active buzzer, nominal <=20 mA**, supplied from verified USB_5V.
Q1 2N3904 emitter goes to GND, collector to buzzer minus, base through R6 1 kΩ to
D23. R7 100 kΩ connects base to GND. Check actual transistor E/B/C package pins.
The buzzer plus goes to supply. C5 100 nF bypasses the buzzer supply locally.

D4 1N4148 banded cathode goes to buzzer plus; anode goes to collector/buzzer minus.
The clamp is appropriate for the reference inductive switching topology, but no
actual sounder inductance or flyback transient was simulated.

Your unmarked sounders cannot be certified from the image. Identify rating/type
before fitting one, or use a known matching part. A passive sounder needs a waveform;
an active one needs on/off control. A transistor does not make the wrong supply
voltage safe. The firmware's earlier passive-piezo option stays disabled.

## Small parts to check before assembly

- Five 1 kΩ resistors: three LEDs, transistor base and GPS series.
- Two 10 kΩ pull-ups and one 100 kΩ transistor-base pull-down.
- One 2N3904 and one 1N4148, neither established in the user's photographs.
- Four 100 nF capacitors: two optional button filters, GPS and buzzer bypass.
- One 10 µF capacitor, >=10 V, for GPS input.
- One compatible rated buzzer, USB cable, breadboard and wires.

Transistor/diode/capacitors are supporting circuit parts not individually itemised
in the original source BOM. Suitable equivalents need specification checks.

## Simulation and software status

See [SIMULATION_REPORT.md](simulation/SIMULATION_REPORT.md), raw `results.json`
and checked `summary.json`. CircuitJS ran twelve settled electrical cases: button
high/low, generic LED on/off, generic NPN driver on/off and selected corners.
`node hardware/simulation/verify-results.js` passed all twelve and checked firmware
pin correspondence. Six backend tests also passed.

The driver load was a 250 Ω equivalent resistor, not a real buzzer model; transistor
and LED models were generic. Not simulated: ESP32 execution/boot, firmware, UART,
Wi-Fi, GPS fix, antenna/RF, GPS regulator, USB supply limits, heat or wiring faults.
No physical board has been flashed or measured. Firmware still needs GPS parsing,
the final switch semantics and active-buzzer handling. Changing wires alone cannot
add those features.

Both DOCX files and their diagrams were previously reviewed completely. Hardware
requirements retained are button, local amber/beep response, granted/refused
indication, separate demo reset, hotspot Wi-Fi, and GPS outdoor demonstration.
The secure element is omitted; software usage is currently stored on the laptop,
whereas the source fallback proposed ESP32 flash. There are no hardware-backed
signatures or anti-tamper guarantees in this version.

## Commissioning sequence

1. Power removed: verify values, polarity, switch contacts and transistor pins.
2. U1 alone on USB: measure VIN and 3V3.
3. Add LEDs/buttons and test each independently.
4. Add GPS power, confirm its internal rail near 3.3 V, then attach UART.
5. Identify buzzer rating, then test the driver briefly with that rated load.
6. Test GPS outdoors and Wi-Fi requests separately, then cancellation/reset/recovery.

## Sources

- [Seeed XIAO official guide](https://wiki.seeedstudio.com/XIAO_ESP32C3_Getting_Started/): photographed small-board identity and external Wi-Fi antenna arrangement.
- [Espressif GPIO reference](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/gpio.html): classic ESP32 signal restrictions; the exact clone header labels come from the user's photo.
- [Espressif UART example](https://github.com/espressif/arduino-esp32/blob/master/libraries/ESP32/examples/Serial/OnReceive_Demo/OnReceive_Demo.ino) and [TinyGPSPlus](https://github.com/mikalhart/TinyGPSPlus): UART/NMEA references.
- [Waveshare NEO-6M guide](https://www.waveshare.com/wiki/UART_GPS_NEO-6M): comparative UART/fix testing, not proof of this clone's regulator specification.
- [Adafruit transistor explanation](https://learn.adafruit.com/adafruit-arduino-lesson-13-dc-motors/transistors): comparable NPN switching/base resistor/clamp topology.
- [CircuitJS](https://www.falstad.com/circuit/circuitjs.html): actual engine used for saved measurements.

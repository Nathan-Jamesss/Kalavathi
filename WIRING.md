# Kalavathi wiring for the first bench build

This page covers the earlier minimal button/LED test. The complete main-unit
reference with GPS and buzzer is in [MAIN_UNIT_DESIGN.md](hardware/MAIN_UNIT_DESIGN.md)
and [the schematic](hardware/main-unit-schematic.svg). Do not mix the earlier
direct-piezo option with the new transistor-driver specification.

Disconnect USB power before wiring. The tables use **GPIO labels**, not physical
header numbers. Use the large classic ESP32 in `components/esp 32 normal.jpeg`.
The earlier C3 pin mapping is superseded. Never guess from the header position.

Use **one 1 kΩ resistor per individual LED** for this first build. This keeps
currents modest on both controllers. The LED's long leg is usually the anode;
the flat side/short leg normally marks the cathode. Verify if the legs were cut.
This guide assumes individual two-leg LEDs, not an RGB LED with shared terminals.

## Stage 1 ESP32 emergency unit

Use the large 30-pin micro-USB ESP32 board. Keep the XIAO C3 boards as spares.

| Classic ESP32 label | Connect to |
|---|---|
| D25 / GPIO25 | Emergency switch COM, with NO connected to GND |
| D26 / GPIO26 | One side of external reset push button; other side to GND |
| D27 / GPIO27 | 1 kΩ resistor → red LED anode; cathode → GND |
| D32 / GPIO32 | 1 kΩ resistor → amber/yellow LED anode; cathode → GND |
| D33 / GPIO33 | 1 kΩ resistor → green LED anode; cathode → GND |
| GND | Shared ground rail for this unit |
| USB | Laptop USB data cable |

The firmware uses internal pull-up resistors, so these buttons do not need
external resistors. Do not connect a button to 5 V. The external reset goes to
GPIO26, **not** the board's EN/RST pin; it resets the demo, not just the chip.

For a four-legged tactile switch, the two pins on each side are often already
connected. Use a multimeter to find two contacts that connect only while pressed,
or place it across the breadboard centre gap and verify the orientation.

Your large red switch appears latching. Before connecting, use a multimeter in
continuity mode to identify COM and NO. They should connect when pressed and open
after twist-release. If only NC contacts are available, use a momentary button
for the first build rather than silently reversing the expected behaviour.
Use only isolated dry contacts; leave any lamp/supply terminals disconnected.
Release both buttons before powering up. The firmware deliberately ignores a
switch held down at boot until it has been released and pressed again.

Do not use GPIO6/7 from the old C3 drawing on this classic ESP32: these are flash
signals. Follow Revision B and the photographed labels.

## Stage 2 Arduino Uno junction rig

Wire **pin → 1 kΩ resistor → LED anode**, with every LED cathode to Uno GND.

| Junction | Red | Amber/yellow | Green |
|---|---|---|---|
| J1 | D2 | D3 | D4 |
| J2 | D5 | D6 | D7 |
| J3 | D8 | D9 | D10 |
| J4 | D11 | D12 | D13 |

Keep D0/RX and D1/TX free. USB carries the serial commands and supplies power.
The Uno and ESP32 do **not** need signal wires between them: the laptop connects
them through Wi-Fi and USB. Do not join their 5 V/3.3 V power rails.

Serial commands have four colour letters separated by spaces, ending in newline:
`R R R R`, `G R R R`, `R G R R`, etc. `A` means amber. Invalid commands and
commands requesting more than one green force all-red. No valid command for
three seconds also forces all-red. This is a simplified model, not a real
intersection conflict controller.

## Buzzer and extra modules

Leave the buzzer disconnected for the first test. The photos do not establish
whether it is an active buzzer, passive piezo or inductive sounder, or its current
rating. Use the Revision B transistor driver on D23 after identification. The
earlier direct-piezo option stays disabled. Do not use GPIO10 on this classic
ESP32 and do not connect an unidentified buzzer directly to a GPIO.

The NEO-6M, patch antenna, MCP2515, IR sensors, Pico and displays are not required
for this stage. ESP32 GPIOs are 3.3 V logic; never feed an unknown module's 5 V
output into them. Do not connect the antenna to an unrelated RF connector.

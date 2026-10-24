# Kalavathi tabletop build without a secure element

The user approved building the previously described button, hospital approval,
four junctions and reset demonstration, without an ATECC608A.

Implementation choices: use the installed Node.js runtime and built-in modules,
Arduino firmware without third-party libraries, and Windows PowerShell's serial
port support. No Python installation is required. Use ESP32-C3 GPIO3/4 for the
two buttons and GPIO5/6/7 for individual red/yellow/green LEDs, conditional on
checking those labels on the actual board. Leave the unknown buzzer disconnected
until its electrical requirements are known. Uno D2 through D13 drive 12 LEDs.

- [x] Test persistence, request deduplication, quota refusal, hospital override,
  reset and automatic expiry before implementing the state machine.
- [x] Build a local HTTP service with atomic JSON persistence, separate operator
  and device credentials, bounded JSON requests and an offline dashboard.
- [x] Provide ESP32 button/status firmware and Uno serial/watchdog firmware.
- [x] Provide serial bridge, startup instructions and staged wiring guide.
- [x] Run automated HTTP/state tests and a browser flow. Report hardware flashing
  and physical verification separately; neither can be claimed without evidence.

Limitations: credentials are shared secrets over a trusted local hotspot, not
hardware signatures. Software quota is intentionally resettable for the demo.
This rig controls LEDs only. GPS, OLEDs, IR sensors and SUMO are later work.

Visual direction: white and slate background, blue controls, large coloured
junction signals and an illustrated route as the main visual. Use system Segoe UI,
readable phone controls, no external fonts/maps/scripts or internet dependency.

Ruling: the earlier response already described the build and the user explicitly
said to build it without the secure element; do not add a repeated approval gate.

Verification: six Node.js state/HTTP tests pass, including a regression for a
delayed hospital approval. Desktop approval and responsive phone pages checked
with gstack browse; no local console errors. Read-only reviewer checked host and
firmware flow; stale request binding fixed. Firmware is not compiled or flashed;
physical wiring and board compatibility still require the actual hardware.

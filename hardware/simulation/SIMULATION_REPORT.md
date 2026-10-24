# Revision B electrical simulation report

Twelve cases ran in [CircuitJS](https://www.falstad.com/circuit/circuitjs.html) on
21 October 2026. Raw results were exported through its public JavaScript API and
include element terminal voltages, currents, operating region and simulated time.
Every case reached at least 15 ms. The verification script passed all twelve.

| Test | Measured model result | Result |
|---|---|---|
| Button released | 3.299999 V | High |
| Button pressed | 0 V; pull-up 0.330 mA | Low |
| Button released at 3.135 V supply | 3.134999 V | High |
| Generic LED on, 3.3 V / 1 kΩ | 1.688 mA | Within bound |
| Generic LED off | 0 A | Off |
| LED at 3.465 V / 950 Ω | 1.936 mA | Within bound |
| Driver on, beta 100 | Load 19.758 mA; control 2.622 mA; VCE 0.0604 V | Saturated |
| Driver off | Load about 10 pA | Cutoff |
| Driver beta 50 | Load 19.750 mA; VCE 0.0626 V | Saturated |
| Driver beta 300 | Load 19.764 mA; VCE 0.0591 V | Saturated |
| Driver, 4.75 V / 1050 Ω base / beta 50 | Load 18.750 mA; control 2.499 mA | Within bounds |
| Driver, 5.25 V / 950 Ω base / beta 50 | Load 20.750 mA; control 2.759 mA | Within bounds |

Load: 250 Ω equivalent for a nominal 5 V / 20 mA buzzer. At 5.25 V it draws above
20 mA; the switch remains within the declared test bounds, but this does not
authorise exceeding a real buzzer's supply/current rating. Select a buzzer rated
for the actual supply range. No actual buzzer model or acoustic response is used.

Transistor and LED are CircuitJS generic models, not vendor-specific 2N3904 or
colour-specific LED characterisation. These are separate settled electrical
checks; flyback, contact-bounce timing and software debounce are not validated.
The firmware, UART, RF, GPS, regulator, USB limits, heat and physical wiring are
outside the simulation. No claim of a physically verified full system is made.

## Reproduce

1. Open CircuitJS and import any `*.circuitjs.txt` using File > Import From Text.
2. Run and inspect element measurements. `make-cases.js` regenerates all cases.
3. `run-in-browser.js` runs the batch using the public API and returns raw JSON.
4. Save as `results.json`, then run `node hardware/simulation/verify-results.js`.

The static firmware-pin correspondence check also passed. Six backend tests
passed independently; neither result is firmware compilation or an ESP32 simulation.

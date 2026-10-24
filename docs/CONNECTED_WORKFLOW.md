> Active traffic map: see [CITY_TRAFFIC_MODEL.md](CITY_TRAFFIC_MODEL.md). The sixteen-junction model supersedes the older four-junction route descriptions below.

# Kalavathi P1 traffic workflow

## Current interface

Open `http://localhost:8010/` or `/traffic/`. Run `node scripts/preview-driver.js` first. The traffic page is now a focused Kalavathi workspace using the original Genesis dark palette, road drawing, ordinary-traffic physics and signal safety code. The original repository clone at `vendor/DigitalTwinGenesis` is untouched.

This replaces the earlier generic ambulance/ATCS interface. The active page does not load the original priority arbitration, AI/model controllers, incident scenarios, benchmark tools, or 3D renderer. No ambulance, algorithm or scenario choices appear. `/traffic/console.html` serves the same focused workspace for compatibility; a second operator window is not required.

## Project sequence

1. The physical device button creates a self-declared token. For a software rehearsal, the patient page's Activate demo token simulates the same device request via the backend.
2. The patient sees the hospital and a 15-second destination-change window. Choosing a destination does not verify the token.
3. Hospital staff open the same token, inspect the device's software usage record, choose severity and confirm. Over-limit requests need the separate hospital override and reason.
4. The patient receives HOSPITAL-VERIFIED and the map appears at the top. The Kalavathi P1 scheduler requests the next junction's green through the reused signal state machine.
5. The private family car follows the indoor demonstration track through J1, J2, J3 and J4 in order. It stops before red and waits for normal minimum-green, yellow and all-red transitions. Only the next junction has a priority hold; cleared junctions are released.
6. Arrival ends the token and releases all holds. Patient cancellation, hospital revocation, time cap or traffic connection loss also ends priority.
7. A closed Demo dropdown contains only Reset demonstration for the next expo run. It renews the software allowance and retains historical records.

The automatic P1 grant is a rule-based model of traffic control accepting a hospital-verified request, not a legal entitlement. There are no competing emergency scheduling/model experiments in this build. Hospital confirmation remains mandatory and is enforced by the shared backend before a traffic report can grant priority.

## Extracted code and local additions

- `static/digital-twin/sim.js`: unchanged Genesis background vehicle physics and safe signal state machines.
- `static/digital-twin/style.css`: original visual tokens; `kalavathi-screen.css` arranges the focused workspace using them.
- `kalavathi-render.js`: extracted road/junction/signal drawing with ordinary-car drawing and a clearly labelled cyan family car. No ambulance livery or flashing emergency bar.
- `trip.js`: testable Kalavathi indoor track and four-junction scheduler.
- `kalavathi-screen.js`: connects the shared token, scheduler and focused status panel.
- `index.html` and `console.html`: load only the required local scripts and p5.js.
- The original clone and unused copied files are retained for provenance; they are not part of the active application's script dependency graph.

Source: https://github.com/satyatanmayi/DigitalTwinGenesis at `f0a89bcb2c3e1a38768a21cad69ced0076bdf2d0`. `scripts/check-twin-source.cjs` checks 20 unchanged copied engine/view/style reference files. No changes were pushed to GitHub.

## Indoor model boundary

The expo brief explicitly permits a recorded indoor track and a rule-based scheduler. The highlighted private car therefore follows a scripted clockwise track on the reused 2x2 road drawing; the lower junction labels are ordered clockwise as J3 and J4 for the four-junction rig. Its track is separate from the original background cars' car-following physics. This is not a geographic route planner, live GPS, a validated collision model, real ATCS, or a traffic-authority deployment. Selecting another hospital changes the destination record; it does not import a real road network.

Patient and hospital state is shared through the existing local backend with actual WebSockets and polling fallback. The service remains Node-based; no FastAPI migration is claimed. Physical device requests retain their device-key endpoint. No secure element is installed: hospital records explicitly say software demo and do not claim a verified device signature. The software counter is resettable. Firmware upload, physical wiring, and GPS were not verified here.

Keep the traffic page visible while demonstrating: browser background throttling can slow the model. A lease allows one active traffic worker, with other copies viewing backend state. Old generic traffic pages are rejected as workers and should be refreshed. If traffic reports stop, a granted token expires within six seconds. Backend sessions survive restart; active tokens end safely.

## Verification

- `test/trip.test.js` runs the four-junction recorded car against the actual reused signal engine: it never enters a junction on red, visits J1–J4, maintains one priority hold, releases holds on arrival/cancel, and resumes the same token without duplication.
- `scripts/check-kalavathi-p1-browser.js` exercises the real shared backend and focused traffic page. Ten checks passed, including no ambulance/controller options or unrelated script loads, hospital-only confirmation, patient propagation, four-junction traversal and arrival expiry.
- Full project suite: 20 tests pass. Original clone remains clean.

## Intake and expanded route update

Hospital intake now shows only current patients, with **Accept patient & confirm token** directly on each card. Choose the hospital-assessed emergency type in the sheet and confirm using the same clear label. Acceptance is visible without scrolling at 360x800 and 390x844. Hospital availability is separated into its own closed menu. Closed requests are shown under Previous requests, with clear timeout/arrival/cancellation outcomes. A hospital selector makes the intake location explicit. New incoming patients clear stale success messages.

The patient no longer has a misleading destination-confirmation button. Before acceptance it waits for the selected hospital; the connected demo provides a correctly addressed hospital-desk link. After hospital confirmation the first trip element is the full Home -> J1 -> J2 -> J3 -> J4 -> Hospital map, using the actual scripted model position. Home, the destination and the car are labelled. The traffic canvas is larger, with city blocks, a highlighted hospital building, a full green corridor outline and a brighter completed path. The signal lamps still follow safe phases in sequence; the green corridor graphic does not imply that every lamp is held green simultaneously.

### Signal-model comparison

A new confirmed trip resets the foreground signal model to seed 20260905. An isolated copy of the same unchanged simulation runs the same scripted route without priority holds. The baseline's four checkpoint times and total are compared with the priority journey's checkpoint times and total. No number is shown before the first checkpoint. At intermediate checkpoints it is labelled as a checkpoint comparison; at arrival it becomes a completed journey comparison. Negative differences are preserved and labelled longer. The full-trip saved value is calculated from the same rounded baseline/elapsed values displayed on screen.

This is a **scripted route / signal-waiting model comparison**, not measured travel-time saving in a real city and not a complete car-following or collision counterfactual for the highlighted car. Background traffic uses the reused Genesis physics, while the highlighted car follows the disclosed indoor track. On a traffic-page reload during an already-granted journey, a fresh comparison is not fabricated: the new worker clears comparison availability for that resumed run. Start a new confirmed trip for a paired comparison.

The backend persists bounded model comparison fields and sends them to the patient and traffic views. The new traffic-worker protocol rejects stale tabs; refresh an old traffic page when prompted. The repository clone remains untouched.

Verification for this update: 22 host tests passed, including baseline and negative-result checks; 9 hospital interaction checks passed at both phone widths; 5 patient-map checks and 7 completed-route/comparison checks passed. One model run completed in 51.1 s versus a 74.1 s fixed-signal baseline, displaying 23.0 s saved. Use `scripts/check-friendly-hospital.js`, `scripts/check-patient-route-friendly.js` and `scripts/check-complete-route-comparison.js` for the current focused checks; earlier generic hospital/twin browser scripts describe superseded layouts.

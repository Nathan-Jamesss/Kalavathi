# Kalavathi city traffic demonstration

This replaces the four-junction demonstration track. Open `/traffic/`, `/driver/kalavathi-01?demo=1`, and the receiving hospital desk. The phone simulates the physical button only in connected demo mode. Hospital staff still choose severity and confirm the token before traffic priority starts.

## What the viewer sees

- Sixteen uniquely named junctions, J1–J16, across a larger 4 × 4 road network.
- Small residential plots and apartment buildings set back from the road. Home has its own driveway. Three hospital sites occupy separate plots.
- City Hospital is southeast, Riverside Medical Centre northeast, and Central Care southwest. Each hospital has a different route and endpoint.
- A solid blue selected route and a dashed shortest-distance alternative. Only selected-route junctions appear in the progress list.
- Ordinary vehicles stop at red lights and queue behind vehicles ahead. The patient car follows the same movement rules. It can wait for a queue or signal clearance.
- A rolling priority corridor prepares the next two route junctions within 440 model units. Green highlights indicate matching green phases, not unrestricted passage through every intersection.
- `Whole city` fits the network. `Follow car` provides a close camera view; dragging and scrolling pan and zoom. Demo controls remain closed initially.
- The patient map appears first after hospital confirmation, with the identical route, position, destination and measured saving.

## Routing and signal rules

`static/city-model.js` defines the shared topology and route algorithm. Dijkstra minimizes segment travel time plus configured model congestion penalties. The dashed alternative minimizes distance. Penalties are fixed demonstration estimates; they are not real traffic measurements or a live Google routing service. Changing destination recalculates the route. Hospital redirects require the receiving hospital to confirm again.

Normal signals alternate east–west and north–south phases. A change preserves at least five seconds of green, two seconds of amber, then one second of all-red. An occupied junction must clear before the next conflicting phase begins. A priority request selects a phase, not an unconditional green light. Cross traffic stops at its stop line. Queue following limits speed and spacing. Turns are drawn as rounded paths within junctions.

After the patient passes, the controller stops requesting that junction. Arrival closes the shared token and ordinary traffic continues on normal phases. Cancellation, revocation, expiry and traffic connection loss release priority.

## Time comparison

The baseline and priority trips use the same destination, optimized route, deterministic traffic seed, starting signals, car-following rules and fixed 25 ms integration step. The baseline uses ordinary signal cycling; the other run requests priority. Before a checkpoint there is no saving value. During travel, saving compares arrival at the last passed junction. At completion it compares the full trip times. The final displayed saving is derived from the displayed rounded trip times, and negative results are retained.

These are model seconds. They do not predict real driving time or demonstrate a legal entitlement to traffic priority. The directory's hospital distances/ETAs are demonstration catalogue values, not surveyed geography. The moving vehicle uses a separate synthetic city scale of two metres per world unit. Google Maps was inspected as a reference for setbacks, street blocks and separate sites; its tiles and routing service are not bundled or required.

## Source and hardware boundaries

The original `vendor/DigitalTwinGenesis` clone is untouched. Its visual palette, local typography and panel styling are reused. The active Kalavathi city engine and renderer are separate files; the original four-junction simulation remains as reference code and is no longer loaded by the traffic page.

The Uno still has four physical LED groups. `/api/junctions` projects the current route checkpoint onto one of those four display slots, wrapping after four. Sixteen simulated junctions do not mean sixteen physical signal assemblies have been connected. No firmware was flashed as part of this UI change. Secure-element signing remains omitted by request.

## Verification

- `test/city-model.test.js`: connected topology, distinct hospital endpoints, weighted route cost, red-light stop line, amber/all-red clearance, queues and completed trips to all three hospitals.
- Existing shared-token, hospital scope, quota, cancellation, expiry and session tests continue to run with protocol `kalavathi-city-v3`.
- `scripts/check-city-browser.js`: actual running-server request, destination change, hospital confirmation, visible ordinary traffic, selected route progress and patient state synchronization.
- `scripts/check-city-patient.js`: map first, shared route and no horizontal overflow at 390 px.
- `scripts/check-city-arrival.js`: completed route, ended token, released occupancy and arithmetically consistent saving.
- `scripts/check-twin-source.cjs`: original reference files remain byte-identical.

Earlier four-junction scripts and screenshots are historical. Use the `check-city-*` scripts for the active city model.

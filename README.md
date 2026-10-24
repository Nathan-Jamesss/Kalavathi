# Kalavathi

Kalavathi is an offline tabletop demonstration of a private car carrying a patient requesting traffic-signal priority for one trip. The physical emergency button starts the request. Hospital staff confirm the token and medical severity. Traffic control then prepares a safe signal corridor to the selected hospital.

The **patient, hospital and traffic interfaces share one backend, token, route and journey state**. A request is not a legal entitlement to priority. This is a local prototype, not a production hospital or road-control system.

## Start the project

Requirements: **Node.js 20 or newer**, Git, and a browser. The local web server uses Node built-ins. Run `npm ci` to install the Vercel storage SDK used by hosted deployments. There is no frontend build step.

```powershell
git clone --recurse-submodules https://github.com/Nathan-Jamesss/Kalavathi.git
cd Kalavathi
npm ci
npm run demo
```

Open **http://localhost:8010/** for the landing page. Leave the server running.

If you cloned without the source-reference submodule:

```powershell
git submodule update --init --recursive
```

`npm start` also starts the application, on port **8000** by default. The examples below use `npm run demo` and port **8010** consistently. Do not start a second server on a port already in use.

## Hosted Vercel preview

See [VERCEL.md](docs/VERCEL.md) for the hosted three-tab URLs and cloud setup. The hosted demo uses private shared storage and two-second polling. Its state is separate from the local hardware demo.

## The three tabs

| Tab | Address on the laptop | Who uses it | Purpose |
| --- | --- | --- | --- |
| Patient / driver | http://localhost:8010/driver/kalavathi-01?demo=1 | Family member or passenger | Start a simulated device request, see destination and live route, change hospital during the first 15 seconds, or hold to cancel |
| Hospital | http://localhost:8010/hospital/city | Receiving hospital staff | Accept the patient, choose severity and confirm the token; redirect or revoke when needed |
| Traffic control | http://localhost:8010/traffic/ | Traffic-control demonstrator | Run and watch the city simulation, selected corridor, signal changes, car queues and time comparison |

**Keep the traffic tab open and visible on the laptop.** The browser runs the traffic model and reports its state to the backend. Closing it or losing its connection ends an active corridor after the connection timeout. Only one traffic tab leads the simulation; other traffic tabs are viewers.

The landing page links to all three roles. The hospital desk must match the destination: Riverside uses `/hospital/riverside`, and Central Care uses `/hospital/central`. The hospital selector switches desks. The patient page also provides a link to its receiving hospital.

### 1. Patient / driver tab

The normal page `/driver/kalavathi-01` waits for the **physical device button**. The phone is not required to create a hardware request.

For a demonstration without connected electronics, open the `?demo=1` address above and press **Activate demo token**. This simulates the device button through the real shared backend; it does not grant priority.

- The page shows the chosen hospital and a 15-second opportunity to change it.
- If needed, press **CHANGE** and select a capable, accepting hospital before the window closes. Hospital confirmation also locks the destination.
- The token initially says **SELF-DECLARED**. Wait for the hospital team to accept it.
- After hospital confirmation, the map appears first. It shows the destination, selected route and shared model car position. **HOSPITAL-VERIFIED** is separate from the traffic-control grant.
- During an active grant, follow the junction progress, ETA and measured model saving. Hold **CANCEL REQUEST** for two seconds to cancel.
- Arrival ends priority. The page shows the ending reason and remaining allowance, then returns to Ready after ten seconds.

`?mock=1` is a separate, isolated UI showcase with fixtures and a closed demo-state menu. Use **`?demo=1`**, not `?mock=1`, when demonstrating all three tabs together.

The emergency-contact control is currently an unconnected placeholder in the live flow. The mock version only records a simulated alert; no SMS, email or contact notifications are sent.

### 2. Hospital tab

A new token appears in **Incoming** at the receiving hospital. No operator key or availability setting is needed to accept a patient in this trusted local demo.

1. Find the current patient card.
2. Press **Accept patient & confirm token**.
3. Select the medical severity: cardiac, trauma, obstetric, paediatric or general.
4. Press the final confirmation button in the sheet.
5. Look for the accepted feedback. The patient and traffic tabs update automatically.

The **Availability** menu only changes whether the hospital is accepting new patients. It does **not** accept an individual token.

Confirmed requests can be redirected to another capable, accepting hospital with a reason. The receiving hospital must confirm again. Revoking a confirmation ends the corridor. Old arrivals, cancellations and expired requests appear under **Previous requests**, rather than cluttering Incoming.

An unanswered request expires after **60 seconds**. If you see `hospital response timed out`, create a new request and accept that new card. An expired token cannot be accepted retrospectively.

### 3. Traffic-control tab

The city contains **16 junctions (J1-J16)**, three separate hospital plots, off-road homes and ordinary vehicles. A selected trip uses the junctions needed for that destination; it does not reserve all sixteen signals.

- **Solid blue:** selected traffic-weighted route.
- **Dashed:** shortest-distance alternative.
- **Green signal highlight:** a matching phase has been prepared ahead of the patient car.
- **Progress bars:** reserved, green, passed or released route junctions.
- **Whole city:** fit the network. **Follow car:** close camera view. Drag to pan and scroll to zoom.

The car follows queues and stops at red signals. Priority prepares the next route junctions, preserving minimum green, amber, all-red clearance and intersection occupancy. Passed junctions return to ordinary cycling. Hospital verification alone does not bypass the traffic controller.

**Time saved** compares two deterministic model journeys: the same selected route, starting signals and traffic demand, with and without priority. It says **Calculating** before the first cleared junction. During travel the value compares the last passed checkpoint; at arrival it compares completed trips. Negative results remain negative. These are simulated seconds, not a real-world travel-time prediction.

The original DigitalTwinGenesis styling is reused. Its source clone is preserved as the pinned `vendor/DigitalTwinGenesis` submodule; the active Kalavathi city engine and renderer are separate files. The offline map is synthetic. Google Maps was inspected as a layout reference; no Google tiles or routing service are needed to run the app.

## A complete demonstration

1. Start the server and open all three tabs. Keep traffic visible on the laptop; use the two phones for patient and hospital if available.
2. For a fresh run, use **Traffic -> Demo -> Reset demonstration**. This deliberately renews the local demo allowance.
3. Press the physical device button, or **Activate demo token** on the connected demo patient page.
4. Patient sees the destination. Change it within 15 seconds if needed.
5. Open the matching hospital desk. Press **Accept patient & confirm token**, choose severity, and confirm within 60 seconds.
6. Patient sees the map and verified token. Traffic prepares safe signals and the car travels through the selected corridor. Other vehicles queue at red lights.
7. Compare the baseline time with elapsed travel and checkpoint saving. Use **Follow car** for the close view.
8. At the hospital endpoint, the backend ends the token and releases priority. Patient sees arrival and remaining presses; traffic shows the final model comparison.
9. To test cancellation, begin another request and hold Cancel on the patient page. To test a redirect, use the hospital's redirect action and confirm at the receiving desk.

Five requests form the normal demo allocation. Submitted requests, including cancellations, consume the software allowance. An over-limit request needs a hospital override with a reason. Retries of the same request ID do not consume another press. Server restart preserves counts and expires an active journey safely.

## Two phones on a local hotspot

Connect the laptop, phones and ESP32 to the same trusted local network. Internet is not required after cloning the project and installing any Arduino tooling needed for hardware.

Replace `localhost` in the phone URLs with the **laptop's hotspot/LAN IPv4 address**, for example:

```text
http://LAPTOP_IP:8010/driver/kalavathi-01?demo=1
http://LAPTOP_IP:8010/hospital/city
```

Find the address with `ipconfig`. The preview listens on all network interfaces. If phones cannot connect, check the correct address, private-network firewall access for TCP port 8010 and hotspot client isolation. `localhost` on a phone refers to that phone, not the laptop.

## Hardware

The current complete component list, pin connections, resistors, GPS/OLED details and starter Arduino code are in **[FINAL_HARDWARE_GUIDE.md](FINAL_HARDWARE_GUIDE.md)**. Also see [the main-unit design](hardware/MAIN_UNIT_DESIGN.md) and [WIRING.md](WIRING.md) for earlier bench wiring.

- `firmware/kalavathi_device/`: classic ESP32 device request/status firmware. Edit the placeholder Wi-Fi settings, server URL and device key before uploading. Use the same port as your running server.
- `firmware/kalavathi_junctions/`: Arduino Uno, four physical red/amber/green LED groups.
- `scripts/serial-bridge.ps1`: laptop-to-Uno bridge. Close Arduino Serial Monitor before starting it.

```powershell
powershell -NoProfile -File .\scripts\serial-bridge.ps1 -Port COM5 -Server http://localhost:8010
```

Replace COM5 with the Uno's actual port. The sixteen city junctions are simulated. The four physical LED groups are a rotating route-checkpoint display, not sixteen physical intersections. On missing bridge updates, the Uno watchdog returns the LEDs to red.

**No secure element is used.** The server creates local keys and stores state under ignored `data/` directories. Allowances and identities are software-only and can be reset or edited locally. Hardware-backed signatures and tamper resistance are not implemented. Do not commit real Wi-Fi passwords, device keys or generated session files. Firmware and electrical behaviour must be checked on the actual components; host tests do not prove wiring or flashing.

## Project structure

| Location | Contents |
| --- | --- |
| `server.js`, `lib/` | Native Node HTTP/WebSocket server, token workflow, sessions, quota and device integration |
| `templates/` | Landing page, patient and hospital HTML |
| `static/driver.*`, `static/hospital.*` | Offline vanilla-JS role interfaces |
| `static/city-model.js` | Shared city topology, routing, vehicle movement, signal rules and comparison |
| `static/digital-twin/` | Traffic interface, local fonts/libraries, original reference copies and Kalavathi-specific renderer/controller |
| `vendor/DigitalTwinGenesis/` | Unmodified pinned upstream source submodule |
| `firmware/`, `hardware/`, `components/` | Board code, schematics, component references and photographs |
| `docs/` | Workflow details, model notes, research and screenshots |
| `test/`, `scripts/` | Automated checks, preview, browser checks and serial bridge |
| `data/` | Generated local state and secrets; deliberately excluded from Git |

## Verification and detailed references

```powershell
npm test
npm run check:source
```

The test runner restricts discovery to this project's tests, so it does not accidentally execute the upstream repository's unrelated suite. The source check needs the submodule initialized. Browser check scripts use the installed local browser-testing environment; see [CITY_TRAFFIC_MODEL.md](docs/CITY_TRAFFIC_MODEL.md).

- [Current city model, algorithms, comparisons and limits](docs/CITY_TRAFFIC_MODEL.md)
- [Connected token workflow](docs/CONNECTED_WORKFLOW.md) - its opening notice identifies earlier four-junction descriptions as historical
- [Complete hardware reference](FINAL_HARDWARE_GUIDE.md)
- [Upstream DigitalTwinGenesis](https://github.com/satyatanmayi/DigitalTwinGenesis)

This demo serves pages, APIs and WebSockets from one origin with locally bundled assets. It includes reconnect/polling fallbacks and offline indicators. Role sessions are for a **trusted local demonstration**, not production staff authentication. Do not enter real patient information or connect the prototype to real road signals. No cloud deployment, live maps, real contact alerts or secure-element signing is claimed.

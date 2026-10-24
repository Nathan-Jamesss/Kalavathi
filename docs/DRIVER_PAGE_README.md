> Current behaviour: see [CONNECTED_WORKFLOW.md](CONNECTED_WORKFLOW.md). The landing page now opens a shared patient/hospital/traffic token workflow. The disconnected-preview descriptions below are historical.

# Driver page

Open `/driver/kalavathi-01?mock=1` for the offline mock demo, or
`/driver/DEVICE_ID` for live mode. `/driver?device_id=DEVICE_ID` is also supported.
Do not treat the default preview ID `kalavathi-01` as a trusted pairing mechanism.

For an isolated local preview, run `node scripts/preview-driver.js` and open
`http://localhost:8010/driver/kalavathi-01?mock=1`. Port 8010 avoids interrupting
the existing hardware/backend demo on port 8000.

The device button starts requests. There is no request-start control or endpoint
call in this page. The driver can only review, change a pending destination, or
hold for two seconds to cancel. Mock controls are present only with `?mock=1` and
never make backend calls. The fixtures cover idle, pending, granted, redirected,
refused, expired and arrived, plus an offline-banner toggle. Pending counts down
in real time; expired/arrived returns visually to idle after ten seconds without
resetting the backend's quota or creating a new request.

## Existing design reused

The user identified [DigitalTwinGenesis](https://github.com/satyatanmayi/DigitalTwinGenesis)
as the intended interface. Its [console.css](https://github.com/satyatanmayi/DigitalTwinGenesis/blob/main/console.css)
was read at commit `f0a89bc` (control-room rebuild). This implementation reuses:

- Exact `--bg #080C13`, `--panel #121A25`, `--panel-2 #1B2531`, `--line #2A3746`.
- Exact text/dim `#EAF1F9` / `#91A4BA`, cyan accents `#22D3EE` / `#67E8F9`.
- Exact good/warn/danger colours `#34D399` / `#FBAF3F` / `#F87171` and their dark backgrounds.
- Its Segoe UI/system font stack and Cascadia Mono/Consolas/JetBrains Mono numeric stack, without downloading fonts.
- `.calm`/`.alert` 14 px bordered panels, `.option` 12 px hospital options,
  `.option button` 8 px control radii, `.badge` trust-chip treatment,
  `.countdown` mono emphasis and `.dot.live` connection indicator.
- Its translucent control-bar background for the fixed device strip.

Driver text is at least 18 px, controls are at least 56 px, and system fonts and
inline SVG avoid all internet/CDN dependencies. The source's component sizes are
increased for the driver's touch/readability constraints; token colours are retained.
No maps, navigation menu, settings, login or request-start button was added.
No frozen driver schema file was found locally or identified in the repository;
the supplied contract remains the integration boundary.

## FastAPI integration

Files: `templates/driver.html`, `static/driver.css`, `static/driver.js`, and
`static/driver-fixtures.js`. The HTML is deliberately valid plain HTML and can
also be returned through Jinja2. No client build or npm runtime is needed.

Mount local assets and return the template at a device-specific route, e.g.:

```python
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

app = FastAPI()
app.mount('/static', StaticFiles(directory='static'), name='static')
templates = Jinja2Templates(directory='templates')

@app.get('/driver/{device_id}')
async def driver_page(request: Request, device_id: str):
    return templates.TemplateResponse(
        request=request, name='driver.html', context={}
    )
```

The device ID is read from the URL, not interpolated into JavaScript or HTML.
The existing Node server serves the same files only as a convenient local preview.
It has not been made into a FastAPI driver backend. Its older global demo state
API does not match the device-specific contract and is not silently substituted.
In live mode without the new endpoints, the page shows its offline banner.

## Data and live updates

The user-supplied contract is used until the actual frozen schema is available:

- `GET /api/driver/{device_id}/state` returns the state object from the brief.
- `/ws/driver/{device_id}` sends that same JSON object as each text message.
- `POST /api/driver/{device_id}/destination` accepts `{ "hospital_id": "..." }`.
- `POST /api/driver/{device_id}/cancel` receives an empty JSON object.
- Successful POSTs return an updated state or HTTP 204; on 204 the page refreshes.
- `GET /api/hospitals?type=cardiac` returns an array, or `{ "hospitals": [...] }`.
  Hospital records use `id`, `name`, `tags`, `distance_km`, `eta_s`.

WebSocket reconnect backs off from 1 to 10 seconds. If the socket fails or has not
delivered state, HTTP polling runs every two seconds after completion (requests
timeout at four seconds). Healthy polling shows an amber reconnecting strip;
failed polling shows red offline. Last known status remains visible and controls
are disabled when offline. A late HTTP snapshot cannot overwrite a newer received
WebSocket snapshot. Hidden page cleanup closes its connection; bfcache restore
reconnects. The device works independently of this phone page.

The 15-second deadline decreases monotonically in the current pending episode;
receiving another snapshot does not restart it. Backend change-window enforcement
is mandatory: the client clock is only a display. Device state IDs/revisions are
not supplied by this placeholder schema. The backend must scope each decision to
the correct active trip and reject stale/expired actions; provide the frozen schema
before final integration if it includes a trip/revision token.

The redirected screen remembers the previous destination if seen earlier. Optional
`previous_destination` can provide it when loading directly into redirected state.
The supplied contract lacks that field, so a fresh redirected page otherwise shows
only the new destination rather than inventing the old one.

The granted status is assumed to mean traffic control granted priority. A hospital
confirmation alone must not be mapped to granted by the backend. The page uses no
legal vehicle designation. The four junction markers are view-only and send no
signal-changing commands, including on refusal.

## Browser and backend responsibilities

Cancellation requires continuous pointer/keyboard hold for two seconds. Release,
pointer movement outside the button, focus loss, visibility loss or state changes
abort the hold. Regular identical live frames do not reset a hold. Keyboard users
can hold Space/Enter. Actions never optimistically claim success if POST fails.

Text is rendered through `textContent`, URLs remain same-origin, and JSON POSTs
send same-origin credentials. Use the deployment's existing device/trip permission
checks and CSRF protections at the backend. No new login UI is introduced.
This page is not authentication or proof of device ownership.

Redirect haptics use `navigator.vibrate` where supported. Beeps use Web Audio only
after browser-permitted user interaction. Android Chrome may block sound/vibration
before activation or according to device settings; the blue visual banner always
appears. No internet or external audio file is used. These API restrictions cannot
be bypassed by a web page.

Offline means no internet is required while the laptop serves the local files.
It does not promise a first load when the laptop itself is unavailable: an already
loaded page retains its visible state and reports disconnection. No service worker
or installable-app features were requested or added.

## Validation

Run `node --test`. All nine host tests passed. Driver unit tests cover status
validation, quota bounds, monotonic destination deadlines and cancellation state
eligibility. The browser suite recorded 25 passing checks at 360 px, covering all
fixtures, touch-target height, overflow, hospital selection, short/long cancel,
countdown locking, ten-second return to idle, offline controls and no remote assets.
The pending layout was also inspected at 430 px with no horizontal overflow.
Browser-local HTTP/WebSocket fixtures exercise the client reconnect/polling paths;
these do not substitute for integration with the actual FastAPI service.
API/backend authorisation enforcement remains the integrating backend's job.

## Light driver demo update (2026-10-24)
The driver now uses a light minimalist theme at the user's request, replacing the dark console palette. Mock controls are a closed top-right dropdown. In `?mock=1`, the coral Activate demo token button simulates a physical device press and opens the pending destination with the existing 15-second change window. The inline SVG is explicitly an illustrative demo route, not geographic or turn-by-turn navigation. It updates its destination label when hospitals change.

Notify emergency contacts records only an in-page demo acknowledgement; no SMS, push or other messages are transmitted. Live mode keeps physical-button activation and disables contact notifications until a real recipient configuration and delivery backend exist. Actual offline maps require local geographic data and a routing engine, neither of which is supplied by this frontend. No production token is issued by the demo button.

Hospital confirmation update: The destination card now has Confirm hospital. Route preview stays hidden until the user confirms that destination, then becomes the first trip-screen element. Selecting a different hospital or receiving a redirect requires confirmation again. This is a local viewing acknowledgement, not hospital verification or traffic approval, and does not extend the destination change window.


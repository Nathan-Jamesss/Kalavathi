> Current behaviour: see [CONNECTED_WORKFLOW.md](CONNECTED_WORKFLOW.md). The landing page now opens a shared patient/hospital/traffic token workflow. The disconnected-preview descriptions below are historical.

# Hospital workspace and role landing page

Open `/` for the role chooser, `/driver/kalavathi-01?mock=1` for the patient phone, `/hospital/city?mock=1` for the hospital demo and `/traffic` for the existing tabletop dashboard. The previous device-connected hospital controls remain at `/hospital-legacy`; their operator-key protection is unchanged.

The hospital and patient demos are independent client fixtures. Actions do not update the other phone, send notifications, sign records, or control the junction hardware. `/traffic` remains the existing device-connected tabletop interface. No new production approval endpoints have been added to the Node preview server.

## Reused design

The light theme explicitly requested for the patient interface takes precedence over the original dark digital-twin prompt. Hospital and landing reuse `driver.css` system fonts, light surfaces, green/coral accents, contrast rules, 56px controls, chips, quota dots, junction markers and rounded panels. No internet assets, libraries or build step. Hospital-specific styles are in `static/hospital.css`; landing styles in `static/portal.css`.

## Demo workflow

Open the closed top-right Demo menu, choose a case, and inject a request. Five required cases plus redirected-in and already-handled cases are available. Tap a card for the device record. Confirm requires severity; over-limit approval also requires a reason. Redirect requires an accepting hospital, a reason, and final confirmation. Confirmed requests remain in the queue with a verified chip and can be revoked after holding for two seconds and confirming. History is read-only and lasts for this page session. Driver cancellation injected while a detail is open cancels that request. Offline disables all decision controls. Demo records explicitly disclose that signature verification is simulated.

## FastAPI integration contract

Render `templates/hospital.html` at `/hospital/{hospital_id}`, mount `/static` to this folder, and render `templates/home.html` at `/`. Scripts use only same-origin relative URLs. No runtime Node dependency is needed when served from FastAPI.

- `GET /api/hospital/{id}/incoming`: full array from the supplied placeholder schema, or `{requests, accepting, hospital:{name,tags}}`. Optional wrapper supplies hospital identity and availability. With a bare array the availability button reads Set availability until staff set it.
- `WS /ws/hospital/{id}`: full snapshots using the same array/wrapper. Reconnects automatically; HTTP polling repeats 2 seconds after each request completes while the socket is unavailable, with a 4-second request timeout.
- `POST /api/hospital/{id}/availability` with `{accepting:boolean}`.
- `POST /api/hospital/{id}/requests/{request_id}/confirm` with `{severity}`.
- `POST .../approve_over_limit` with `{severity,reason}`.
- `POST .../redirect` with `{to_hospital_id,reason}`.
- `POST .../revoke` with `{}`. Revoke was requested but its endpoint was not supplied; this is the proposed route.
- `GET /api/hospitals`: array or `{hospitals}`. Fields: `id,name,tags,distance_m` (or `distance_km`), `eta_s,accepting` (or `availability:"accepting"`). Unknown availability is disabled. Current hospital excluded, capability matches sorted first.

POSTs accept a successful JSON response or 204 and refresh the queue. `409` is treated as a stale decision and triggers a refresh. The backend must authenticate the staff session and authorize the hospital/request, protect against CSRF, verify signatures server-side, reject invalid signatures, enforce quota and severity choices, and atomically reject cancelled or already-handled requests. Client disabled buttons do not enforce security. The current hardware has no secure element: never mark real unsigned records as verified. No frozen schema was present; adapters will be needed if its field names differ.

Record tiers are computed from history, rather than trusting `summary_tier`: expired-unconfirmed takes precedence, every outcome confirmed/arrived means clean, otherwise mixed (including no history). Signature validity must be the boolean `true`, or actions are disabled. Backend must provide a complete verified history for meaningful assessment. Fingerprint is an optional `key_fingerprint`; no fingerprint is invented when absent.

New incoming requests flash a banner and change the title. Browser audio requires an initial interaction, vibration depends on phone support. Reduced-motion preference disables flashing. Live mode defaults to offline rather than showing fictitious incoming patients.


# Kalavathi interface files

Open `http://localhost:8010/` after `node scripts/preview-driver.js`.

Patient and hospital pages share one persistent token. Hospital staff confirm that token and severity. The patient only chooses a destination or cancels; destination choice never verifies a token.

Traffic now loads the focused Kalavathi P1 workspace at `/traffic/`: a private family car, four safe signal-priority steps, hospital/token status and arrival expiry. It uses extracted Genesis road drawing and unchanged signal safety/ordinary-traffic code with the original visual theme. Ambulance, ATCS controller, AI/model, incident, benchmark and view choices are absent from the active UI. The clone remains untouched.

The indoor car track is scripted and labelled. No live geographic navigation or secure-element signature is claimed. See `docs/CONNECTED_WORKFLOW.md` for the current architecture and tests. Earlier generic twin/browser verification scripts describe the superseded interface; the current browser check is `scripts/check-kalavathi-p1-browser.js`.

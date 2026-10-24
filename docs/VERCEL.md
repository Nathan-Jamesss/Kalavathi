# Vercel preview deployment

The hosted preview serves all three interfaces from one Vercel project. Replace `BASE_URL` with the preview URL:

| Role | URL |
| --- | --- |
| Landing | `BASE_URL/` |
| Patient demo | `BASE_URL/driver/kalavathi-01?demo=1` |
| Receiving hospital | `BASE_URL/hospital/city` |
| Traffic simulation | `BASE_URL/traffic/` |

The same request → hospital confirmation → traffic grant → arrival workflow applies. Keep the traffic tab visible on the laptop. On Vercel, patient and hospital pages poll every two seconds rather than opening WebSockets. The traffic tab still runs the city simulation in the browser.

## Shared cloud state

Vercel functions do not use the laptop's `data/` folder. `api/cloud.js` stores the hosted demonstration's token ledger, sessions and traffic lease in a **private Vercel Blob store**. The SDK uses the project-provided Blob credentials. These credentials stay on the server, outside Git and outside the client bundle.

Each stateful request reads the latest private snapshot directly from origin storage with `useCache: false`. A fresh application instance operates on an isolated memory snapshot. Its response is buffered until the conditional ETag write succeeds. Concurrent updates retry against the newer snapshot. This avoids losing a hospital confirmation or charging twice for a retried device request. Read-only static assets do not access Blob or overwrite role cookies. Storage failures return 503 and do not publish uncommitted cookies or decisions.

Local operation is unchanged: `npm run demo` uses local files and WebSockets, and a local server restart safely expires active journeys. Loading an existing cloud snapshot is not treated as a local restart. Timeouts are evaluated during requests rather than by a permanent cloud timer.

## Configuration

- Team: Nathan James' projects.
- Project: `kalavathi`.
- Region: `bom1` (function and private store).
- Environment: Preview.
- `vercel.json`: one Node serverless entry point with locally bundled templates, scripts, styles and fonts.
- Storage: private `kalavathi-state`; its connection supplies `BLOB_READ_WRITE_TOKEN` to Preview. OIDC plus `BLOB_STORE_ID` can also be used if configured by Vercel.
- `.vercelignore`: excludes generated state, local secrets, browser caches, component photos and reference material from the deployment bundle. These project materials remain in GitHub.

No paid-plan upgrade is configured. Hosting and Blob use are subject to the account's limits. This is one shared demonstration device, not isolated patient accounts. Visitors can operate demo roles and reset the demonstration; do not enter real patient information. The hosted state is separate from the laptop's state and does not automatically connect its ESP32 or USB Uno. Physical hardware demonstrations remain local unless deliberately reconfigured.

For local work after cloning, run `npm ci`. To deploy a new preview from a linked checkout:

```powershell
vercel deploy --yes --no-wait --scope nathan-james-projects-bdd2da12
```

Then use `vercel inspect DEPLOYMENT_URL --scope nathan-james-projects-bdd2da12` to check readiness. Do not select production unless deliberately setting up its storage connection too.

## Checks

`npm test` includes reconstruction across serverless invocations, persistent role sessions and leases, idempotent concurrent requests, static-cookie isolation, and storage-failure behavior, in addition to the local workflow and city tests. The actual private store was separately checked for reads, writes and stale-ETag rejection before deployment.

References: [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk), [private storage](https://vercel.com/docs/vercel-blob/private-storage).

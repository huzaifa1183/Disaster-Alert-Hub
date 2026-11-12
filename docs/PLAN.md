# Disaster Hub: Step 0 Findings and Plan

## What exists

- **Stack:** React 18/Vite with Leaflet and React Router; Express/Socket.IO backend; Mongoose models with optional MongoDB and an in-memory demo fallback; separate FastAPI heuristic classifier.
- **Existing features:** responsive dashboard, alert list/search/filters, India map and severity legend, alert details/timeline, mock city weather, admin alert management, chatbot, multilingual UI, and community reports.
- **Current data behavior:** alerts are hardcoded fictional records in `shared/demoAlerts.js`, seeded into MongoDB or loaded into memory and initially shown by the frontend. `backend/services/weatherData.js` generates deterministic mock conditions. The current alert status values (`Verified`, `Pending`, `Unverified`) are not evidence of official verification.
- **Backend/security:** external AI providers are server-side; secrets are read through environment variables. Helmet, CORS configuration, Zod validation, and API/chat rate limits exist. However, `.gitignore` currently only ignores `node_modules`; backend environment examples contain demo credentials, and server/auth code has development credential fallbacks. These need to be handled before production deployment.
- **Gaps:** no live weather or official alert adapters, normalized source-backed alert contract, persistence-backed refresh/cache/scheduler, AI verification/structured summary layer, or test scripts were found. There is an optional MongoDB implementation, so the data layer should be extended carefully rather than replaced without a migration decision.
- **Workspace note:** there is a pre-existing modification to the root `README.md` and an untracked nested `Disaster-Alert-Hub/` copy. Neither was changed. The tracked Python `__pycache__` files are generated artifacts.

## Source and terms checks (12 Nov 2026)

- **Open-Meteo:** the [Terms of Use](https://open-meteo.com/en/terms) state the free API is for non-commercial use, subject to rate limits (10,000 calls/day, 5,000/hour, 600/minute), and CC-BY 4.0 attribution. Recheck current terms and add attribution before enabling it.
- **NDMA SACHET:** [the public site](https://sachet.ndma.gov.in/) could not be retrieved in this environment (transport failure). Its feed endpoint, response format, access conditions, and reuse terms are therefore unverified. Do not invent an endpoint or mark alerts verified until these are documented.
- **IMD:** [the public IMD site](https://mausam.imd.gov.in/) was accessible and links to a document titled “API and warnings supplied by IMD through social media and API.” Public page access does not establish API access or reuse permission; inspect that document and applicable terms before integrating. If usable access cannot be confirmed, omit the adapter and explain why in product documentation.
- NCS/USGS and CWC are optional future sources; review their applicable access and reuse terms before any integration.

## Proposed milestones

Keep the existing React/Express architecture and UI, adding small, independently disableable backend source adapters. Every API response and saved alert should use a validated normalized schema. Source verification remains deterministic code; AI must never create or promote official facts. Preserve the existing demo experience only behind an explicit demo mode, never mixed into live data.

1. **Open-Meteo + normalized schema (Milestone 1 complete):** add a backend adapter for current conditions/forecast, normalize and validate its data, and proxy it to the frontend. Implement usage limits, attribution, timeout/retry behavior, and focused normalizer tests.
2. **NDMA SACHET:** first establish an official, reusable feed and its documented format. Add an adapter only from verified documentation; otherwise keep it disabled and record the blocker. Verify official alerts against source records.
3. **Storage, cache, scheduler:** store normalized weather and alerts, add TTL caching and a 10–15 minute refresh with stale-data timestamps/warnings. Reuse MongoDB when configured; decide whether SQLite should be the local persistent default or whether the existing MongoDB/in-memory modes should remain.
4. **Map and feed:** adapt the existing Leaflet map, feed, search, filters, and details to live normalized records; show source, issued/updated time, official link, verification state, and the prominent safety disclaimer. Ensure no demo records appear in live mode.
5. **AI summary layer:** introduce a provider interface for structured, schema-validated summaries/translations/deduplication only. Compute `Verified`, `Unconfirmed`, and `Conflicting` in code from source evidence; visibly label all generated text as AI-generated.
6. **Hardening and docs:** add tests with mocked upstream calls, error/fallback handling and logging, environment examples/ignore rules, source terms and limitations, setup/architecture/source-adapter documentation, and deployment configuration.

At each milestone, run the smallest relevant tests and the app/build, report verified behavior, limitations, and assumptions, and commit only after the milestone is verified. Do not commit existing user changes. Before live use, remove development secret fallbacks and avoid shipping the demo admin password.

### Milestone 1 verification

- Backend unit tests pass with mocked Open-Meteo responses; tests make no live requests.
- The frontend production build passes.
- The local backend and frontend start successfully; a live Mumbai request returned current conditions and forecasts through the backend proxy.
- The Open-Meteo source is used without a client key. Weather failures return an explicit error; stale-cache fallback is deferred to Milestone 3.

## Decisions and gates before implementation

- Confirm the NDMA SACHET feed and reuse terms, and inspect IMD's linked API document and terms; do not make up API endpoints.
- Choose storage behavior for local development: SQLite as requested when no database is configured, or retain the existing in-memory fallback and use MongoDB when configured.
- Confirm intended deployment/commercial use before relying on Open-Meteo's free non-commercial terms.

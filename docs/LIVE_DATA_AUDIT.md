# Live-data audit

## Findings and disposition

| Previous source/path | What reached the UI or API | Default-flow change |
| --- | --- | --- |
| `shared/demoAlerts.js` | Fictional alert records seeded into the React app, in-memory repository, MongoDB, and seed script | Moved to `mock/demoAlerts.js`; loaded only when `USE_MOCK_DATA=true`. Existing MongoDB alert records are hidden in normal mode, not deleted. |
| `backend/server.js`, `backend/services/repository.js`, `backend/scripts/seed.js` | Startup alert/category seeding and demo administrator credentials | Startup no longer seeds alert/category records. Seed command requires `USE_MOCK_DATA=true`. Administrator creation requires explicit `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `JWT_SECRET` configuration. |
| `backend/services/weatherData.js` and `backend/services/chatService.js` | Deterministic generated weather and canned alert/weather answers | Moved under `mock/`; mock chat is imported only when `USE_MOCK_DATA=true`. Normal chat explicitly reports that no official feed is connected. |
| `backend/models/Weather.js` | Unused weather model defaulted records to a mock source and local timestamp | Removed both defaults so the schema cannot silently label unsourced records as live data. |
| `backend/data/disasterKnowledge.js` | Static safety content returned by the mock chatbot | Moved to `mock/disasterKnowledge.js`, used only by the explicitly enabled mock chatbot. The preparedness page now states that no official guidance source is connected. |
| `frontend/src/App.jsx` | Initial demo alert list and silent fallback to it when the API failed | Starts empty, reports API failures, and never substitutes local records. |
| `frontend/src/pages/Dashboard.jsx` | Fabricated trend values and a fixed count of 46 reports | Trend is computed only from available alert records; community report count is fetched from the API. |
| `frontend/src/pages/AlertDetail.jsx` | Generated verification events and timestamps offset from an alert timestamp | Removed; the detail page shows only fields present in the record. |
| `frontend/src/pages/ContactsPage.jsx` | Hardcoded emergency directory and category list | Unverified phone numbers were removed; no emergency directory is shown until an official source is connected. Community submissions are identified as unverified. |
| `frontend/src/pages/InformationPage.jsx` | Unsourced, hardcoded hazard guidance | Removed from the default UI; it now clearly states that no official guidance source is connected. |
| `frontend/src/pages/AdminPage.jsx` | Default demo credentials, preset alert details, generated alert IDs, and a hardcoded category list | Removed. Alert and category administration is disabled unless mock mode is explicitly enabled. |
| `backend/services/repository.js` | Stored demo alerts/categories and old alert notifications could be returned from MongoDB | Normal mode returns no alert/category records and filters notifications to community reports. Existing records are preserved but not exposed as current alerts. |
| Browser chat storage | Previously saved demo conversation messages could be reopened as current assistant output | Live chat uses a new versioned storage key and does not load the old demo history. |
| `ai-service/services/classifier.py` | Hardcoded keyword/location heuristic could emit suggested event classifications | The optional classifier API returns disabled by default and requires `USE_MOCK_DATA=true`; its output is not an official alert or verification. |

## Intentional static configuration

`backend/config/weatherLocations.js` contains configured Indian city names and coordinates used to make live Open-Meteo requests. These are location configuration, not measured or generated weather values. Map center, severity colors, filter labels, and icon mappings are presentation configuration, not alert records.

Community reports are user-submitted content, not official alerts. They remain separate from the alert feed and must be treated as unverified.

The workspace also contains an untracked nested `Disaster-Alert-Hub/` copy. Its `shared/demoAlerts.js` is still imported by `frontend/src/App.jsx`, `backend/server.js`, `backend/services/repository.js`, and `backend/scripts/seed.js`; `backend/services/weatherData.js` is still called by `backend/routes/data.js`. It is not part of the root npm workspaces or tracked repository files and was left untouched to preserve unrelated local files; running that nested copy would still show its old mock flow.

## Live source status

- Weather uses the Open-Meteo forecast endpoint with only `current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code` and `timezone=Asia/Kolkata`. Weather values display the Open-Meteo `current.time` timestamp and source.
- A failed live weather request produces `Live data unavailable`; it does not fall back to mock weather. In development, `/api/debug/raw/:city` returns the unnormalized upstream response.
- No SACHET/NDMA feed endpoint or response format is connected. The default alert feed is empty and explicitly says no official feed is connected.
- `USE_MOCK_DATA` defaults to `false`. Mock fixtures are contained in `/mock` and are only loaded when explicitly enabled. The separate heuristic classifier is disabled unless that flag is explicitly enabled.

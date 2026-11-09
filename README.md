# Disaster Alert Hub

Disaster Alert Hub is an independent student/demo project for exploring emergency information workflows. It is not affiliated with any government body. All included alerts are fictional training records; mock weather, reference phone numbers, and preparedness content must not be treated as live emergency information.

## Features

- Responsive dashboard with alert counts, severity and trend visualizations.
- Twenty fictional alert records spanning multiple Indian states, hazard types, severity levels, and verification states.
- Search and filters for alert ID, city, state, district, disaster, severity, date, and verification status; CSV export.
- Leaflet map with severity-colored markers, popups, and interactive filters.
- Alert details with coordinates, confidence, affected area, safety guidance, and a demo timeline.
- City weather lookup with deterministic mock conditions and forecast.
- Expandable preparedness guides and an emergency contact reference directory.
- Demo report submission and admin review.
- JWT admin sign-in, hashed passwords, role-based access, alert CRUD, verification, user role management, and dashboard analytics.
- Socket.IO broadcasts admin alert changes to connected browsers.
- Floating DisasterAssist AI chatbot with alert-aware answers, structured preparedness guidance, mock weather context, and immediate-emergency escalation language.
- Optional OpenAI, Gemini, and local Ollama-compatible model adapters; deterministic grounded demo responses work without credentials.
- DisasterAssist AI supports 22 language choices, automatic script/hint detection, saved language preferences, browser speech input/output, and optional hands-free voice mode.
- Express API uses in-memory seed data when MongoDB is not configured; optional MongoDB persistence is supported.
- Optional FastAPI heuristic classifier for category, location, urgency, duplicate and suspicious-content indicators. It is a rule-based demo, not a trained ML model and not an automated emergency authority.

## Technology

React 18, Vite, Tailwind CSS, React Router, Leaflet/React Leaflet, Recharts, Lucide React, Node.js, Express, Socket.IO, Mongoose, MongoDB, JWT, bcrypt, Zod, FastAPI, and Pydantic.

## Requirements

- Node.js 20 or newer and npm.
- MongoDB is optional for the in-memory demo; use MongoDB 6+ for persistence.
- Python 3.10+ is optional and only needed for the classifier.
- The map uses OpenStreetMap tiles and therefore needs an internet connection to display its basemap.

## Quick start

From the project root:

```powershell
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The API runs at `http://localhost:4000`. Without `MONGODB_URI`, the API starts with in-memory demo alerts and a demo administrator. In-memory changes are reset when the backend restarts.

The app can still show its bundled demo alerts if the API is not running, but admin sign-in, report submission, persistence, and real-time updates require the backend.

## Admin demo access

- Email: `admin@demo.com`
- Password: `DemoAdmin123!`

These defaults are for local demonstration only. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and a strong `JWT_SECRET` before exposing the service. The demo account is created on backend startup if it does not already exist.

## Configuration

Copy the example environment file in PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4000` | Express API and Socket.IO port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Comma-separated allowed browser origins |
| `JWT_SECRET` | Development-only fallback | Secret used to sign admin/user tokens; replace it |
| `ADMIN_EMAIL` | `admin@demo.com` | Seeded demo admin email |
| `ADMIN_PASSWORD` | `DemoAdmin123!` | Seeded demo admin password |
| `MONGODB_URI` | Unset | Optional MongoDB connection string |
| `VITE_API_URL` | `http://localhost:4000/api` | Optional frontend API base URL |
| `AI_PROVIDER` | `demo` | `demo`, `openai`, `gemini`, or `local` |
| `AI_API_KEY` | Unset | Backend-only provider key for OpenAI or Gemini. Never put it in frontend code or a `VITE_` variable. |
| `AI_MODEL` | Provider default | Optional model name |
| `AI_BASE_URL` | `http://localhost:11434/api/chat` | Local Ollama-compatible chat endpoint |

If no `.env` is present, the backend uses in-memory data. To use MongoDB, start a local MongoDB server (or provide a hosted connection string), set `MONGODB_URI`, then restart the API. The server seeds the 20 demo alerts and administrator only when their collections are empty. The standalone seed command is `npm run seed --workspace backend` and requires `MONGODB_URI`.

## Run services separately

```powershell
# Frontend
npm run dev --workspace frontend

# Backend
npm run dev --workspace backend

# Production frontend build
npm run build
```

To start the optional classifier:

```powershell
Set-Location ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Check `GET http://localhost:8000/health`, then send `POST /analyze` JSON such as:

```json
{
  "text": "Heavy rain and rising flood water near Mumbai today. Several roads are covered.",
  "location": ""
}
```

The classifier returns `event`, `location`, `severity`, `confidence`, `duplicate`, `suspicious`, `verificationRequired`, `extractedDate`, and `method`. It does not automatically publish an alert; every result requires human review.

## API

All routes are prefixed with `/api`. JSON errors use an `error` field. Admin routes require `Authorization: Bearer <JWT>` and the `admin` role.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | API and storage mode |
| `GET` | `/alerts` | Public | List alert records |
| `GET` | `/alerts/:id` | Public | Fetch by alert ID or Mongo ID |
| `POST` | `/alerts` | Admin | Create validated alert and broadcast event |
| `PUT` | `/alerts/:id` | Admin | Edit alert |
| `DELETE` | `/alerts/:id` | Admin | Remove alert |
| `GET` | `/disasters` | Public | Disaster categories |
| `POST` | `/disasters` | Admin | Add a disaster category |
| `PUT` | `/disasters/:id` | Admin | Rename or update a category |
| `DELETE` | `/disasters/:id` | Admin | Remove a category |
| `GET` | `/weather?city=Mumbai` | Public | Mock city weather |
| `GET` | `/locations` | Public | Locations derived from alerts |
| `GET` | `/reports` | Public | List demo reports |
| `POST` | `/reports` | Public | Submit a demo report |
| `GET` | `/notifications` | Public | Notification feed |
| `POST` | `/chat` | Public | Ask DisasterAssist AI using grounded app data |
| `POST` | `/detect-language` | Public | Detect a supported language from text (`{"text":"..."}`) |
| `POST` | `/auth/login` | Public | Login and receive JWT |
| `POST` | `/auth/register` | Public | Register a normal user |
| `GET` | `/admin/dashboard` | Admin | Statistics |
| `GET` | `/admin/users` | Admin | List users without password hashes |
| `PUT` | `/admin/users/:id/role` | Admin | Change a user's role |
| `DELETE` | `/admin/users/:id` | Admin | Remove a user |
| `PUT` | `/admin/alerts/:id/verify` | Admin | Mark verified or unverified (`{"verified":true}`) |

Socket.IO runs on the same port. Connected clients receive `connection:ready`, `alert:created`, `alert:updated`, `alert:deleted`, and `report:created` events. Alert mutations originate in the authenticated admin API; the demo does not fabricate real-time hazard observations.

## Data model

The optional Mongo configuration creates `users`, `alerts`, `reports`, `disasters`, `locations`, `weather`, `notifications`, and `chatSessions` collections. Alert records contain `alertId`, `title`, `disasterType`, `severity`, `state`, `district`, `city`, `latitude`, `longitude`, `description`, `source`, `timestamp`, `verificationStatus`, `confidenceScore`, `affectedArea`, and `safetyInstructions`. Chat history is bounded to the most recent 24 messages per session; when MongoDB is disabled, sessions stay in memory until the API process exits.

## DisasterAssist AI

The floating **DisasterAssist AI** launcher appears on every page. It uses the existing alert repository, mock weather generator, and structured disaster safety knowledge. Alert lists and location lookups are deterministic; the **Ask AI about this alert** action sends only the alert ID, which the backend resolves itself. Missing location matches never imply an area is safe. Immediate-emergency responses clearly state that the assistant cannot dispatch help and refer users to verified local emergency services.

The language menu includes English and 21 additional Indian languages: Hindi, Marathi, Bengali, Gujarati, Punjabi, Tamil, Telugu, Kannada, Malayalam, Odia, Assamese, Urdu, Sanskrit, Nepali, Konkani, Kashmiri, Sindhi, Maithili, Manipuri/Meitei, Bodo, and Santali. Auto-detect is the initial preference; the chat begins in English until it detects another language from the user's text. A manual selection overrides detection and is saved in browser local storage. The API exposes `POST /api/detect-language` and accepts an optional `language` code (`auto` or one of the shared language registry codes) on `/api/chat`.

Voice input uses the browser Web Speech API (`SpeechRecognition` or `webkitSpeechRecognition`) and requests microphone access only after the user presses the microphone or Voice Mode control. Text-to-speech uses `SpeechSynthesis`; it chooses an installed matching voice when available and falls back to the browser default. Browser support and installed language voices vary. Voice controls degrade to clear status messages when permission, recognition, or speech output is unavailable. Use HTTPS or localhost for microphone access.

The built-in demo has curated deterministic safety replies for common flood/cyclone/kit prompts in English, Hindi, Marathi, Bengali, Tamil, and Telugu, plus multilingual UI, script detection, location/alert intent routing, and localized abstention text. For natural-language safety replies beyond these curated templates, configure an OpenAI, Gemini, or local model provider. Model output is instructed to use the selected language and supplied knowledge only; live alert records and mock weather answers remain deterministic backend responses.

Chat request example:

```json
{
  "message": "Show alerts near Mumbai",
  "conversationId": "demo-user-001",
  "language": "auto"
}
```

The session ID accepts 8–80 alphanumeric, underscore, or hyphen characters. Responses include `reply`, `sources`, and `timestamp`. The chat endpoint has a dedicated per-IP rate limit and Zod validation in addition to the API-wide limiter. Provider credentials are only read by the backend from `AI_API_KEY`; never prefix them with `VITE_` or expose them in React. Choose `AI_PROVIDER=openai` or `gemini` with a backend key, or `AI_PROVIDER=local` with a local Ollama-compatible service. The default `demo` provider needs no key and returns grounded deterministic responses. Alert, location, weather, and included safety-guide questions are handled through deterministic backend data paths even when a model provider is configured.

Try: `What alerts are active?`, `Show alerts near Mumbai`, `Are there alerts near Atlantis?`, `What should I do during a flood?`, `What should I keep in an emergency kit?`, `What is the weather in Chennai?`, `मुंबई में कोई अलर्ट है?`, `बाढ़ के समय मुझे क्या करना चाहिए?`, `मुंबईमध्ये काही अलर्ट आहे का?`, or `வெள்ளத்தின் போது நான் என்ன செய்ய வேண்டும்?`. To test the alert handoff, open an alert and select **Ask AI about this alert**. Use the microphone button for speech input, the speaker control to read a response, or Voice Mode for a speech-question/voice-answer flow.

## Safety and security notes

- This prototype is not an emergency notification or dispatch system. Do not use it for operational response.
- Alert and weather examples are fictional/mock data. Do not present them as active warnings or forecasts.
- Contact numbers and preparedness guidance are reference information; verify current local information through official channels.
- The backend enables Helmet, CORS allow-listing, JSON size limits, Zod input validation, and API rate limiting. Passwords are hashed with bcrypt; admin APIs use JWT role checks.
- In-memory storage is volatile. Configure MongoDB for persistence. Use HTTPS, strong secrets, managed credentials, stricter rate limits, audit logging, and production account provisioning before any deployment.
- Socket event payloads are demo records. The Socket.IO channel is not an authenticated emergency data feed.#   T e a m - D i a m o n d s -  
 
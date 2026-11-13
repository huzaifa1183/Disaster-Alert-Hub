from pathlib import Path

readme = r'''# 🌪️ Disaster Alert Hub

### AI-Powered Disaster Monitoring, Alert Management & Emergency Assistance Platform

<p align="center">
  <strong>Monitor • Analyze • Verify • Respond</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" />
  <img src="https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js" />
  <img src="https://img.shields.io/badge/Python-FastAPI-3776AB?logo=python" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss" />
  <img src="https://img.shields.io/badge/Project-Student%20Demo-orange" />
</p>

---

## 📌 About the Project

**Disaster Alert Hub** is an independent student/demo project for exploring disaster information and emergency assistance workflows.

The platform provides a centralized dashboard to explore disaster alerts, visualize locations, review reports, and access disaster preparedness information. It combines an interactive map, a multilingual chatbot called **DisasterAssist AI**, voice assistance, and an administrative alert management system.

> ⚠️ **Important disclaimer:** This is an independent educational demonstration project and is not affiliated with any government organization. All included alerts and weather conditions are fictional/mock data. It is not an operational emergency warning or dispatch system.

## ✨ Features

### 📊 Interactive Disaster Dashboard
- Responsive dashboard with alert counts, severity and trend visualizations.
- Fictional alert records spanning multiple Indian states, hazard types, severity levels, and verification states.
- Search and filters for alert ID, city, state, district, disaster, severity, date, and verification status.
- CSV export for alert records.

### 🗺️ Interactive Disaster Map
- Leaflet map with severity-colored markers.
- Interactive popups and filters.
- Geographic visualization of demo disaster records.

### 🤖 DisasterAssist AI Chatbot
- Alert-aware answers grounded in application data.
- Live current weather and seven-day forecasts for configured cities, sourced from Open-Meteo.
- Structured disaster preparedness guidance.
- Explicit mock weather is used only when mock mode is enabled.
- Optional OpenAI, Gemini, and local Ollama-compatible model adapters.
- Deterministic demo responses work without AI credentials.
- Emergency responses explain that the assistant cannot dispatch help.

### 🌐 Multilingual Assistance
DisasterAssist AI offers 22 language choices:
- English, Hindi, Marathi, Bengali, Gujarati, Punjabi
- Tamil, Telugu, Kannada, Malayalam, Odia, Assamese
- Urdu, Sanskrit, Nepali, Konkani, Kashmiri, Sindhi
- Maithili, Manipuri/Meitei, Bodo, and Santali

Additional capabilities include automatic language/script detection, saved language preferences, browser speech input/output, and optional hands-free voice mode.

### 🚨 Alert and Report Management
- Alert details with coordinates, confidence, affected area, safety guidance, and demo timeline.
- Demo report submission and admin review.
- JWT admin sign-in and hashed passwords.
- Role-based access, alert CRUD, verification, user role management, and dashboard analytics.
- Socket.IO broadcasts admin alert changes to connected browsers.

### 🧠 Optional AI Report Classifier
The optional FastAPI heuristic classifier provides category, location, urgency, duplicate, and suspicious-content indicators. It is a rule-based demonstration, not a trained ML model or an automated emergency authority. Every result requires human review.

### 🌦️ Other Features
- City weather lookup with live Open-Meteo conditions and a seven-day forecast.
- Expandable preparedness guides.
- Emergency contact reference directory.
- Express API with in-memory seed data when MongoDB is not configured.
- Optional MongoDB persistence.

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React 18, Vite, JavaScript |
| Styling | Tailwind CSS, PostCSS |
| Routing | React Router |
| Maps | Leaflet, React Leaflet |
| Data Visualization | Recharts |
| Backend | Node.js, Express |
| Real-time communication | Socket.IO |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcrypt |
| Validation | Zod |
| AI integrations | OpenAI, Gemini, Ollama-compatible models |
| AI classifier | Python, FastAPI, Pydantic |
| Icons | Lucide React |
| Version control | Git, GitHub |

## 📁 Project Structure

```text
Disaster-Alert-Hub/
├── ai-service/
│   ├── main.py
│   └── requirements.txt
├── backend/
│   ├── data/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── shared/
├── .gitignore
├── package-lock.json
├── package.json
└── README.md
```

## ⚙️ Requirements

- Node.js 20 or newer and npm.
- MongoDB 6+ is optional; without it, the backend uses in-memory demo data.
- Python 3.10+ is optional and only needed for the classifier.
- Internet access is required for OpenStreetMap tiles.
- AI provider credentials are optional.

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/huzaifa1183/Disaster-Alert-Hub.git
```

### 2. Open the project directory

```bash
cd Disaster-Alert-Hub
```

### 3. Install dependencies

From the project root:

```bash
npm install
```

### 4. Configure environment variables

**Windows PowerShell:**

```powershell
Copy-Item backend/.env.example backend/.env
```

**Linux/macOS:**

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` if you want to configure MongoDB, authentication secrets, or an external AI provider.

### 5. Start the application

From the project root:

```bash
npm run dev
```

Open the Vite URL shown in the terminal, normally:

```text
http://localhost:5173
```

The API normally runs at:

```text
http://localhost:4000
```

The app can show bundled demo alerts if the API is not running. Admin sign-in, report submission, persistence, and real-time updates require the backend.

## ▶️ Run Services Separately

```bash
# Frontend
npm run dev --workspace frontend

# Backend
npm run dev --workspace backend

# Production frontend build
npm run build
```

## 🐍 Optional AI Classifier Setup

From the project root:

```bash
cd ai-service
python -m venv .venv
```

Activate the environment.

**Windows PowerShell:**

```powershell
.\.venv\Scripts\Activate.ps1
```

**Linux/macOS:**

```bash
source .venv/bin/activate
```

Install dependencies and start the classifier:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check:

```text
http://localhost:8000/health
```

Classifier endpoint:

```text
POST http://localhost:8000/analyze
```

Example JSON request:

```json
{
  "text": "Heavy rain and rising flood water near Mumbai today. Several roads are covered.",
  "location": ""
}
```

The classifier returns event, location, severity, confidence, duplicate, suspicious, verification requirement, extracted date, and method indicators. It does not automatically publish an alert; every result requires human review.

## 🔐 Environment Configuration

The backend reads configuration from `backend/.env`.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Express API and Socket.IO port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed browser origins |
| `JWT_SECRET` | Development fallback | Secret used to sign tokens; replace it |
| `ADMIN_EMAIL` | `admin@demo.com` | Seeded demo admin email |
| `ADMIN_PASSWORD` | `DemoAdmin123!` | Seeded demo admin password |
| `MONGODB_URI` | Unset | Optional MongoDB connection string |
| `VITE_API_URL` | `http://localhost:4000/api` | Optional frontend API base URL |
| `AI_PROVIDER` | `demo` | `demo`, `openai`, `gemini`, or `local` |
| `AI_API_KEY` | Unset | Backend-only provider key |
| `AI_MODEL` | Provider default | Optional model name |
| `AI_BASE_URL` | `http://localhost:11434/api/chat` | Local Ollama-compatible endpoint |

Never put provider keys in frontend code or `VITE_` variables. Do not commit `.env` files.

Without `MONGODB_URI`, data is stored in memory and resets when the backend restarts. To use MongoDB, configure the connection string and restart the API.

The standalone seed command is:

```bash
npm run seed --workspace backend
```

It requires `MONGODB_URI`.

## 👨‍💻 Admin Demo Access

For local demonstration only:

| Field | Demo value |
|---|---|
| Email | `admin@demo.com` |
| Password | `DemoAdmin123!` |

Change the default credentials and set a strong `JWT_SECRET` before exposing the service. The demo account is created on backend startup if it does not already exist.

## 🔌 API Overview

All backend routes are prefixed with `/api`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | API and storage mode |
| GET | `/alerts` | Public | List alert records |
| GET | `/alerts/:id` | Public | Fetch alert details |
| POST | `/alerts` | Admin | Create an alert |
| PUT | `/alerts/:id` | Admin | Edit an alert |
| DELETE | `/alerts/:id` | Admin | Remove an alert |
| GET | `/disasters` | Public | List disaster categories |
| POST | `/disasters` | Admin | Add a category |
| PUT | `/disasters/:id` | Admin | Update a category |
| DELETE | `/disasters/:id` | Admin | Remove a category |
| GET | `/weather?city=Mumbai` | Public | Live Open-Meteo current conditions and seven-day forecast |
| GET | `/locations` | Public | Locations derived from alerts |
| GET | `/reports` | Public | List demo reports |
| POST | `/reports` | Public | Submit a demo report |
| GET | `/notifications` | Public | Notification feed |
| POST | `/chat` | Public | Ask DisasterAssist AI |
| POST | `/detect-language` | Public | Detect a supported language |
| POST | `/auth/login` | Public | Login and receive JWT |
| POST | `/auth/register` | Public | Register a normal user |
| GET | `/admin/dashboard` | Admin | Dashboard statistics |
| GET | `/admin/users` | Admin | List users |
| PUT | `/admin/users/:id/role` | Admin | Change a user's role |
| DELETE | `/admin/users/:id` | Admin | Remove a user |
| PUT | `/admin/alerts/:id/verify` | Admin | Verify or unverify an alert |

Admin routes require `Authorization: Bearer <JWT>` and the admin role.

## ⚡ Real-Time Events

Socket.IO runs on the backend port. Connected clients can receive:

- `connection:ready`
- `alert:created`
- `alert:updated`
- `alert:deleted`
- `report:created`

These events communicate application changes. They are not a live emergency data feed.

## 🗄️ Data Model

When MongoDB is configured, the application uses collections for users, alerts, reports, disasters, locations, weather, notifications, and chat sessions.

Alert records can contain an alert ID, title, disaster type, severity, state, district, city, coordinates, description, source, timestamp, verification status, confidence score, affected area, and safety instructions.

## 🤖 DisasterAssist AI

DisasterAssist AI uses current SACHET/NDMA alert records, live Open-Meteo weather and forecast data for configured cities, and structured disaster safety knowledge. It asks for a city when one is not specified; it does not guess live conditions.

Example questions:

- `What alerts are active?`
- `Show alerts near Mumbai`
- `What should I do during a flood?`
- `What should I keep in an emergency kit?`
- `What is the weather in Chennai?`
- `Will it rain tomorrow in Mumbai?`
- `मुंबई में कोई अलर्ट है?`
- `बाढ़ के समय मुझे क्या करना चाहिए?`
- `मुंबईमध्ये काही अलर्ट आहे का?`

Alert lists and location lookups are deterministic. The chatbot does not treat missing location matches as proof that an area is safe.

The browser speech features use the Web Speech API and SpeechSynthesis where supported. Microphone access is requested only after the user activates a voice control. Browser support and installed language voices vary; use HTTPS or localhost for microphone access.

The default `demo` provider requires no API key. Optional providers can be configured using backend environment variables. Model-generated content should not be treated as verified emergency advice.

## 🔒 Safety and Security Notes

- This prototype is not an emergency notification or dispatch system.
- Weather answers use Open-Meteo model data and are not official warnings. Explicit mock mode uses fictional/demo weather instead.
- Contact numbers and preparedness guidance are reference information; verify current local information through official channels.
- The classifier is heuristic and requires human review.
- In-memory storage is temporary; configure MongoDB for persistence.
- Use HTTPS, strong secrets, managed credentials, appropriate rate limits, and audit logging before deployment.
- Socket.IO events are demo application records, not an authenticated emergency data feed.

## 🎯 Project Objectives

1. Explore how AI can support disaster information workflows.
2. Build a centralized disaster alert dashboard.
3. Demonstrate geographic visualization of alert records.
4. Explore multilingual and voice-enabled AI assistance.
5. Demonstrate heuristic report classification and human review.
6. Combine frontend, backend, database, and AI technologies in one platform.

## 🚀 Future Enhancements

- Integration with verified official disaster information APIs.
- Live weather data integration.
- Improved machine learning-based report classification.
- Advanced duplicate and suspicious-report analysis.
- Enhanced geospatial analytics.
- Expanded regional language support.
- Mobile application development.

These are potential future improvements, not claims of existing functionality.

## 🤝 Contributing

Contributions, suggestions, and improvements are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Commit your changes.
5. Submit a pull request.

## 📜 License

This project is developed for educational, demonstration, and research purposes. Add an appropriate open-source license before granting reuse permissions.

---

<p align="center">
  <strong>🌪️ Disaster Alert Hub</strong><br />
  AI-Powered Disaster Monitoring & Emergency Assistance<br /><br />
  <em>Built with ❤️ using AI, Data Science & Web Technologies.</em>
</p>
'''

path = Path("/mnt/data/README.md")
path.write_text(readme, encoding="utf-8")
print(f"Created {path} ({len(readme.splitlines())} lines)")

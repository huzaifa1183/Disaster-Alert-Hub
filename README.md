# 🌪️ Disaster Alert Hub

### AI-Powered Disaster Monitoring, Alert Management & Emergency Assistance Platform

<p align="center">
  <strong>Monitor • Analyze • Verify • Respond</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" />
  <img src="https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js" />
  <img src="https://img.shields.io/badge/Python-FastAPI-3776AB?logo=python" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss" />
  <img src="https://img.shields.io/badge/AI-DisasterAssist-purple" />
  <img src="https://img.shields.io/badge/Project-Student%20Demo-orange" />
</p>

---

## 📌 About the Project

**Disaster Alert Hub** is an AI-powered disaster information and emergency assistance platform developed as a student/demo project.

The platform provides a centralized dashboard to explore disaster alerts, visualize affected locations, analyze emergency reports, and access disaster preparedness information.

It integrates an interactive map, an AI-powered chatbot named **DisasterAssist AI**, multilingual communication, voice assistance, and an administrative alert management system.

The project demonstrates how Artificial Intelligence, Machine Learning concepts, web technologies, and data visualization can be combined to support disaster information workflows.

> ⚠️ **Disclaimer:** This is an independent educational demonstration project and is not affiliated with any government organization. All included alerts and weather conditions are fictional/mock data. It is not an operational emergency warning or dispatch system.

---

## ✨ Key Features

### 1. 📊 Interactive Disaster Dashboard
- Responsive dashboard with alert statistics.
- Severity distribution and trend visualizations.
- Multiple disaster categories and Indian state coverage.
- Alert verification status.
- Search and filtering functionality.
- CSV export for alert records.

### 2. 🗺️ Interactive Disaster Map
- Leaflet-based interactive map.
- Severity-based colored markers.
- Location-specific alert information.
- Interactive map popups.
- Geographic visualization of demo disaster records.

### 3. 🤖 DisasterAssist AI Chatbot
- AI-powered disaster assistance chatbot.
- Context-aware responses using application data.
- Disaster preparedness recommendations.
- Alert-related questions and answers.
- Emergency kit guidance.
- Mock weather information.
- Optional OpenAI, Gemini, and Ollama-compatible integrations.
- Deterministic demo responses without API credentials.

### 4. 🌐 Multilingual AI Assistance

Supports 22 language choices:

- English
- Hindi
- Marathi
- Bengali
- Gujarati
- Punjabi
- Tamil
- Telugu
- Kannada
- Malayalam
- Odia
- Assamese
- Urdu
- Sanskrit
- Nepali
- Konkani
- Kashmiri
- Sindhi
- Maithili
- Manipuri / Meitei
- Bodo
- Santali

Additional capabilities:
- Automatic language detection.
- Manual language selection.
- Saved language preferences.
- Multilingual chatbot interface.

### 5. 🎙️ Voice Assistance
- Browser-based speech recognition.
- Voice-based chatbot interaction.
- Text-to-speech responses.
- Optional hands-free Voice Mode.
- Language-aware voice selection where supported.

### 6. 🚨 Alert Management System
- Multiple fictional disaster alert records.
- Alert severity classification.
- Alert verification workflow.
- Detailed alert information.
- Affected area and confidence information.
- Safety guidance and demo timeline.
- Admin-controlled alert creation, editing, and deletion.

### 7. 🛡️ Admin Dashboard
- Secure administrator authentication.
- JWT-based authorization.
- Role-based access control.
- User management.
- Alert verification.
- Dashboard analytics.
- Report management.
- Real-time updates using Socket.IO.

### 8. 🧠 AI-Based Report Classification

Optional FastAPI-based heuristic classifier.

Capabilities include:
- Disaster category identification.
- Location extraction.
- Urgency estimation.
- Duplicate report indicators.
- Suspicious-content indicators.
- Confidence estimation.
- Human verification requirement.

**Note:** This is a rule-based demonstration classifier, not a trained machine learning model or an automated emergency authority.

---

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React 18, Vite, JavaScript |
| Styling | Tailwind CSS, PostCSS |
| Routing | React Router |
| Maps | Leaflet, React Leaflet |
| Data Visualization | Recharts |
| Backend | Node.js, Express.js |
| Real-Time Communication | Socket.IO |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcrypt |
| Validation | Zod |
| AI Integration | OpenAI, Gemini, Ollama |
| AI Classification | Python, FastAPI, Pydantic |
| Icons | Lucide React |
| Version Control | Git, GitHub |

---

## 📁 Project Structure

```text
Disaster-Alert-Hub/
│
├── ai-service/
│   ├── main.py
│   └── requirements.txt
│
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
│
├── frontend/
│   ├── dist/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── shared/
│
├── .gitignore
├── package-lock.json
├── package.json
└── README.md
```

---

## ⚙️ Installation & Setup

### Requirements

- Node.js 20 or newer.
- npm.
- MongoDB 6+ (optional).
- Python 3.10+ (optional, for AI classifier).
- Internet connection for OpenStreetMap tiles and optional AI integrations.

### Step 1: Clone the Repository

```bash
git clone https://github.com/huzaifa1183/Disaster-Alert-Hub.git
```

### Step 2: Navigate to the Project

```bash
cd Disaster-Alert-Hub
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Configure Environment Variables

Copy the example environment file:

**Windows PowerShell:**

```powershell
Copy-Item backend/.env.example backend/.env
```

**Linux / macOS:**

```bash
cp backend/.env.example backend/.env
```

Configure the required environment variables inside `backend/.env`.

### Step 5: Start the Application

Start the development server:

```bash
npm run dev
```

Open the Vite URL displayed in your terminal, normally:

```text
http://localhost:5173
```

The backend API normally runs at:

```text
http://localhost:4000
```

---

## 🔧 Run Services Separately

### Frontend

```bash
npm run dev --workspace frontend
```

### Backend

```bash
npm run dev --workspace backend
```

### Production Build

```bash
npm run build
```

---

## 🐍 Optional AI Classifier Setup

Navigate to the AI service directory:

```bash
cd ai-service
```

Create a Python virtual environment:

```bash
python -m venv .venv
```

Activate the environment.

**Windows:**

```powershell
.\.venv\Scripts\Activate.ps1
```

**Linux / macOS:**

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
uvicorn main:app --reload --port 8000
```

Health check:

```text
http://localhost:8000/health
```

The classifier accepts POST requests at:

```text
http://localhost:8000/analyze
```

Example request:

```json
{
  "text": "Heavy rain and rising flood water near Mumbai today. Several roads are covered.",
  "location": ""
}
```

The classifier returns event, location, severity, confidence, duplicate, suspicious, and verification-related indicators.

All classification results require human review.

---

## 🔐 Environment Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Backend server port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed frontend origins |
| `JWT_SECRET` | Development fallback | JWT authentication secret |
| `ADMIN_EMAIL` | `admin@demo.com` | Demo administrator email |
| `ADMIN_PASSWORD` | `DemoAdmin123!` | Demo administrator password |
| `MONGODB_URI` | Unset | MongoDB connection string |
| `VITE_API_URL` | `http://localhost:4000/api` | Frontend API URL |
| `AI_PROVIDER` | `demo` | AI provider selection |
| `AI_API_KEY` | Unset | Backend-only AI API key |
| `AI_MODEL` | Provider default | Optional AI model |
| `AI_BASE_URL` | Ollama endpoint | Local AI endpoint |

Supported AI providers:

- `demo`
- `openai`
- `gemini`
- `local`

Never expose API keys in frontend code or upload `.env` files to GitHub.

---

## 👨‍💻 Admin Demo Access

For local demonstration:

| Field | Demo Credentials |
|---|---|
| Email | `admin@demo.com` |
| Password | `DemoAdmin123!` |

**Security:** These are demonstration credentials only. Change the default credentials and JWT secret before any deployment. Never use demo credentials in a public production environment.

---

## 🔌 API Documentation

All backend API routes are prefixed with:

```text
/api
```

### Alert APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/alerts` | Get all alerts |
| GET | `/alerts/:id` | Get alert details |
| POST | `/alerts` | Create alert (Admin) |
| PUT | `/alerts/:id` | Update alert (Admin) |
| DELETE | `/alerts/:id` | Delete alert (Admin) |

### Disaster APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/disasters` | List disaster categories |
| POST | `/disasters` | Add category (Admin) |
| PUT | `/disasters/:id` | Update category (Admin) |
| DELETE | `/disasters/:id` | Delete category (Admin) |

### User & Authentication APIs

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | User login |
| POST | `/auth/register` | User registration |
| GET | `/admin/users` | List users (Admin) |
| PUT | `/admin/users/:id/role` | Change user role (Admin) |
| DELETE | `/admin/users/:id` | Delete user (Admin) |

### AI & Chatbot APIs

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/chat` | Chat with DisasterAssist AI |
| POST | `/detect-language` | Detect supported language |

### Other APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Backend health |
| GET | `/weather` | Mock weather information |
| GET | `/locations` | Get alert locations |
| GET | `/reports` | Get reports |
| POST | `/reports` | Submit demo report |
| GET | `/notifications` | Get notifications |
| GET | `/admin/dashboard` | Admin analytics |
| PUT | `/admin/alerts/:id/verify` | Verify an alert (Admin) |

Admin routes require JWT authentication and the appropriate admin role.

---

## ⚡ Real-Time Features

The application uses Socket.IO for real-time communication.

Supported events:

- `connection:ready`
- `alert:created`
- `alert:updated`
- `alert:deleted`
- `report:created`

These events broadcast application changes to connected browsers. They do not represent a live government emergency information feed.

---

## 🗄️ Database

MongoDB persistence is optional.

Supported collections include:

- Users
- Alerts
- Reports
- Disasters
- Locations
- Weather
- Notifications
- Chat Sessions

Without MongoDB configuration, the backend uses in-memory demonstration data. Changes are lost when the backend restarts.

To initialize MongoDB demo data:

```bash
npm run seed --workspace backend
```

This requires a configured `MONGODB_URI`.

---

## 🤖 About DisasterAssist AI

DisasterAssist AI is the integrated chatbot available throughout the application.

It helps users explore fictional disaster alerts, access preparedness information, and understand the safety guidance included in the application.

Example questions:

- What alerts are active?
- Show alerts near Mumbai.
- What should I do during a flood?
- What should I keep in an emergency kit?
- What is the weather in Chennai?
- मुंबई में कोई अलर्ट है?
- बाढ़ के समय मुझे क्या करना चाहिए?

The chatbot can use deterministic demo responses or optional external AI providers.

It cannot dispatch emergency assistance or verify real-world emergency conditions.

---

## 🔒 Security & Safety

The project includes:

- Helmet security middleware.
- CORS origin restrictions.
- JWT-based authentication.
- Password hashing using bcrypt.
- Role-based authorization.
- Zod input validation.
- API rate limiting.
- JSON request size limits.

Before deployment:

- Use HTTPS.
- Configure strong secrets.
- Protect API credentials.
- Replace demo administrator credentials.
- Configure persistent database storage.
- Implement appropriate audit logging.
- Verify emergency information using official sources.

---

## 🎯 Project Objectives

1. Explore how AI can support disaster information workflows.
2. Build a centralized disaster alert dashboard.
3. Demonstrate geographical disaster visualization.
4. Explore multilingual AI-powered assistance.
5. Demonstrate automated report classification.
6. Provide an administrative alert verification workflow.
7. Combine frontend, backend, database, and AI technologies into one platform.

---

## 🚀 Future Enhancements

Potential future development directions:

- Integration with verified official disaster information APIs.
- Real-time weather data integration.
- Improved machine learning-based report classification.
- Duplicate and misinformation detection improvements.
- Advanced geospatial analytics.
- More regional language support.
- Mobile application development.
- Improved notification and subscription systems.

These are potential enhancements, not claims of existing functionality.

---

## 🤝 Contributing

Contributions and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Commit your changes.
5. Submit a pull request.

---

## 📜 License

This project is developed for educational, demonstration, and research purposes.

Add an appropriate open-source license before granting reuse permissions.

---

<p align="center">
  <strong>🌪️ Disaster Alert Hub</strong>
  <br/>
  AI-Powered Disaster Monitoring & Emergency Assistance
  <br/><br/>
  <em>Built with ❤️ using AI, Data Science & Web Technologies.</em>
</p>
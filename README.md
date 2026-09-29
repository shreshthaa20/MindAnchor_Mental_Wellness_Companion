<h1 align="center">🧠 MindAnchor</h1>

<p align="center">
  <em>Your AI-powered mental wellness companion — journal, track, reflect, and grow.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Flutter-3.x-02569B?logo=flutter&logoColor=white" alt="Flutter" />
  <img src="https://img.shields.io/badge/Dart-3.x-0175C2?logo=dart&logoColor=white" alt="Dart" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Python-FastAPI-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Gemini-AI-4285F4?logo=google&logoColor=white" alt="Gemini AI" />
</p>

---

## 📖 Overview

**MindAnchor** is a cross-platform mental wellness app built with Flutter. It helps users build healthy emotional habits through mood tracking, reflective journaling, a personalized wellness dashboard, and an AI-powered companion chat backed by Retrieval-Augmented Generation (RAG).

### 🐳 Built with Docker
The entire backend infrastructure is **fully containerized**. We use Docker to package the Node.js API, the Python FastAPI service, and the PostgreSQL database into isolated "containers". This ensures that the app runs identically on any developer's machine without complex local setup, and makes it instantly ready for deployment to any modern cloud platform.

The app is powered by a **three-tier architecture**:
- 🎨 **Flutter Frontend** — cross-platform UI (Android, iOS, Web, Desktop)
- ⚙️ **Node.js + Express Backend** — REST API, JWT auth, database operations
- 🐍 **Python FastAPI RAG Service** — semantic search, embeddings, and AI chat via Google Gemini

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Authentication** | Secure JWT-based login & registration |
| 😊 **Mood Tracking** | Log daily moods and view emotional patterns over time |
| 📓 **Journaling** | Write, save, and revisit personal journal entries |
| 📊 **Wellness Dashboard** | Visualise mood trends and wellness insights with interactive charts |
| 🤖 **AI Wellness Guide** | Chat with an AI companion powered by Google Gemini + RAG |
| 🔍 **Semantic Search** | Find relevant past entries and wellness knowledge using vector embeddings |

---

## 🏗️ Architecture

```
mindmate/
└── MindAnchor/
    ├── lib/                    # Flutter app source code
    │   ├── core/               # Theme, providers, shared utilities
    │   ├── features/           # Feature modules
    │   │   ├── auth/           # Login & registration screens
    │   │   ├── home/           # Home screen
    │   │   ├── mood/           # Mood tracking
    │   │   ├── journal/        # Journaling
    │   │   ├── dashboard/      # Analytics & insights
    │   │   ├── chat/           # AI companion chat
    │   │   └── profile/        # User profile
    │   └── shared/             # Shared widgets & helpers
    ├── backend/                # Node.js + Express REST API
    │   └── src/
    │       ├── routes/         # API route definitions
    │       ├── controllers/    # Request handlers
    │       ├── middleware/      # JWT auth middleware
    │       ├── models/         # Data models
    │       ├── services/       # Business logic
    │       ├── utils/          # Utility helpers
    │       ├── config/         # App configuration
    │       └── database/       # DB config & migrations (Drizzle ORM)
    └── rag_backend/            # Python FastAPI RAG microservice
        └── app/
            ├── main.py         # FastAPI endpoints
            ├── services/       # RAG, embedding & Gemini logic
            ├── database.py     # PostgreSQL + pgvector connection
            └── config.py       # Environment configuration
```

---

## 🛠️ Tech Stack

### Frontend
- **Flutter** + **Dart** — cross-platform UI framework
- **Riverpod** — state management
- **fl_chart** — chart visualisations
- **flutter_secure_storage** — secure local storage
- **http** — REST API communication

### Backend (Node.js)
- **Express 5** — REST API server
- **Drizzle ORM** — type-safe database queries
- **PostgreSQL** + **pgvector** — relational database with vector extension
- **JWT** + **bcrypt** — authentication & password hashing
- **TypeScript** — fully typed server code

### RAG Microservice (Python)
- **FastAPI** — async API framework
- **Google Gemini** (`google-generativeai`) — LLM for AI responses
- **LangChain** — document loading and text splitting
- **pypdf** — PDF ingestion for knowledge base
- **psycopg3** — PostgreSQL driver
- **pgvector** — semantic similarity search

### Database
- **PostgreSQL 16** with **pgvector** extension
- **[Neon](https://neon.tech)** — serverless Postgres for production

---

## 🚀 Getting Started

### Prerequisites

- [Flutter SDK](https://flutter.dev/docs/get-started/install) (Dart SDK ^3.12.2)
- [Node.js](https://nodejs.org/) (v18+) & npm
- [Python](https://www.python.org/) (3.10+)
- [Docker](https://www.docker.com/) & Docker Compose (recommended for local setup)

---

### 1. Clone the repository

```bash
git clone https://github.com/shreshthaa20/MindAnchor-Rag.git
cd MindAnchor-Rag/MindAnchor
```

---

### 2. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

```env
# Database
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_NAME=mindanchor
DB_PORT=5432

# Node.js Backend
PORT=5000
JWT_SECRET=replace_with_a_unique_64_byte_random_secret

# Google Gemini (for RAG service)
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

> **Production**: Use [Neon](https://neon.tech) as a managed serverless Postgres provider. Set `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `DB_SSLMODE=require` accordingly.

---

### 3. Run with Docker (Recommended)

The easiest way to run all three services together:

```bash
docker-compose up --build
```

This starts:
| Service | URL |
|---|---|
| Node.js Backend | `http://localhost:5000` |
| Python RAG Service | `http://localhost:8000` |
| PostgreSQL + pgvector | `localhost:5432` |

---

### 4. Run manually (without Docker)

#### Node.js Backend

```bash
cd backend
npm install
npx drizzle-kit push    # run DB migrations
npm run dev             # development (nodemon)
# npm start             # production
```

#### Python RAG Backend

```bash
cd rag_backend
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Flutter App

```bash
flutter pub get
flutter run
```

> **Tip:** Update the API base URLs in the Flutter app to point to your running backend services.

---

## 🔌 API Endpoints

### Node.js Backend (`http://localhost:5000`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT |
| `GET/POST` | `/api/moods` | Mood tracking |
| `GET/POST` | `/api/journals` | Journal entries |
| `GET` | `/api/dashboard` | Aggregated wellness stats |
| `POST` | `/api/chat` | Chat message proxy |
| `*` | `/api/rag/*` | RAG service proxy |

### Python RAG Service (`http://localhost:8000`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/knowledge` | Add a wellness knowledge document |
| `GET` | `/knowledge` | List knowledge documents |
| `GET` | `/search` | Semantic search |
| `POST` | `/answer` | RAG-powered Q&A |
| `POST` | `/wellness-guide` | Personalised wellness guidance |
| `POST` | `/chat` | AI chat completion (Gemini) |
| `POST` | `/embed` | Generate text embeddings |

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).

---

<p align="center">Built with ❤️ for mental wellness</p>

# ReviewGPT 🔍

> AI-Powered App Review Analytics with Semantic Search and RAG

A production-grade, full-stack application for analyzing iOS and Android app reviews using semantic search, RAG (Retrieval-Augmented Generation), and real-time analytics.

![Status](https://img.shields.io/badge/status-production--ready-green)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)
![CI](https://github.com/your-username/reviewgpt/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/your-username/reviewgpt/actions/workflows/deploy-production.yml/badge.svg)

## ✨ Features

### 📱 Multi-App Management
- Track unlimited iOS and Android apps
- Support for owned apps (App Store Connect API) and competitor apps (web scraping)
- Real-time sync with automatic scheduling
- Platform-specific analytics and insights

### 🧠 Semantic Search & RAG
- Vector embeddings powered by Google (`text-embedding-004`) or OpenAI (`text-embedding-3-small`)
- PostgreSQL with pgvector for efficient similarity search
- Context-aware AI responses using Gemini 1.5 Pro or GPT-4o
- Streaming responses for real-time interaction

### 💬 Intelligent Chat Interface
- Ask natural language questions about your reviews
- View retrieved review context with relevance scores
- Sentiment breakdown and key themes
- Sample queries to get started quickly

### 📊 Analytics Dashboard
- Real-time metrics: total reviews, average rating, sentiment analysis
- Interactive charts: rating distribution, reviews over time
- Recent reviews table with filtering
- Per-app detailed analytics

### ⚙️ Dynamic Configuration
- Firebase Remote Config for zero-downtime updates
- Switch AI models without redeployment
- Adjust RAG parameters on the fly
- Custom system prompts

### 🔄 Automated Sync
- Scheduled review collection via cron jobs
- Hybrid approach: official APIs + web scraping
- Configurable sync frequency and limits
- Error handling and retry logic

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 15+ with pgvector extension
- **Firebase** project ([create one](https://console.firebase.google.com))
- **Google AI API key** ([get here](https://aistudio.google.com/apikey))

### Installation

```bash
# 1. Clone repository
git clone https://github.com/your-username/reviewgpt.git
cd reviewgpt

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# 4. Set up database (Docker)
docker run -d \
  --name reviewgpt-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=reviewgpt \
  -p 5432:5432 \
  ankane/pgvector

# 5. Run database schema
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reviewgpt" \
  npx drizzle-kit push

# 6. Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) 🎉

---

## 📚 Documentation

- **[SETUP.md](SETUP.md)** - Complete local development setup
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment to Firebase
- **[CHAT_GUIDE.md](CHAT_GUIDE.md)** - Chat interface architecture and usage
- **[.env.example](.env.example)** - Environment variables reference

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 (App Router), TypeScript, React 19 |
| **Database** | PostgreSQL 15 + pgvector (Google Cloud SQL) |
| **Vector Search** | pgvector with HNSW indexing |
| **AI Models** | Gemini 1.5 Pro, GPT-4o (via Vercel AI SDK) |
| **Embeddings** | Google text-embedding-004, OpenAI text-embedding-3-small |
| **Config** | Firebase Remote Config |
| **Hosting** | Firebase App Hosting |
| **UI** | shadcn/ui, Tailwind CSS, Recharts |
| **Scrapers** | app-store-scraper, google-play-scraper |
| **ORM** | Drizzle ORM |

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│  1. Review Collection                                    │
│     - App Store Connect API (owned apps)                │
│     - Web Scraping (competitor apps)                    │
└─────────────┬───────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│  2. Embedding Generation                                 │
│     - Google text-embedding-004 (768-dim)               │
│     - OpenAI text-embedding-3-small (1536-dim)          │
└─────────────┬───────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│  3. Storage (PostgreSQL + pgvector)                      │
│     - Reviews with vector embeddings                    │
│     - HNSW index for fast similarity search             │
└─────────────┬───────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│  4. RAG Pipeline                                         │
│     - Query → Embedding → Vector Search                 │
│     - Retrieve top-k similar reviews                    │
│     - Build context + System prompt                     │
└─────────────┬───────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│  5. AI Response (Streaming)                              │
│     - Gemini 1.5 Pro or GPT-4o                          │
│     - Server-Sent Events (SSE)                          │
│     - Context-aware answers                             │
└─────────────────────────────────────────────────────────┘
```

### Project Structure

```
├── app/                      # Next.js App Router
│   ├── api/                 # API routes
│   │   ├── apps/           # App management CRUD
│   │   ├── reviews/        # Reviews query API
│   │   ├── chat/           # RAG chat with streaming
│   │   ├── analytics/      # Analytics aggregation
│   │   └── cron/           # Automated sync jobs
│   ├── apps/               # App management pages
│   ├── chat/               # Chat interface
│   └── page.tsx            # Dashboard
├── components/              # React components
│   ├── dashboard/          # Stats cards, charts
│   ├── apps/               # App management UI
│   ├── chat/               # Chat interface components
│   └── ui/                 # shadcn/ui components
├── lib/                     # Core business logic
│   ├── db/                 # Database client, schema, queries
│   ├── firebase/           # Remote Config client
│   ├── ai/                 # Embeddings, RAG, chat
│   ├── scrapers/           # Review collection
│   └── vector/             # Vector search
├── scripts/                 # Utility scripts
│   ├── test-scrapers.ts   # Test review scrapers
│   ├── test-embeddings.ts # Test embedding generation
│   ├── test-rag.ts        # Test RAG pipeline
│   └── test-chat.ts       # Test chat API
└── types/                   # TypeScript type definitions
```

---

## 🔧 Configuration

### Environment Variables

See [.env.example](.env.example) for all variables. Key ones:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/reviewgpt

# Firebase
FIREBASE_PROJECT_ID=your-app-reviews
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'

# AI APIs
GOOGLE_AI_API_KEY=AIza...
OPENAI_API_KEY=sk-...

# Cron
CRON_SECRET=your_random_secret
```

### Firebase Remote Config

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ai_model` | String | `gemini-1.5-pro` | AI model (gemini-1.5-pro, gpt-4o) |
| `embedding_provider` | String | `google` | Embedding provider (google, openai) |
| `rag_top_k` | Number | `10` | Reviews to retrieve for context |
| `rag_min_similarity` | Number | `0.7` | Similarity threshold (0-1) |
| `max_reviews_per_sync` | Number | `500` | Max reviews per sync |
| `rag_system_prompt` | String | Custom | AI system prompt |

---

## 📡 API Reference

### Apps Management

```bash
# List all apps
GET /api/apps

# Create app
POST /api/apps
Body: { name, platform, appId, country, ownedByMe }

# Get app details
GET /api/apps/[id]

# Update app
PATCH /api/apps/[id]
Body: { name?, status?, country? }

# Delete app
DELETE /api/apps/[id]

# Sync reviews
POST /api/apps/[id]/sync
```

### Reviews & Analytics

```bash
# Query reviews
GET /api/reviews?appId=1&platform=ios&rating=5&limit=10

# Get analytics
GET /api/analytics?appId=1&dateFrom=2024-01-01&dateTo=2024-12-31
```

### Chat (RAG)

```bash
# Chat with streaming
POST /api/chat
Body: {
  message: "What are users complaining about?",
  conversationHistory: [...],
  appId?: 1,
  platform?: "ios"
}

# Response format (SSE)
data: {"type":"metadata","data":{reviewCount,avgSimilarity,model,reviews,...}}
data: {"type":"text","data":"Based on"}
data: {"type":"text","data":" the reviews"}
data: {"type":"done"}
```

---

## 🧪 Testing

```bash
# Build verification
npm run build

# Test scripts
npm run test:scrapers    # Test review collection
npm run test:embeddings  # Test embedding generation
npm run test:rag         # Test RAG pipeline
npm run test:chat        # Test chat API (requires server)
```

---

## 🚢 Deployment

Deploy to Firebase App Hosting with Google Cloud SQL:

```bash
# 1. Set up Cloud SQL (see DEPLOYMENT.md)
gcloud sql instances create reviewgpt-db ...

# 2. Configure secrets
firebase apphosting:secrets:set DATABASE_URL
firebase apphosting:secrets:set GOOGLE_AI_API_KEY
firebase apphosting:secrets:set FIREBASE_SERVICE_ACCOUNT
firebase apphosting:secrets:set CRON_SECRET

# 3. Deploy
git push origin main  # Auto-deploys via GitHub integration
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete guide.

---

## 💰 Cost Estimation

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Cloud SQL (db-f1-micro) | Standard | ~$15 |
| Firebase App Hosting | Pay-as-you-go | ~$10-30 |
| Gemini 1.5 Pro | API | ~$10-50 |
| Total | | **$35-95** |

Scales with usage. Optimize with proper caching and indexing.

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

- **Firebase** - App Hosting and Remote Config
- **Google Cloud** - Cloud SQL and Vertex AI
- **Vercel** - AI SDK for streaming
- **shadcn/ui** - Beautiful UI components
- **pgvector** - Vector similarity search

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/reviewgpt/issues)
- **Docs**: See documentation files in repo
- **Email**: your-email@example.com

---

**Built with ❤️ by Your Name**

*Making app review analysis intelligent, fast, and insightful.*

# ReviewGPT Setup Guide

Quick start guide for local development and production setup.

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Production Deployment](#production-deployment)
3. [Configuration](#configuration)
4. [Testing](#testing)
5. [Common Issues](#common-issues)

---

## Local Development Setup

### 1. Prerequisites

```bash
# Required software
- Node.js 18+ and npm
- PostgreSQL 15+ with pgvector extension
- Git

# Optional
- Docker (for local PostgreSQL)
```

### 2. Clone and Install

```bash
# Clone repository
git clone https://github.com/your-username/reviewgpt.git
cd reviewgpt

# Install dependencies
npm install
```

### 3. Set Up Local Database

#### Option A: Using Docker

```bash
# Start PostgreSQL with pgvector
docker run -d \
  --name reviewgpt-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=reviewgpt \
  -p 5432:5432 \
  ankane/pgvector

# Verify
docker ps
```

#### Option B: Using Local PostgreSQL

```bash
# Install pgvector extension
# macOS
brew install pgvector

# Ubuntu/Debian
sudo apt-get install postgresql-15-pgvector

# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE reviewgpt;
\c reviewgpt

# Enable pgvector
CREATE EXTENSION vector;
```

### 4. Run Database Schema

```bash
# Create tables and indexes
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reviewgpt" \
  npx drizzle-kit push
```

### 5. Configure Environment Variables

```bash
# Copy example file
cp .env.example .env

# Edit .env with your values
nano .env
```

**Minimum required for local development:**

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reviewgpt

# Firebase (create project at https://console.firebase.google.com)
FIREBASE_PROJECT_ID=your-app-reviews

# AI API Key (get from https://aistudio.google.com/apikey)
GOOGLE_AI_API_KEY=AIza...

# Cron secret (generate: openssl rand -base64 32)
CRON_SECRET=your_random_secret

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 6. Set Up Firebase Remote Config (Optional for local)

```bash
# Login to Firebase
firebase login

# Initialize
firebase init

# Select Remote Config
```

**Add default parameters in Firebase Console:**

- `ai_model`: `gemini-1.5-pro`
- `embedding_provider`: `google`
- `rag_top_k`: `10`
- `max_reviews_per_sync`: `500`

### 7. Start Development Server

```bash
# Start Next.js dev server
npm run dev

# Open browser
open http://localhost:3000
```

### 8. Test the Application

```bash
# In another terminal, add a test app
curl -X POST http://localhost:3000/api/apps \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test App",
    "platform": "ios",
    "appId": "123456789",
    "country": "us",
    "ownedByMe": false
  }'

# Sync reviews for the app (ID from response)
curl -X POST http://localhost:3000/api/apps/1/sync

# Check analytics
curl http://localhost:3000/api/analytics
```

---

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete production deployment guide.

### Quick Deploy to Firebase App Hosting

```bash
# 1. Set up Google Cloud SQL (see DEPLOYMENT.md Step 1)

# 2. Configure Firebase secrets
firebase apphosting:secrets:set DATABASE_URL
firebase apphosting:secrets:set FIREBASE_SERVICE_ACCOUNT
firebase apphosting:secrets:set GOOGLE_AI_API_KEY
firebase apphosting:secrets:set CRON_SECRET

# 3. Push to GitHub (triggers auto-deploy)
git add .
git commit -m "Initial deployment"
git push origin main

# 4. Verify deployment
firebase apphosting:backends:list
```

---

## Configuration

### Firebase Remote Config Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ai_model` | String | `gemini-1.5-pro` | AI model for chat (gemini-1.5-pro, gpt-4o) |
| `embedding_provider` | String | `google` | Embedding provider (google, openai) |
| `rag_top_k` | Number | `10` | Reviews to retrieve for RAG |
| `rag_min_similarity` | Number | `0.7` | Minimum similarity threshold (0-1) |
| `max_reviews_per_sync` | Number | `500` | Max reviews per sync operation |
| `rag_system_prompt` | String | See below | System prompt for AI |

**Default System Prompt:**
```
You are ReviewGPT, an AI assistant specialized in analyzing app store reviews.
You help developers understand user feedback, identify issues, and discover
insights from review data. Be concise, specific, and cite relevant reviews
when making points.
```

### Environment Variables Priority

1. **Local Development**: `.env` file
2. **Production**: Firebase App Hosting secrets
3. **Fallback**: Default values in code

---

## Testing

### Unit Tests (Coming Soon)

```bash
npm run test
```

### API Tests

```bash
# Start dev server
npm run dev

# In another terminal, run test scripts
npm run test:scrapers   # Test review scrapers
npm run test:embeddings # Test embedding generation
npm run test:rag       # Test RAG pipeline
npm run test:chat      # Test chat API
```

### Manual Testing Checklist

**Dashboard**
- [ ] Stats cards show correct data
- [ ] Charts render properly
- [ ] Recent reviews table loads
- [ ] Empty state shows when no data

**Apps Management**
- [ ] Can add new app
- [ ] App cards display correctly
- [ ] Sync reviews works
- [ ] Can delete app
- [ ] App detail page loads

**Chat Interface**
- [ ] Can send message
- [ ] Response streams correctly
- [ ] Context sidebar shows reviews
- [ ] Sample queries work
- [ ] Markdown renders properly

**API Endpoints**
- [ ] GET /api/apps returns apps
- [ ] POST /api/apps creates app
- [ ] POST /api/apps/[id]/sync fetches reviews
- [ ] GET /api/reviews returns reviews with filters
- [ ] POST /api/chat returns streaming response
- [ ] GET /api/analytics returns aggregated data

---

## Common Issues

### Issue: Database Connection Failed

**Symptoms**: `ECONNREFUSED` or connection timeout errors

**Solutions**:
```bash
# Check if PostgreSQL is running
docker ps  # if using Docker
# OR
pg_isready  # if local install

# Verify connection string
psql "postgresql://postgres:postgres@localhost:5432/reviewgpt"

# Check pgvector extension
psql -d reviewgpt -c "\dx"
```

### Issue: API Key Invalid

**Symptoms**: `401 Unauthorized` from AI APIs

**Solutions**:
```bash
# Test Google AI key
curl "https://generativelanguage.googleapis.com/v1/models?key=YOUR_KEY"

# Test OpenAI key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_KEY"

# Regenerate keys if needed
```

### Issue: No Reviews Retrieved

**Symptoms**: Scrapers return 0 reviews

**Solutions**:
1. **Check App ID format**:
   - iOS: Numeric ID from App Store URL (e.g., `123456789`)
   - Android: Package name (e.g., `com.example.app`)

2. **Verify country code**: Use 2-letter lowercase (e.g., `us`, `gb`, `de`)

3. **Test scraper directly**:
   ```bash
   npm run test:scrapers
   ```

### Issue: Embeddings Not Generated

**Symptoms**: Reviews stored but `embedding IS NULL`

**Solutions**:
```bash
# Check if AI API key is set
echo $GOOGLE_AI_API_KEY

# Check Remote Config
firebase remoteconfig:get

# Test embedding generation
npm run test:embeddings
```

### Issue: Chat Not Streaming

**Symptoms**: Chat shows loading but no response

**Solutions**:
1. **Check browser console** for SSE errors
2. **Verify API endpoint**:
   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"test"}'
   ```
3. **Check if reviews have embeddings**:
   ```sql
   SELECT COUNT(*) FROM reviews WHERE embedding IS NOT NULL;
   ```

### Issue: Build Fails

**Symptoms**: TypeScript errors during build

**Solutions**:
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build

# Check for missing dependencies
npm ls

# Verify Node.js version
node --version  # Should be 18+
```

### Issue: Cron Job Not Running

**Symptoms**: Reviews not auto-syncing

**Solutions**:
```bash
# Test cron endpoint manually
curl -X POST http://localhost:3000/api/cron/sync-reviews \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Check Cloud Scheduler (production)
gcloud scheduler jobs list
gcloud scheduler jobs run reviewgpt-sync

# Verify CRON_SECRET is set correctly
```

---

## Development Workflow

### Adding a New Feature

1. **Create feature branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Implement feature** with proper types and error handling

3. **Test locally**
   ```bash
   npm run dev
   # Test in browser
   npm run build  # Verify build succeeds
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "Add new feature"
   git push origin feature/new-feature
   ```

5. **Create pull request** and test in staging

6. **Merge to main** (triggers production deploy)

### Database Migrations

```bash
# Make changes to schema.ts
nano lib/db/schema.ts

# Generate migration
npx drizzle-kit generate

# Apply migration
npx drizzle-kit push

# Or use direct SQL
psql -d reviewgpt -f migrations/001_add_new_column.sql
```

### Updating Remote Config

```bash
# Download current config
firebase remoteconfig:get -o remote-config.json

# Edit
nano remote-config.json

# Upload changes
firebase remoteconfig:set --file remote-config.json

# Publish
firebase remoteconfig:publish
```

---

## Performance Optimization

### Database Indexing

```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_reviews_app_platform
  ON reviews(app_id, platform);

CREATE INDEX CONCURRENTLY idx_reviews_rating_date
  ON reviews(rating, review_date DESC);

-- Vector search index (HNSW for speed)
CREATE INDEX CONCURRENTLY idx_reviews_embedding
  ON reviews USING hnsw (embedding vector_cosine_ops);
```

### Caching Strategy

- **Remote Config**: 10-minute TTL (built-in)
- **API responses**: Use Next.js caching where appropriate
- **Static assets**: CDN caching via Firebase Hosting

### Monitoring

```bash
# Watch logs in real-time
firebase apphosting:logs --tail

# Check Cloud SQL performance
gcloud sql operations list --instance=reviewgpt-db --limit=10

# Monitor costs
gcloud billing accounts list
```

---

## Security Best Practices

1. **Never commit secrets**
   - Use `.env` locally
   - Use Firebase secrets in production
   - Add `.env` to `.gitignore`

2. **Rotate API keys regularly**
   - Set expiration dates
   - Monitor usage

3. **Restrict database access**
   - Use strong passwords
   - Limit authorized networks
   - Enable SSL/TLS

4. **Validate all inputs**
   - Use Zod schemas
   - Sanitize user input
   - Rate limit APIs

5. **Monitor for anomalies**
   - Set up alerts
   - Check logs regularly
   - Review usage patterns

---

## Getting Help

- **Documentation**: Check [README.md](README.md), [DEPLOYMENT.md](DEPLOYMENT.md), [CHAT_GUIDE.md](CHAT_GUIDE.md)
- **Logs**: `firebase apphosting:logs` or check Firebase Console
- **GitHub Issues**: Report bugs and feature requests
- **Community**: Firebase and Next.js communities

---

## Next Steps

1. **Add your first app** via the UI
2. **Sync reviews** and verify they appear in dashboard
3. **Try the chat interface** with sample queries
4. **Configure Remote Config** with your preferred AI model
5. **Set up monitoring** and alerts
6. **Deploy to production** when ready

Happy analyzing! 🚀

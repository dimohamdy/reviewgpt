# ReviewGPT Deployment Guide

Complete guide for deploying ReviewGPT to Firebase App Hosting with Google Cloud SQL.

## Prerequisites

- Firebase project: `your-app-reviews`
- Google Cloud account with billing enabled
- Node.js 18+ and npm installed
- Firebase CLI installed: `npm install -g firebase-tools`
- Git repository (for App Hosting)
- GitHub account (for CI/CD)

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│           Firebase App Hosting                   │
│         (Next.js 15 Application)                 │
│  - Dashboard UI                                  │
│  - Chat Interface                                │
│  - API Routes                                    │
└────────────┬────────────────────────────────────┘
             │
             ├──────────> Google Cloud SQL
             │            (PostgreSQL + pgvector)
             │
             ├──────────> Firebase Remote Config
             │            (AI Model Selection)
             │
             ├──────────> Vertex AI (Gemini)
             │
             └──────────> OpenAI API (GPT-4o)
```

---

## Step 1: Set Up Google Cloud SQL (PostgreSQL)

### 1.1 Create PostgreSQL Instance

```bash
# Set project
gcloud config set project your-app-reviews

# Create Cloud SQL instance
gcloud sql instances create reviewgpt-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=YOUR_SECURE_PASSWORD \
  --database-flags=cloudsql.iam_authentication=on
```

### 1.2 Create Database and User

```bash
# Connect to instance
gcloud sql connect reviewgpt-db --user=postgres

# Inside psql:
CREATE DATABASE reviewgpt;
CREATE USER reviewgpt_user WITH PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE reviewgpt TO reviewgpt_user;

# Connect to reviewgpt database
\c reviewgpt

# Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify
\dx
```

### 1.3 Get Connection Details

```bash
# Get instance connection name
gcloud sql instances describe reviewgpt-db \
  --format="value(connectionName)"

# Output: your-app-reviews:us-central1:reviewgpt-db
```

### 1.4 Run Database Schema

```bash
# Download Cloud SQL Proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy

# Start proxy in background
./cloud-sql-proxy your-app-reviews:us-central1:reviewgpt-db &

# Run schema migration
DATABASE_URL="postgresql://reviewgpt_user:YOUR_PASSWORD@localhost:5432/reviewgpt" \
  npx drizzle-kit push
```

---

## Step 2: Set Up Firebase

### 2.1 Initialize Firebase

```bash
# Login to Firebase
firebase login

# Initialize project (if not done)
firebase init

# Select:
# - Hosting
# - Project: your-app-reviews
```

### 2.2 Configure Remote Config

1. Go to Firebase Console: https://console.firebase.google.com/project/your-app-reviews
2. Navigate to **Remote Config**
3. Add the following parameters:

| Parameter | Default Value | Description |
|-----------|---------------|-------------|
| `ai_model` | `gemini-1.5-pro` | AI model (gemini-1.5-pro or gpt-4o) |
| `embedding_provider` | `google` | Embedding provider (google or openai) |
| `rag_top_k` | `10` | Number of reviews to retrieve |
| `rag_min_similarity` | `0.7` | Minimum similarity threshold |
| `max_reviews_per_sync` | `500` | Max reviews per sync operation |
| `rag_system_prompt` | `You are ReviewGPT...` | System prompt for RAG |

### 2.3 Create Service Account

1. Go to **Project Settings > Service Accounts**
2. Click **Generate new private key**
3. Save the JSON file securely
4. Copy the content for `FIREBASE_SERVICE_ACCOUNT` env var

---

## Step 3: Get API Keys

### 3.1 Google AI API Key (Gemini)

1. Visit https://aistudio.google.com/apikey
2. Click **Create API Key**
3. Select project: `your-app-reviews`
4. Copy the API key

### 3.2 OpenAI API Key (GPT-4o)

1. Visit https://platform.openai.com/api-keys
2. Click **Create new secret key**
3. Copy the key immediately (shown only once)

### 3.3 App Store Connect API (Optional, for owned apps)

1. Visit https://appstoreconnect.apple.com/access/integrations/api
2. Click **Generate API Key**
3. Download the `.p8` file
4. Save **Key ID** and **Issuer ID**

---

## Step 4: Set Up CI/CD with GitHub Actions

### 4.1 Push Code to GitHub

```bash
# Initialize git (if not done)
git init
git add .
git commit -m "Initial commit"

# Add GitHub remote
git remote add origin https://github.com/your-username/reviewgpt.git
git branch -M main
git push -u origin main
```

### 4.2 Configure GitHub Secrets

**Option 1: Using the setup script (recommended)**

```bash
# Run the interactive setup script
./scripts/setup-github-actions.sh
```

**Option 2: Manual setup via GitHub CLI**

```bash
# Install GitHub CLI: https://cli.github.com/
gh auth login

# Set secrets
gh secret set DATABASE_URL
gh secret set FIREBASE_PROJECT_ID
gh secret set FIREBASE_SERVICE_ACCOUNT < service-account.json
gh secret set GOOGLE_AI_API_KEY
gh secret set OPENAI_API_KEY
gh secret set CRON_SECRET
```

**Option 3: Via GitHub Web UI**

1. Go to **Settings > Secrets and variables > Actions**
2. Click **New repository secret**
3. Add each secret (see `.github/GITHUB_ACTIONS.md` for full list)

### 4.3 Enable GitHub Actions

1. Go to **Actions** tab in your repository
2. Enable workflows if prompted
3. Workflows will run automatically on:
   - **Pull requests** → CI + Preview deployment
   - **Push to main** → Production deployment

### 4.4 Test CI/CD Pipeline

```bash
# Create a test branch
git checkout -b test-ci-cd

# Make a small change
echo "# Test" >> TEST.md
git add TEST.md
git commit -m "Test CI/CD"

# Push and create PR
git push origin test-ci-cd
gh pr create --title "Test CI/CD" --body "Testing automated deployment"

# Watch the workflow
gh run watch

# After CI passes, merge to trigger production deployment
gh pr merge --squash
```

**See [.github/GITHUB_ACTIONS.md](.github/GITHUB_ACTIONS.md) for complete CI/CD documentation.**

---

## Step 5: Deploy to Firebase App Hosting (Manual)

### 4.1 Set Environment Variables

```bash
# Set database URL
firebase apphosting:secrets:set DATABASE_URL

# Set Firebase service account
firebase apphosting:secrets:set FIREBASE_SERVICE_ACCOUNT

# Set AI API keys
firebase apphosting:secrets:set GOOGLE_AI_API_KEY
firebase apphosting:secrets:set OPENAI_API_KEY

# Set App Store Connect credentials (optional)
firebase apphosting:secrets:set APP_STORE_CONNECT_KEY_ID
firebase apphosting:secrets:set APP_STORE_CONNECT_ISSUER_ID
firebase apphosting:secrets:set APP_STORE_CONNECT_PRIVATE_KEY

# Set cron secret (generate: openssl rand -base64 32)
firebase apphosting:secrets:set CRON_SECRET
```

### 4.2 Connect GitHub Repository

1. Push code to GitHub
2. Go to Firebase Console > **App Hosting**
3. Click **Get Started**
4. Select **GitHub** and authorize
5. Choose your repository
6. Configure build settings:
   - **Root directory**: `/`
   - **Build command**: `npm run build`
   - **Output directory**: `.next`

### 4.3 Deploy

```bash
# Deploy via Firebase CLI
firebase deploy --only hosting

# Or use GitHub integration (auto-deploy on push to main)
git push origin main
```

### 4.4 Verify Deployment

1. Visit your site: `https://your-app-reviews.web.app`
2. Check logs: `firebase apphosting:logs`
3. Test API: `curl https://your-app-reviews.web.app/api/apps`

---

## Step 5: Set Up Automated Sync (Cron)

### 5.1 Using Google Cloud Scheduler

```bash
# Create cron job
gcloud scheduler jobs create http reviewgpt-sync \
  --schedule="0 */6 * * *" \
  --uri="https://your-app-reviews.web.app/api/cron/sync-reviews" \
  --http-method=POST \
  --headers="Authorization=Bearer YOUR_CRON_SECRET" \
  --location=us-central1

# Verify
gcloud scheduler jobs list
```

### 5.2 Alternative: Vercel Cron (if using Vercel)

Already configured in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/sync-reviews",
    "schedule": "0 */6 * * *"
  }]
}
```

---

## Step 6: Configure Cloud SQL Connection

### 6.1 Set Database URL Format

For Firebase App Hosting, use Cloud SQL Unix socket:

```bash
DATABASE_URL=postgresql://reviewgpt_user:PASSWORD@/reviewgpt?host=/cloudsql/your-app-reviews:us-central1:reviewgpt-db
```

### 6.2 Grant App Hosting Access

```bash
# Get App Hosting service account
# Format: firebase-adminsdk-xxxxx@your-app-reviews.iam.gserviceaccount.com

# Grant Cloud SQL Client role
gcloud projects add-iam-policy-binding your-app-reviews \
  --member="serviceAccount:firebase-adminsdk-xxxxx@your-app-reviews.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

---

## Step 7: Production Checklist

### Security

- [ ] Environment variables set via secrets (not hardcoded)
- [ ] Database password is strong and unique
- [ ] CRON_SECRET is randomly generated
- [ ] Service account JSON is secure
- [ ] API keys have usage limits configured
- [ ] Cloud SQL has authorized networks configured
- [ ] Firebase security rules configured (if using other Firebase services)

### Performance

- [ ] Database has indexes created:
  ```sql
  CREATE INDEX idx_reviews_app_id ON reviews(app_id);
  CREATE INDEX idx_reviews_platform ON reviews(platform);
  CREATE INDEX idx_reviews_rating ON reviews(rating);
  CREATE INDEX idx_reviews_date ON reviews(review_date DESC);
  CREATE INDEX idx_reviews_embedding ON reviews USING hnsw (embedding vector_cosine_ops);
  ```
- [ ] App Hosting configured with appropriate instance size
- [ ] Caching enabled for static assets
- [ ] Firebase Remote Config cached (10-min TTL)

### Monitoring

- [ ] Cloud Logging enabled
- [ ] Error reporting configured
- [ ] Uptime checks set up
- [ ] Budget alerts configured

### Testing

- [ ] All API endpoints working
- [ ] Database connection successful
- [ ] RAG chat responding correctly
- [ ] Scrapers fetching reviews
- [ ] Cron job executing
- [ ] Analytics dashboard loading

---

## Troubleshooting

### Database Connection Errors

**Error**: `ECONNREFUSED` or `Connection timeout`

**Solution**:
1. Verify Cloud SQL instance is running
2. Check connection string format
3. Ensure service account has `roles/cloudsql.client`
4. Test with Cloud SQL Proxy locally

### Firebase Remote Config Not Loading

**Error**: `Firebase credentials not configured`

**Solution**:
1. Verify `FIREBASE_SERVICE_ACCOUNT` is set
2. Check JSON format is valid
3. Ensure service account has Remote Config permissions
4. Check Firebase project ID matches

### Cron Job Not Running

**Error**: `401 Unauthorized`

**Solution**:
1. Verify `CRON_SECRET` matches in both places
2. Check Authorization header format: `Bearer YOUR_SECRET`
3. Test manually:
   ```bash
   curl -X POST https://your-app-reviews.web.app/api/cron/sync-reviews \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

### Embedding Generation Failing

**Error**: `API key invalid`

**Solution**:
1. Verify API keys are correct
2. Check API quotas/limits
3. Test keys independently:
   ```bash
   curl https://generativelanguage.googleapis.com/v1/models?key=YOUR_KEY
   ```

### Build Failures

**Error**: TypeScript errors

**Solution**:
1. Run `npm run build` locally first
2. Ensure all dependencies installed
3. Check Node.js version (18+)

---

## Cost Estimation

### Google Cloud SQL
- **db-f1-micro**: ~$15/month (suitable for testing)
- **db-g1-small**: ~$25/month (small production)
- **db-n1-standard-1**: ~$50/month (medium production)

### Firebase App Hosting
- **Free tier**: 1GB storage, 10GB bandwidth
- **Paid**: ~$0.026/GB storage, ~$0.15/GB bandwidth
- **Compute**: Pay per instance hour (scale to zero)

### AI API Costs
- **Gemini 1.5 Pro**: $3.50 per 1M tokens
- **GPT-4o**: $5 per 1M tokens
- **Embeddings (Google)**: $0.025 per 1M tokens
- **Embeddings (OpenAI)**: $0.13 per 1M tokens

**Estimated Monthly**: $50-150 for small-medium apps with <100k reviews

---

## Maintenance

### Regular Tasks

- **Weekly**: Check error logs and monitoring
- **Monthly**: Review API usage and costs
- **Quarterly**: Update dependencies
- **As needed**: Adjust Remote Config parameters

### Scaling Considerations

- **>100k reviews**: Increase Cloud SQL instance size
- **High traffic**: Adjust App Hosting min/max instances
- **Slow queries**: Add more indexes
- **Large embeddings**: Consider dimensionality reduction

---

## Support

- **Firebase docs**: https://firebase.google.com/docs/app-hosting
- **Cloud SQL docs**: https://cloud.google.com/sql/docs
- **Vertex AI docs**: https://cloud.google.com/vertex-ai/docs

For issues, check logs:
```bash
# Firebase App Hosting logs
firebase apphosting:logs --project=your-app-reviews

# Cloud SQL logs
gcloud sql operations list --instance=reviewgpt-db
```

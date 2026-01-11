# ReviewGPT Setup Guide

This guide walks you through setting up ReviewGPT from scratch, including Google Cloud SQL, Firebase, and App Store Connect API.

## Prerequisites

- Google Cloud Platform account
- Firebase account
- Node.js 18+ installed
- (Optional) Apple Developer account for App Store Connect API

---

## 1. Google Cloud SQL Setup

### Create PostgreSQL Instance

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **SQL** → **Create Instance** → **PostgreSQL**
3. Configure your instance:
   - **Instance ID**: `reviewgpt-db` (or your choice)
   - **Password**: Set a strong password for the `postgres` user
   - **Database version**: PostgreSQL 15 (or latest)
   - **Region**: Choose closest to your users
   - **Machine type**: Start with `db-f1-micro` for development
   - **Storage**: 10 GB SSD (auto-increase enabled)
4. Click **Create Instance** (takes 5-10 minutes)

### Enable Cloud SQL Admin API

1. Go to **APIs & Services** → **Library**
2. Search for "Cloud SQL Admin API"
3. Click **Enable**

### Create Database

1. In Cloud SQL instances, click your instance
2. Go to **Databases** tab
3. Click **Create Database**
4. Name: `reviewgpt`
5. Click **Create**

### Enable pgvector Extension

1. Connect to your database using Cloud Shell:
   ```bash
   gcloud sql connect reviewgpt-db --user=postgres
   ```

2. Enter your password when prompted

3. Connect to the reviewgpt database:
   ```sql
   \c reviewgpt
   ```

4. Enable pgvector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

5. Verify installation:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```

### Run Migrations

1. Copy the migration file to Cloud Shell or run locally with Cloud SQL Proxy
2. Execute the migration:
   ```bash
   psql -h /cloudsql/PROJECT_ID:REGION:reviewgpt-db \
        -U postgres \
        -d reviewgpt \
        -f lib/db/migrations.sql
   ```

---

## 2. Firebase Setup

### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project**
3. Enter project name: `reviewgpt`
4. Disable Google Analytics (optional for this project)
5. Click **Create Project**

### Enable Firebase App Hosting

1. In Firebase Console, go to **Build** → **App Hosting**
2. Click **Get Started**
3. Follow the setup wizard
4. Note: We'll configure deployment later

### Set Up Remote Config

1. Go to **Build** → **Remote Config**
2. Click **Create Configuration**
3. Add the following parameters:

   | Parameter Key | Default Value | Type |
   |--------------|---------------|------|
   | `agent_system_instructions` | See below | String |
   | `preferred_model` | `gemini-1.5-pro` | String |
   | `embedding_provider` | `google` | String |
   | `max_context_reviews` | `10` | Number |
   | `sync_interval_hours` | `24` | Number |
   | `max_reviews_per_sync` | `100` | Number |

4. For `agent_system_instructions`, use:
   ```
   You are ReviewGPT, a senior product manager AI assistant specializing in app review analysis. Analyze the provided app reviews and extract actionable insights. Focus on identifying: Technical bugs, UX problems, Feature requests, and Sentiment trends. Be concise, data-driven, and provide bulleted summaries.
   ```

5. Click **Publish Changes**

### Generate Service Account Key

1. Go to **Project Settings** (gear icon) → **Service Accounts**
2. Click **Generate New Private Key**
3. Download the JSON file
4. **IMPORTANT**: Keep this file secure, never commit to git
5. Save it as `service-account-key.json` in a secure location

---

## 3. App Store Connect API Setup (Optional - for owned apps)

### Prerequisites

- Apple Developer account ($99/year)
- Admin or App Manager role

### Generate API Key

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to **Users and Access** → **Keys**
3. Click the **+** button to create a new key
4. Configure:
   - **Name**: `ReviewGPT API Key`
   - **Access**: Select **Customer Support** (minimum required for reading reviews)
5. Click **Generate**
6. **IMPORTANT**: Download the `.p8` private key file immediately
   - You can only download it once
   - Save as `AuthKey_XXXXXXXXXX.p8`
7. Note the **Key ID** (e.g., `ABC123XYZ`)
8. Note the **Issuer ID** (found at the top of the Keys page)

---

## 4. Google AI (Vertex AI) Setup

### Enable Vertex AI API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Library**
3. Search for "Vertex AI API"
4. Click **Enable**

### Get API Key (for Gemini)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **Create API Key**
3. Select your Google Cloud project
4. Copy the API key

---

## 5. OpenAI API Setup (Optional)

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to **API Keys**
3. Click **Create New Secret Key**
4. Name it `ReviewGPT`
5. Copy the key (starts with `sk-`)
6. **IMPORTANT**: Save it immediately, you won't see it again

---

## 6. Local Development Setup

### Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your actual values:

   ```env
   # Database
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/reviewgpt

   # Firebase
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
   FIREBASE_PROJECT_ID=your-firebase-project-id

   # App Store Connect (if using)
   ASC_KEY_ID=ABC123XYZ
   ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ASC_PRIVATE_KEY_PATH=/path/to/AuthKey_ABC123XYZ.p8

   # AI APIs
   GOOGLE_AI_API_KEY=AIza...
   OPENAI_API_KEY=sk-...

   # Cron
   CRON_SECRET=generate-a-random-secret-here
   ```

3. Generate a random cron secret:
   ```bash
   openssl rand -base64 32
   ```

### Install Dependencies

```bash
npm install
```

### Test Database Connection

Create a test script `scripts/test-connection.ts`:

```typescript
import { testConnection } from "@/lib/db/client";

async function main() {
  const success = await testConnection();
  process.exit(success ? 0 : 1);
}

main();
```

Run:
```bash
npx tsx scripts/test-connection.ts
```

### Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 7. Cloud SQL Proxy (For Local Development)

If you want to connect to Cloud SQL from your local machine:

### Install Cloud SQL Proxy

```bash
# macOS
brew install cloud-sql-proxy

# Linux
wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy
chmod +x cloud_sql_proxy
```

### Start Proxy

```bash
cloud_sql_proxy --credentials-file=/path/to/service-account-key.json \
  PROJECT_ID:REGION:reviewgpt-db
```

### Update DATABASE_URL

```env
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/reviewgpt
```

---

## 8. Verify Setup

### Checklist

- [ ] PostgreSQL instance running on Cloud SQL
- [ ] `reviewgpt` database created
- [ ] pgvector extension enabled
- [ ] Tables created (apps, reviews)
- [ ] Firebase project created
- [ ] Remote Config parameters set
- [ ] Service account key downloaded
- [ ] API keys configured (Google AI, OpenAI)
- [ ] `.env.local` file configured
- [ ] Next.js dev server starts successfully

### Test Commands

```bash
# Build project
npm run build

# Run type checking
npx tsc --noEmit

# Test database connection
npx tsx scripts/test-connection.ts
```

---

## Troubleshooting

### Cannot connect to Cloud SQL

- **Issue**: Connection timeout
- **Solution**: Ensure Cloud SQL Admin API is enabled and your service account has the necessary permissions

### pgvector extension not found

- **Issue**: `ERROR: type "vector" does not exist`
- **Solution**: Run `CREATE EXTENSION vector;` as the postgres user

### Firebase Admin initialization fails

- **Issue**: `Error: Could not load the default credentials`
- **Solution**: Check that `GOOGLE_APPLICATION_CREDENTIALS` path is correct and file exists

### Next.js build fails

- **Issue**: TypeScript errors
- **Solution**: Run `npm install` and ensure all dependencies are installed

---

## Next Steps

Once setup is complete, proceed to:
1. **Stage 2**: Implement scrapers and embedding generation
2. Test scraping with a sample app
3. Build the API endpoints
4. Create the UI components

See [../README.md](../README.md) for development workflow.

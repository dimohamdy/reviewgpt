# 🚀 ReviewGPT Deployment Checklist

Quick checklist to get ReviewGPT deployed and running.

## ✅ Pre-Deployment Checklist

### 1. GitHub Repository
- [ ] Create GitHub repository: `reviewgpt`
- [ ] Push code: `git push -u origin main`
- [ ] Verify all files are pushed

### 2. Firebase Project
- [ ] Firebase project created: `your-app-reviews`
- [ ] Billing enabled (required for Firebase Hosting)
- [ ] Firebase CLI installed: `npm install -g firebase-tools`
- [ ] Logged in: `firebase login`

### 3. Google Cloud SQL
- [ ] PostgreSQL instance created
- [ ] Database `reviewgpt` created
- [ ] User created with password
- [ ] pgvector extension enabled
- [ ] Connection string ready

### 4. API Keys
- [ ] Google AI API key obtained
- [ ] OpenAI API key obtained (optional)
- [ ] App Store Connect credentials (optional, for owned apps)
- [ ] CRON_SECRET generated: `openssl rand -base64 32`

### 5. Firebase Service Account
- [ ] Service account JSON downloaded
- [ ] JSON content ready to paste

---

## 🔐 GitHub Secrets Configuration

Go to: **Repository Settings > Secrets and variables > Actions > New repository secret**

Add these secrets:

```
✅ DATABASE_URL
   Example: postgresql://user:pass@host:5432/reviewgpt?sslmode=require

✅ FIREBASE_PROJECT_ID
   Value: your-app-reviews

✅ FIREBASE_SERVICE_ACCOUNT
   Paste entire JSON: {"type":"service_account",...}

✅ GOOGLE_AI_API_KEY
   Get from: https://aistudio.google.com/apikey

✅ CRON_SECRET
   Generate: openssl rand -base64 32

⚪ OPENAI_API_KEY (Optional)
   Get from: https://platform.openai.com/api-keys

⚪ APP_STORE_CONNECT_KEY_ID (Optional)
⚪ APP_STORE_CONNECT_ISSUER_ID (Optional)
⚪ APP_STORE_CONNECT_PRIVATE_KEY (Optional)
```

---

## 🏗️ Quick Start Commands

### Step 1: Create GitHub Repo and Push

```bash
# If you have GitHub CLI installed:
gh auth login
gh repo create reviewgpt --public --source=. --remote=origin
git push -u origin main

# Or manually:
# 1. Go to https://github.com/new
# 2. Create repo named "reviewgpt"
# 3. Run:
git remote add origin https://github.com/YOUR_USERNAME/reviewgpt.git
git push -u origin main
```

### Step 2: Configure Secrets

```bash
# Option A: Interactive script (requires GitHub CLI)
./scripts/setup-github-actions.sh

# Option B: Manual via GitHub CLI
gh secret set DATABASE_URL
gh secret set FIREBASE_PROJECT_ID
gh secret set FIREBASE_SERVICE_ACCOUNT < service-account.json
gh secret set GOOGLE_AI_API_KEY
gh secret set CRON_SECRET

# Option C: Via GitHub web UI (see above)
```

### Step 3: Enable GitHub Actions

1. Go to repository **Actions** tab
2. Click "I understand my workflows, go ahead and enable them"

### Step 4: Set Up Cloud SQL

```bash
# Create instance
gcloud sql instances create reviewgpt-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create reviewgpt --instance=reviewgpt-db

# Get connection info
gcloud sql instances describe reviewgpt-db
```

### Step 5: Configure Firebase Remote Config

1. Go to Firebase Console > Remote Config
2. Add parameters:
   - `ai_model`: `gemini-1.5-pro`
   - `embedding_provider`: `google`
   - `rag_top_k`: `10`
   - `rag_min_similarity`: `0.7`
   - `max_reviews_per_sync`: `500`
3. Publish changes

### Step 6: Test Deployment

```bash
# Create test PR
git checkout -b test-deployment
echo "# Test" >> TEST.md
git add TEST.md
git commit -m "Test deployment"
git push origin test-deployment

# Create PR (triggers CI + Preview)
gh pr create --title "Test deployment" --body "Testing CI/CD pipeline"

# Watch workflow
gh run watch

# Merge to deploy to production
gh pr merge --squash
```

---

## 🎯 Verification Steps

After deployment completes:

### 1. Check GitHub Actions
- [ ] Go to **Actions** tab
- [ ] Verify workflow ran successfully (green checkmark)
- [ ] Check deployment logs

### 2. Verify Firebase Deployment
- [ ] Visit: `https://your-app-reviews.web.app`
- [ ] Homepage loads
- [ ] Navigation works
- [ ] No console errors

### 3. Test API Endpoints
```bash
# Test apps endpoint
curl https://your-app-reviews.web.app/api/apps

# Test analytics
curl https://your-app-reviews.web.app/api/analytics
```

### 4. Check Firebase Console
- [ ] Go to Firebase Console > Hosting
- [ ] Verify deployment is live
- [ ] Check deployment logs

### 5. Database Connection
- [ ] App can connect to Cloud SQL
- [ ] Tables are created
- [ ] pgvector extension is working

---

## 🔧 Post-Deployment Configuration

### 1. Add Your First App

Via API:
```bash
curl -X POST https://your-app-reviews.web.app/api/apps \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test App",
    "platform": "ios",
    "appId": "123456789",
    "country": "us",
    "ownedByMe": false
  }'
```

Or via UI:
1. Visit https://your-app-reviews.web.app/apps
2. Click "Add App"
3. Fill in details
4. Click "Sync Reviews"

### 2. Set Up Cron Job

```bash
# Using Google Cloud Scheduler
gcloud scheduler jobs create http reviewgpt-sync \
  --schedule="0 */6 * * *" \
  --uri="https://your-app-reviews.web.app/api/cron/sync-reviews" \
  --http-method=POST \
  --headers="Authorization=Bearer YOUR_CRON_SECRET" \
  --location=us-central1
```

### 3. Configure Monitoring

- [ ] Set up Firebase Performance Monitoring
- [ ] Enable Cloud Logging
- [ ] Set up uptime checks
- [ ] Configure billing alerts

---

## 🆘 Troubleshooting

### Build Fails
```bash
# Check logs
gh run view --log-failed

# Run locally
npm run build

# Check for missing env vars
cat .env.example
```

### Deployment Fails
```bash
# Check Firebase logs
firebase hosting:channel:logs

# Verify secrets
gh secret list

# Re-run deployment
gh run rerun
```

### Database Connection Issues
```bash
# Test connection locally
psql "postgresql://user:pass@host:5432/reviewgpt"

# Check Cloud SQL status
gcloud sql instances describe reviewgpt-db

# Verify pgvector
psql -d reviewgpt -c "\dx"
```

### API Errors
```bash
# Check API health
curl https://your-app-reviews.web.app/api/apps

# View logs in Firebase Console
# Console > Functions > Logs

# Check Remote Config
firebase remoteconfig:get
```

---

## 📊 Success Metrics

Your deployment is successful when:

✅ GitHub Actions workflows are green
✅ Homepage loads at `https://your-app-reviews.web.app`
✅ API endpoints return valid responses
✅ Database connection works
✅ You can add and sync apps
✅ Chat interface responds
✅ Analytics dashboard shows data

---

## 📚 Documentation Links

- **Main README**: [README.md](README.md)
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Setup Guide**: [SETUP.md](SETUP.md)
- **CI/CD Guide**: [.github/GITHUB_ACTIONS.md](.github/GITHUB_ACTIONS.md)
- **Chat Guide**: [CHAT_GUIDE.md](CHAT_GUIDE.md)

---

## 🎉 You're Done!

Once all checkboxes are complete, your ReviewGPT application is:

✅ **Deployed** to Firebase App Hosting
✅ **Automated** with CI/CD pipeline
✅ **Monitored** and production-ready
✅ **Scalable** and cost-optimized

**Next steps:**
1. Add your apps via the UI
2. Sync reviews and test RAG chat
3. Configure Remote Config parameters
4. Set up custom domain (optional)
5. Share with your team! 🚀

---

**Need help?** Check the troubleshooting section or review the full documentation.

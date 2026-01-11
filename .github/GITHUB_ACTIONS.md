# GitHub Actions CI/CD

Automated CI/CD pipelines for ReviewGPT using GitHub Actions and Firebase App Hosting.

## Overview

Three workflows handle different deployment scenarios:

1. **CI** (`ci.yml`) - Continuous Integration on PRs and develop branch
2. **Deploy Production** (`deploy-production.yml`) - Production deployment on main branch
3. **Deploy Preview** (`deploy-preview.yml`) - Preview environments for PRs

## Workflows

### 1. CI - Build and Test (`ci.yml`)

**Triggers:**
- Pull requests to `main` or `develop`
- Pushes to `develop` branch

**What it does:**
- ✅ Runs on multiple Node.js versions (18.x, 20.x)
- ✅ Installs dependencies
- ✅ Runs ESLint
- ✅ Type checks with TypeScript
- ✅ Builds the application
- ✅ Security scan with npm audit
- ✅ Checks for leaked secrets with TruffleHog
- ✅ Uploads build artifacts

**Status badges:**
```markdown
![CI](https://github.com/your-username/reviewgpt/actions/workflows/ci.yml/badge.svg)
```

### 2. Deploy Production (`deploy-production.yml`)

**Triggers:**
- Push to `main` branch
- Manual trigger via workflow_dispatch

**What it does:**
- ✅ Builds with production environment variables
- ✅ Deploys to Firebase App Hosting (live channel)
- ✅ Runs post-deployment health checks
- ✅ Verifies API endpoints are responding
- ✅ Checks homepage accessibility

**Deployment URL:** `https://your-app-reviews.web.app`

**Status badges:**
```markdown
![Deploy](https://github.com/your-username/reviewgpt/actions/workflows/deploy-production.yml/badge.svg)
```

### 3. Deploy Preview (`deploy-preview.yml`)

**Triggers:**
- Pull requests to `main` branch

**What it does:**
- ✅ Creates temporary preview environment
- ✅ Posts preview URL as PR comment
- ✅ Preview expires after 7 days
- ✅ Allows testing before merging

**Preview URL:** Unique URL per PR (e.g., `https://your-app-reviews--pr-123-xyz.web.app`)

---

## Setup Instructions

### 1. Add GitHub Secrets

Go to **Settings > Secrets and variables > Actions** and add:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | `your-app-reviews` |
| `FIREBASE_SERVICE_ACCOUNT` | Service account JSON | `{"type":"service_account",...}` |
| `GOOGLE_AI_API_KEY` | Google AI API key | `AIza...` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `CRON_SECRET` | Cron authentication secret | `random_secret_string` |
| `APP_STORE_CONNECT_KEY_ID` | (Optional) ASC Key ID | `ABC123XYZ` |
| `APP_STORE_CONNECT_ISSUER_ID` | (Optional) ASC Issuer ID | `uuid...` |
| `APP_STORE_CONNECT_PRIVATE_KEY` | (Optional) ASC Private Key | `-----BEGIN...` |

**To add secrets:**
```bash
# Using GitHub CLI
gh secret set DATABASE_URL
gh secret set FIREBASE_PROJECT_ID
gh secret set FIREBASE_SERVICE_ACCOUNT < service-account.json
gh secret set GOOGLE_AI_API_KEY
gh secret set OPENAI_API_KEY
gh secret set CRON_SECRET
```

### 2. Configure Firebase

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase:**
   ```bash
   firebase login
   ```

3. **Initialize Hosting:**
   ```bash
   firebase init hosting
   ```

4. **Get Service Account:**
   ```bash
   # Go to Firebase Console > Project Settings > Service Accounts
   # Click "Generate new private key"
   # Copy JSON content to FIREBASE_SERVICE_ACCOUNT secret
   ```

### 3. Enable GitHub Actions

1. Go to **Settings > Actions > General**
2. Under "Workflow permissions", select:
   - ✅ Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests

### 4. Create Environment (Optional)

For production deployment protection:

1. Go to **Settings > Environments**
2. Click **New environment**
3. Name: `production`
4. Add protection rules:
   - ✅ Required reviewers
   - ✅ Wait timer (e.g., 5 minutes)
   - ✅ Deployment branches: `main` only

---

## Usage

### Continuous Integration

**Automatically runs on:**
- Every pull request
- Every push to `develop`

**Example:**
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push to GitHub (triggers CI)
git push origin feature/new-feature

# Create PR (triggers CI + Preview deployment)
gh pr create --title "Add new feature"
```

### Deploy to Production

**Automatic deployment:**
```bash
# Merge PR to main (triggers production deployment)
git checkout main
git pull origin main
```

**Manual deployment:**
```bash
# Trigger via GitHub CLI
gh workflow run deploy-production.yml

# Or via GitHub UI:
# Actions > Deploy to Production > Run workflow
```

### Preview Deployments

**Automatic on PRs:**
1. Create pull request to `main`
2. GitHub Actions builds and deploys preview
3. Preview URL posted as PR comment
4. Test changes in preview environment
5. Merge when ready (deploys to production)

**Example PR comment:**
```markdown
### 🚀 Preview Deployment

Your preview environment is ready!

**Preview URL:** https://your-app-reviews--pr-42-abc123.web.app

This preview will expire in 7 days.

---
*Deployed from commit: a1b2c3d*
```

---

## Monitoring

### View Workflow Runs

```bash
# List recent runs
gh run list

# View specific run
gh run view <run-id>

# Watch live logs
gh run watch
```

### Check Deployment Status

```bash
# Check Firebase hosting status
firebase hosting:channel:list

# View deployment logs
firebase hosting:channel:open <channel-id>
```

---

## Troubleshooting

### Build Failures

**Error: `npm ci` fails**
```bash
# Solution: Update package-lock.json
npm install
git add package-lock.json
git commit -m "Update package-lock.json"
```

**Error: TypeScript errors**
```bash
# Solution: Fix type errors locally first
npx tsc --noEmit
# Fix errors, then commit
```

**Error: Build fails with environment variables**
```bash
# Solution: Check secrets are set correctly
gh secret list

# Re-add if needed
gh secret set DATABASE_URL
```

### Deployment Failures

**Error: Firebase authentication failed**
```bash
# Solution: Regenerate service account
# 1. Go to Firebase Console > Project Settings > Service Accounts
# 2. Generate new private key
# 3. Update FIREBASE_SERVICE_ACCOUNT secret
gh secret set FIREBASE_SERVICE_ACCOUNT < service-account.json
```

**Error: Permission denied**
```bash
# Solution: Ensure service account has correct roles
# - Firebase Admin SDK Administrator Service Agent
# - Firebase Hosting Admin
```

**Error: Health check failed**
```bash
# Solution: Check if API endpoints are accessible
curl https://your-app-reviews.web.app/api/apps

# If 500 error, check Firebase logs
firebase hosting:channel:logs
```

### Preview Deployment Issues

**Error: Preview URL not generated**
```bash
# Solution: Check Firebase Hosting is enabled
firebase hosting:channel:list

# Create channel manually if needed
firebase hosting:channel:create preview-test
```

**Error: PR comment not posted**
```bash
# Solution: Check GitHub Actions permissions
# Settings > Actions > General > Workflow permissions
# Ensure "Read and write permissions" is selected
```

---

## Cost Optimization

### Minimize GitHub Actions Usage

1. **Skip CI on docs changes:**
   ```yaml
   on:
     push:
       paths-ignore:
         - '**.md'
         - 'docs/**'
   ```

2. **Use caching:**
   ```yaml
   - uses: actions/cache@v3
     with:
       path: ~/.npm
       key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
   ```

3. **Parallel jobs:**
   ```yaml
   strategy:
     matrix:
       node-version: [18.x, 20.x]
     max-parallel: 2
   ```

### Minimize Firebase Hosting Costs

1. **Limit preview channels:**
   - Expire after 7 days
   - Delete old channels: `firebase hosting:channel:list --expired`

2. **Use deployment targets:**
   - Only deploy changed files
   - Leverage CDN caching

---

## Advanced Configuration

### Custom Environments

Create `.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      # ... similar to production deployment
      # but with staging URL and secrets
```

### Slack Notifications

Add to workflow:

```yaml
- name: Notify Slack
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "Deployment to production successful! 🚀"
      }
```

### Database Migrations

Add migration step before deployment:

```yaml
- name: Run database migrations
  run: |
    npm run migrate
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## Security Best Practices

1. **Never commit secrets:**
   - Use GitHub Secrets
   - Add `.env` to `.gitignore`

2. **Rotate secrets regularly:**
   ```bash
   # Generate new API keys quarterly
   # Update GitHub secrets
   gh secret set GOOGLE_AI_API_KEY
   ```

3. **Use environment protection:**
   - Require approvals for production
   - Limit deployment branches

4. **Scan for vulnerabilities:**
   - npm audit runs automatically
   - TruffleHog scans for leaked secrets

5. **Review permissions:**
   - Use least-privilege service accounts
   - Audit GitHub Actions permissions quarterly

---

## Monitoring & Alerts

### Set Up Alerts

1. **GitHub Actions:**
   ```bash
   # Enable email notifications
   # Settings > Notifications > Actions
   ```

2. **Firebase:**
   ```bash
   # Set up performance monitoring
   firebase init performance
   ```

3. **Uptime monitoring:**
   - Use services like UptimeRobot
   - Monitor: `https://your-app-reviews.web.app`

---

## Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Firebase App Hosting Docs](https://firebase.google.com/docs/app-hosting)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)

---

**Questions or issues?** Open a GitHub issue or check the deployment logs.

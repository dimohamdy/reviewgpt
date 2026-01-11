#!/bin/bash

# Setup script for GitHub Actions CI/CD
# This script helps configure GitHub secrets for automated deployment

set -e

echo "═══════════════════════════════════════════════════════"
echo "  ReviewGPT - GitHub Actions Setup"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if logged in
if ! gh auth status &> /dev/null; then
    echo "❌ Not logged in to GitHub CLI"
    echo "Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"
echo ""

# Function to set secret
set_secret() {
    local name=$1
    local description=$2
    local example=$3

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Setting: $name"
    echo "Description: $description"
    echo "Example: $example"
    echo ""

    # Check if secret already exists
    if gh secret list | grep -q "^$name"; then
        read -p "Secret already exists. Overwrite? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "⏭️  Skipping $name"
            echo ""
            return
        fi
    fi

    read -p "Enter value for $name (or 'skip' to skip): " -s value
    echo

    if [ "$value" = "skip" ] || [ -z "$value" ]; then
        echo "⏭️  Skipping $name"
    else
        echo "$value" | gh secret set "$name"
        echo "✅ Set $name"
    fi
    echo ""
}

# Function to set secret from file
set_secret_from_file() {
    local name=$1
    local description=$2
    local example=$3

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Setting: $name (from file)"
    echo "Description: $description"
    echo "Example: $example"
    echo ""

    # Check if secret already exists
    if gh secret list | grep -q "^$name"; then
        read -p "Secret already exists. Overwrite? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "⏭️  Skipping $name"
            echo ""
            return
        fi
    fi

    read -p "Enter file path for $name (or 'skip' to skip): " filepath

    if [ "$filepath" = "skip" ] || [ -z "$filepath" ]; then
        echo "⏭️  Skipping $name"
    elif [ ! -f "$filepath" ]; then
        echo "❌ File not found: $filepath"
    else
        gh secret set "$name" < "$filepath"
        echo "✅ Set $name from $filepath"
    fi
    echo ""
}

echo "This script will help you set up GitHub secrets for CI/CD."
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Required secrets
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Required Secrets"
echo "═══════════════════════════════════════════════════════"
echo ""

set_secret "DATABASE_URL" \
    "PostgreSQL connection string" \
    "postgresql://user:password@host:5432/reviewgpt?sslmode=require"

set_secret "FIREBASE_PROJECT_ID" \
    "Firebase project ID" \
    "your-app-reviews"

set_secret_from_file "FIREBASE_SERVICE_ACCOUNT" \
    "Firebase service account JSON" \
    "service-account.json"

set_secret "GOOGLE_AI_API_KEY" \
    "Google AI API key for Gemini" \
    "AIza..."

set_secret "CRON_SECRET" \
    "Random secret for cron authentication" \
    "$(openssl rand -base64 32)"

# Optional secrets
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Optional Secrets"
echo "═══════════════════════════════════════════════════════"
echo ""

set_secret "OPENAI_API_KEY" \
    "OpenAI API key for GPT-4o (optional)" \
    "sk-..."

set_secret "APP_STORE_CONNECT_KEY_ID" \
    "App Store Connect Key ID (optional, for owned apps)" \
    "ABC123XYZ"

set_secret "APP_STORE_CONNECT_ISSUER_ID" \
    "App Store Connect Issuer ID (optional)" \
    "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

set_secret "APP_STORE_CONNECT_PRIVATE_KEY" \
    "App Store Connect Private Key (optional)" \
    "-----BEGIN PRIVATE KEY-----..."

# Summary
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Summary"
echo "═══════════════════════════════════════════════════════"
echo ""

echo "Configured secrets:"
gh secret list

echo ""
echo "✅ GitHub Actions setup complete!"
echo ""
echo "Next steps:"
echo "1. Push your code to GitHub"
echo "2. Create a pull request to test CI workflow"
echo "3. Merge to main to trigger production deployment"
echo ""
echo "Useful commands:"
echo "  gh workflow list              # List workflows"
echo "  gh run list                   # List workflow runs"
echo "  gh run watch                  # Watch live workflow"
echo ""
echo "Documentation:"
echo "  .github/GITHUB_ACTIONS.md     # Complete guide"
echo ""

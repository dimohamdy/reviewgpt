#!/usr/bin/env tsx
/**
 * Test database and Firebase connections
 * Run with: npx tsx scripts/test-connection.ts
 */

import { testConnection, pool } from "../lib/db/client";
import { getRemoteConfig } from "../lib/firebase/remote-config";

async function main() {
  console.log("🧪 Testing ReviewGPT Connections...\n");

  // Test PostgreSQL connection
  console.log("1️⃣  Testing PostgreSQL connection...");
  const dbSuccess = await testConnection();

  if (!dbSuccess) {
    console.error("❌ Database connection failed");
    process.exit(1);
  }

  // Test pgvector extension
  console.log("\n2️⃣  Checking pgvector extension...");
  try {
    const result = await pool.query(
      "SELECT * FROM pg_extension WHERE extname = 'vector'"
    );

    if (result.rows.length > 0) {
      console.log("✅ pgvector extension is installed");
    } else {
      console.warn("⚠️  pgvector extension not found");
      console.log("   Run: CREATE EXTENSION vector;");
    }
  } catch (error) {
    console.error("❌ Error checking pgvector:", error);
  }

  // Test Firebase Remote Config
  console.log("\n3️⃣  Testing Firebase Remote Config...");
  try {
    const config = await getRemoteConfig();
    console.log("✅ Remote Config fetched successfully");
    console.log("   - Preferred model:", config.preferred_model);
    console.log("   - Embedding provider:", config.embedding_provider);
    console.log("   - Max context reviews:", config.max_context_reviews);
  } catch (error) {
    console.warn("⚠️  Remote Config failed (using defaults):", error);
  }

  // Check environment variables
  console.log("\n4️⃣  Checking environment variables...");
  const requiredEnvVars = [
    "DATABASE_URL",
    "FIREBASE_PROJECT_ID",
    "GOOGLE_APPLICATION_CREDENTIALS",
  ];

  const optionalEnvVars = [
    "GOOGLE_AI_API_KEY",
    "OPENAI_API_KEY",
    "ASC_KEY_ID",
    "ASC_ISSUER_ID",
    "ASC_PRIVATE_KEY_PATH",
    "CRON_SECRET",
  ];

  let allRequired = true;
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar} is set`);
    } else {
      console.error(`   ❌ ${envVar} is missing`);
      allRequired = false;
    }
  }

  console.log("\n   Optional environment variables:");
  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar} is set`);
    } else {
      console.log(`   ⚪ ${envVar} not set`);
    }
  }

  if (!allRequired) {
    console.error("\n❌ Some required environment variables are missing");
    process.exit(1);
  }

  console.log("\n✅ All checks passed! Ready to proceed to Stage 2.");
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});

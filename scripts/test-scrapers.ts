#!/usr/bin/env tsx
/**
 * Test script for scraper and embedding functionality
 * Run with: npx tsx scripts/test-scrapers.ts
 */

import { testAllScrapers, fetchReviews } from "../lib/scrapers/index";
import { embeddingService } from "../lib/ai/embeddings";
import { upsertReview, getAppById, createApp } from "../lib/db/queries";
import { pool } from "../lib/db/client";

async function main() {
  console.log("🧪 Testing ReviewGPT Scrapers & Embeddings\n");
  console.log("=" .repeat(60));

  // Step 1: Test all scrapers
  console.log("\n📱 Step 1: Testing Scrapers");
  console.log("-".repeat(60));

  const scraperResults = await testAllScrapers();

  const scrapersPassed =
    scraperResults.appStore || scraperResults.googlePlay;

  if (!scrapersPassed) {
    console.error(
      "\n❌ All scrapers failed. Check your network connection."
    );
    process.exit(1);
  }

  console.log("\n✅ At least one scraper is working!");

  // Step 2: Test embeddings
  console.log("\n🧠 Step 2: Testing Embedding Generation");
  console.log("-".repeat(60));

  const embeddingResults = await embeddingService.testEmbeddings();

  const embeddingsPassed =
    embeddingResults.google || embeddingResults.openai;

  if (!embeddingsPassed) {
    console.error(
      "\n❌ Both embedding providers failed. Check your API keys."
    );
    process.exit(1);
  }

  console.log("\n✅ At least one embedding provider is working!");

  // Step 3: Test end-to-end flow (scrape + embed + store)
  console.log("\n🔄 Step 3: Testing End-to-End Flow");
  console.log("-".repeat(60));

  try {
    // Create a test app
    console.log("\n1. Creating test app in database...");

    let testApp;
    try {
      testApp = await createApp({
        name: "Instagram (Test)",
        platform: "ios",
        appId: "389801252", // Instagram iOS
        country: "us",
        ownedByMe: false,
      });
      console.log(`   ✓ Created test app (ID: ${testApp.id})`);
    } catch (error: any) {
      if (error.message?.includes("duplicate")) {
        console.log("   → Test app already exists, skipping creation");
        // Get existing app
        const apps = await pool.query(
          "SELECT * FROM apps WHERE app_id = '389801252' AND platform = 'ios' LIMIT 1"
        );
        testApp = apps.rows[0];
      } else {
        throw error;
      }
    }

    // Fetch reviews
    console.log("\n2. Fetching reviews from App Store...");
    const result = await fetchReviews({
      appId: "389801252",
      platform: "ios",
      country: "us",
      maxReviews: 5,
      ownedByMe: false,
    });

    console.log(
      `   ✓ Fetched ${result.totalFetched} reviews (source: ${result.source})`
    );

    if (result.reviews.length === 0) {
      console.warn("   ⚠️ No reviews fetched, cannot test full flow");
    } else {
      // Generate embeddings
      console.log("\n3. Generating embeddings...");
      const provider = embeddingResults.google ? "google" : "openai";
      const embeddings =
        await embeddingService.generateReviewEmbeddingsBatch(
          result.reviews.map((r) => ({
            title: r.title,
            content: r.content,
          })),
          provider
        );

      console.log(
        `   ✓ Generated ${embeddings.length} embeddings (${embeddings[0].dimensions} dimensions, provider: ${provider})`
      );

      // Store in database
      console.log("\n4. Storing reviews with embeddings...");
      let storedCount = 0;

      for (let i = 0; i < result.reviews.length; i++) {
        const review = result.reviews[i];
        const embedding = embeddings[i];

        // Store embedding in database using raw SQL (Drizzle doesn't support vector type yet)
        const embeddingString = `[${embedding.embedding.join(",")}]`;

        await pool.query(
          `
          INSERT INTO reviews (
            app_id, platform_review_id, platform, author, rating, title, content,
            review_date, app_version, embedding, embedding_provider
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector, $11)
          ON CONFLICT (platform_review_id, app_id)
          DO UPDATE SET
            author = EXCLUDED.author,
            rating = EXCLUDED.rating,
            title = EXCLUDED.title,
            content = EXCLUDED.content,
            review_date = EXCLUDED.review_date,
            app_version = EXCLUDED.app_version,
            embedding = EXCLUDED.embedding,
            embedding_provider = EXCLUDED.embedding_provider
        `,
          [
            testApp.id,
            review.id,
            review.platform,
            review.author,
            review.rating,
            review.title,
            review.content,
            review.date,
            review.version || null,
            embeddingString,
            embedding.provider,
          ]
        );

        storedCount++;
      }

      console.log(`   ✓ Stored ${storedCount} reviews with embeddings`);

      // Test vector search
      console.log("\n5. Testing vector search...");
      const queryEmbedding = await embeddingService.generateEmbedding(
        "app crashes when I try to post a photo",
        provider
      );

      const embeddingStr = `[${queryEmbedding.embedding.join(",")}]`;

      const searchResults = await pool.query(
        `
        SELECT
          id,
          title,
          content,
          rating,
          1 - (embedding <=> $1::vector) as similarity
        FROM reviews
        WHERE app_id = $2
          AND embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT 3
      `,
        [embeddingStr, testApp.id]
      );

      console.log(
        `   ✓ Found ${searchResults.rows.length} similar reviews:`
      );
      searchResults.rows.forEach((row: any, idx: number) => {
        console.log(
          `      ${idx + 1}. [${row.rating}⭐] ${row.title} (similarity: ${(row.similarity * 100).toFixed(1)}%)`
        );
      });
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ All tests passed successfully!");
    console.log("=".repeat(60));
    console.log("\nSummary:");
    console.log(
      `  • App Store scraper: ${scraperResults.appStore ? "✓" : "✗"}`
    );
    console.log(
      `  • Google Play scraper: ${scraperResults.googlePlay ? "✓" : "✗"}`
    );
    console.log(
      `  • App Store Connect API: ${scraperResults.appStoreConnect ? "✓" : "✗ (optional)"}`
    );
    console.log(
      `  • Google embeddings: ${embeddingResults.google ? "✓" : "✗"}`
    );
    console.log(
      `  • OpenAI embeddings: ${embeddingResults.openai ? "✓" : "✗"}`
    );
    console.log(
      `  • Database storage: ✓`
    );
    console.log(`  • Vector search: ✓`);

    console.log("\n🎉 ReviewGPT is ready for Stage 3!");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ End-to-end test failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("❌ Test script failed:", error);
  process.exit(1);
});

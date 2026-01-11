/**
 * Automated Sync Cron Job
 * POST /api/cron/sync-reviews - Sync all active apps
 */

import { NextResponse } from "next/server";
import { getAllApps, updateAppStats } from "@/lib/db/queries";
import { fetchReviews } from "@/lib/scrapers";
import { generateReviewEmbeddingsBatch } from "@/lib/ai/embeddings";
import { pool } from "@/lib/db/client";
import { getConfigValue } from "@/lib/firebase/remote-config";

export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("CRON_SECRET not configured");
      return NextResponse.json(
        {
          success: false,
          error: "Cron job not configured",
        },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("Invalid cron secret");
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    console.log("Starting automated sync for all apps...");

    // Get all active apps
    const apps = await getAllApps();
    const activeApps = apps.filter((app) => app.status === "active");

    console.log(`Found ${activeApps.length} active apps to sync`);

    if (activeApps.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active apps to sync",
        data: {
          appsProcessed: 0,
          totalReviewsFetched: 0,
          totalReviewsStored: 0,
        },
      });
    }

    // Get max reviews from Remote Config
    const maxReviews = await getConfigValue("max_reviews_per_sync");
    const embeddingProvider = await getConfigValue("embedding_provider");

    const results = [];
    let totalReviewsFetched = 0;
    let totalReviewsStored = 0;
    let totalReviewsUpdated = 0;

    // Process each app
    for (const app of activeApps) {
      try {
        console.log(
          `\nSyncing app: ${app.name} (${app.platform}:${app.appId})`
        );

        // Fetch reviews
        const result = await fetchReviews({
          appId: app.appId,
          platform: app.platform as "ios" | "android",
          country: app.country || "us",
          maxReviews,
          ownedByMe: app.ownedByMe || false,
        });

        console.log(
          `  Fetched ${result.totalFetched} reviews from ${result.source}`
        );
        totalReviewsFetched += result.totalFetched;

        if (result.reviews.length === 0) {
          results.push({
            appId: app.id,
            appName: app.name,
            success: true,
            reviewsFetched: 0,
            reviewsStored: 0,
            reviewsUpdated: 0,
            message: "No new reviews",
          });
          continue;
        }

        // Generate embeddings
        console.log(`  Generating embeddings...`);
        const embeddings = await generateReviewEmbeddingsBatch(
          result.reviews.map((r) => ({
            title: r.title,
            content: r.content,
          })),
          embeddingProvider
        );

        console.log(`  Generated ${embeddings.length} embeddings`);

        // Store reviews with embeddings
        let storedCount = 0;
        let updatedCount = 0;

        for (let i = 0; i < result.reviews.length; i++) {
          const review = result.reviews[i];
          const embedding = embeddings[i];

          const embeddingString = `[${embedding.embedding.join(",")}]`;

          // Upsert review
          const insertResult = await pool.query(
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
            RETURNING (xmax = 0) AS inserted
          `,
            [
              app.id,
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

          if (insertResult.rows[0].inserted) {
            storedCount++;
          } else {
            updatedCount++;
          }
        }

        console.log(
          `  Stored ${storedCount} new reviews, updated ${updatedCount}`
        );
        totalReviewsStored += storedCount;
        totalReviewsUpdated += updatedCount;

        // Update app statistics
        const statsResult = await pool.query(
          `
          SELECT
            COUNT(*) as total_reviews,
            AVG(rating) as average_rating
          FROM reviews
          WHERE app_id = $1
        `,
          [app.id]
        );

        const stats = statsResult.rows[0];

        await updateAppStats(
          app.id,
          parseInt(stats.total_reviews),
          parseFloat(stats.average_rating)
        );

        // Update last synced timestamp
        await pool.query(
          `UPDATE apps SET last_synced_at = NOW() WHERE id = $1`,
          [app.id]
        );

        results.push({
          appId: app.id,
          appName: app.name,
          success: true,
          reviewsFetched: result.totalFetched,
          reviewsStored: storedCount,
          reviewsUpdated: updatedCount,
          totalReviews: parseInt(stats.total_reviews),
          averageRating: parseFloat(stats.average_rating),
        });
      } catch (error: any) {
        console.error(`  Failed to sync app ${app.name}:`, error);
        results.push({
          appId: app.id,
          appName: app.name,
          success: false,
          error: error.message,
        });
      }
    }

    console.log("\nAutomated sync completed");
    console.log(`Total apps processed: ${activeApps.length}`);
    console.log(`Total reviews fetched: ${totalReviewsFetched}`);
    console.log(`Total reviews stored: ${totalReviewsStored}`);
    console.log(`Total reviews updated: ${totalReviewsUpdated}`);

    return NextResponse.json({
      success: true,
      message: "Automated sync completed",
      data: {
        appsProcessed: activeApps.length,
        totalReviewsFetched,
        totalReviewsStored,
        totalReviewsUpdated,
        results,
      },
    });
  } catch (error: any) {
    console.error("Automated sync failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Automated sync failed",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

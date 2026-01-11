/**
 * App Sync API
 * POST /api/apps/[id]/sync - Trigger manual sync for an app
 */

import { NextResponse } from "next/server";
import { getAppById, updateAppStats } from "@/lib/db/queries";
import { fetchReviews } from "@/lib/scrapers";
import { generateReviewEmbeddingsBatch } from "@/lib/ai/embeddings";
import { pool } from "@/lib/db/client";
import { getConfigValue } from "@/lib/firebase/remote-config";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid app ID",
        },
        { status: 400 }
      );
    }

    // Get app details
    const app = await getAppById(id);

    if (!app) {
      return NextResponse.json(
        {
          success: false,
          error: "App not found",
        },
        { status: 404 }
      );
    }

    // Get max reviews from Remote Config
    const maxReviews = await getConfigValue("max_reviews_per_sync");

    console.log(
      `Starting sync for app ${app.name} (${app.platform}:${app.appId})`
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
      `Fetched ${result.totalFetched} reviews from ${result.source}`
    );

    if (result.reviews.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No new reviews found",
        data: {
          reviewsFetched: 0,
          reviewsStored: 0,
          source: result.source,
        },
      });
    }

    // Generate embeddings
    console.log("Generating embeddings...");
    const embeddingProvider = await getConfigValue("embedding_provider");

    const embeddings = await generateReviewEmbeddingsBatch(
      result.reviews.map((r) => ({
        title: r.title,
        content: r.content,
      })),
      embeddingProvider
    );

    console.log(`Generated ${embeddings.length} embeddings`);

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

    console.log(`Stored ${storedCount} new reviews, updated ${updatedCount}`);

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

    console.log("Sync completed successfully");

    return NextResponse.json({
      success: true,
      message: "Sync completed successfully",
      data: {
        reviewsFetched: result.totalFetched,
        reviewsStored: storedCount,
        reviewsUpdated: updatedCount,
        source: result.source,
        totalReviews: parseInt(stats.total_reviews),
        averageRating: parseFloat(stats.average_rating),
      },
    });
  } catch (error: any) {
    console.error("Failed to sync app:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync app",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

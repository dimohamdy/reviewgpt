/**
 * Vector Search Service
 * Semantic search using PostgreSQL pgvector for finding similar reviews
 */

import { pool } from "../db/client";
import { generateEmbedding } from "../ai/embeddings";
import type { ReviewWithSimilarity } from "@/types/review";

export interface VectorSearchOptions {
  appId?: number;
  platform?: "ios" | "android";
  limit?: number;
  similarityThreshold?: number;
  embeddingProvider?: "google" | "openai";
}

export interface VectorSearchResult {
  reviews: ReviewWithSimilarity[];
  query: string;
  totalFound: number;
  avgSimilarity: number;
}

/**
 * Search for reviews similar to a query using vector similarity
 */
export async function searchSimilarReviews(
  query: string,
  options: VectorSearchOptions = {}
): Promise<VectorSearchResult> {
  const {
    appId,
    platform,
    limit = 10,
    similarityThreshold = 0.5,
    embeddingProvider,
  } = options;

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query, embeddingProvider);
  const embeddingString = `[${queryEmbedding.embedding.join(",")}]`;

  // Build WHERE clause conditions
  const conditions: string[] = ["embedding IS NOT NULL"];
  const params: any[] = [embeddingString, similarityThreshold, limit];
  let paramIndex = 4;

  if (appId) {
    conditions.push(`app_id = $${paramIndex}`);
    params.push(appId);
    paramIndex++;
  }

  if (platform) {
    conditions.push(`platform = $${paramIndex}`);
    params.push(platform);
    paramIndex++;
  }

  const whereClause = conditions.join(" AND ");

  // Execute vector similarity search
  // Uses cosine distance operator (<=>)
  // 1 - distance = similarity (0 to 1)
  const query_sql = `
    SELECT
      id,
      app_id as "appId",
      platform_review_id as "platformReviewId",
      platform,
      author,
      rating,
      title,
      content,
      review_date as "reviewDate",
      app_version as "appVersion",
      embedding_provider as "embeddingProvider",
      created_at as "createdAt",
      1 - (embedding <=> $1::vector) as similarity
    FROM reviews
    WHERE ${whereClause}
      AND 1 - (embedding <=> $1::vector) > $2
    ORDER BY embedding <=> $1::vector
    LIMIT $3
  `;

  const result = await pool.query(query_sql, params);

  const reviews = result.rows as ReviewWithSimilarity[];

  // Calculate average similarity
  const avgSimilarity =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.similarity || 0), 0) /
        reviews.length
      : 0;

  return {
    reviews,
    query,
    totalFound: reviews.length,
    avgSimilarity,
  };
}

/**
 * Find reviews with similar content to a given review
 * Useful for finding duplicate or related reviews
 */
export async function findSimilarToReview(
  reviewId: number,
  options: VectorSearchOptions = {}
): Promise<VectorSearchResult> {
  const { limit = 10, similarityThreshold = 0.7 } = options;

  // Get the review's embedding
  const reviewResult = await pool.query(
    `
    SELECT title, content, embedding
    FROM reviews
    WHERE id = $1
  `,
    [reviewId]
  );

  if (reviewResult.rows.length === 0) {
    throw new Error(`Review ${reviewId} not found`);
  }

  const review = reviewResult.rows[0];
  const embedding = review.embedding;

  if (!embedding) {
    throw new Error(`Review ${reviewId} does not have an embedding`);
  }

  // Search for similar reviews (excluding the original)
  const query_sql = `
    SELECT
      id,
      app_id as "appId",
      platform_review_id as "platformReviewId",
      platform,
      author,
      rating,
      title,
      content,
      review_date as "reviewDate",
      app_version as "appVersion",
      embedding_provider as "embeddingProvider",
      created_at as "createdAt",
      1 - (embedding <=> $1::vector) as similarity
    FROM reviews
    WHERE id != $2
      AND embedding IS NOT NULL
      AND 1 - (embedding <=> $1::vector) > $3
    ORDER BY embedding <=> $1::vector
    LIMIT $4
  `;

  const result = await pool.query(query_sql, [
    embedding,
    reviewId,
    similarityThreshold,
    limit,
  ]);

  const reviews = result.rows as ReviewWithSimilarity[];

  const avgSimilarity =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.similarity || 0), 0) /
        reviews.length
      : 0;

  return {
    reviews,
    query: `${review.title}: ${review.content}`,
    totalFound: reviews.length,
    avgSimilarity,
  };
}

/**
 * Get top-k most similar reviews for RAG context
 * Optimized for retrieval-augmented generation
 */
export async function retrieveContextReviews(
  query: string,
  options: VectorSearchOptions & {
    maxContextLength?: number;
  } = {}
): Promise<ReviewWithSimilarity[]> {
  const { limit = 10, maxContextLength = 5000 } = options;

  const result = await searchSimilarReviews(query, {
    ...options,
    limit: limit * 2, // Get more initially to filter by length
  });

  // Filter and limit by total context length
  const contextReviews: ReviewWithSimilarity[] = [];
  let totalLength = 0;

  for (const review of result.reviews) {
    const reviewLength = review.title.length + review.content.length;

    if (totalLength + reviewLength > maxContextLength) {
      break;
    }

    contextReviews.push(review);
    totalLength += reviewLength;

    if (contextReviews.length >= limit) {
      break;
    }
  }

  return contextReviews;
}

/**
 * Aggregate search results by rating to understand sentiment distribution
 */
export async function searchWithSentimentAnalysis(
  query: string,
  options: VectorSearchOptions = {}
): Promise<{
  reviews: ReviewWithSimilarity[];
  sentimentBreakdown: {
    positive: number; // 4-5 stars
    neutral: number; // 3 stars
    negative: number; // 1-2 stars
  };
  avgRating: number;
}> {
  const result = await searchSimilarReviews(query, options);

  const sentimentBreakdown = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };

  let totalRating = 0;

  for (const review of result.reviews) {
    if (review.rating >= 4) {
      sentimentBreakdown.positive++;
    } else if (review.rating === 3) {
      sentimentBreakdown.neutral++;
    } else {
      sentimentBreakdown.negative++;
    }

    totalRating += review.rating;
  }

  const avgRating =
    result.reviews.length > 0 ? totalRating / result.reviews.length : 0;

  return {
    reviews: result.reviews,
    sentimentBreakdown,
    avgRating,
  };
}

/**
 * Test vector search functionality
 */
export async function testVectorSearch(): Promise<boolean> {
  try {
    console.log("Testing vector search...");

    // Check if we have any reviews with embeddings
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM reviews WHERE embedding IS NOT NULL"
    );

    const count = parseInt(countResult.rows[0].count);

    if (count === 0) {
      console.warn("⚠️  No reviews with embeddings found");
      return false;
    }

    console.log(`✓ Found ${count} reviews with embeddings`);

    // Test a search
    const testQuery = "app crashes when opening";
    const result = await searchSimilarReviews(testQuery, {
      limit: 3,
      similarityThreshold: 0.3,
    });

    console.log(
      `✓ Search returned ${result.totalFound} results (avg similarity: ${(result.avgSimilarity * 100).toFixed(1)}%)`
    );

    if (result.reviews.length > 0) {
      console.log("  Sample result:");
      const top = result.reviews[0];
      console.log(
        `    [${top.rating}⭐] ${top.title} (${((top.similarity || 0) * 100).toFixed(1)}% match)`
      );
    }

    return true;
  } catch (error) {
    console.error("✗ Vector search test failed:", error);
    return false;
  }
}

import { db, pool } from "./client";
import { apps, reviews } from "./schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import type { App, CreateAppInput, UpdateAppInput } from "@/types/app";
import type {
  Review,
  CreateReviewInput,
  ReviewFilters,
  ReviewWithSimilarity,
} from "@/types/review";

// ===== APP QUERIES =====

export async function getAllApps(): Promise<App[]> {
  const result = await db.select().from(apps).orderBy(desc(apps.createdAt));
  return result as App[];
}

export async function getAppById(id: number): Promise<App | undefined> {
  const result = await db.select().from(apps).where(eq(apps.id, id)).limit(1);
  return result[0] as App | undefined;
}

export async function createApp(input: CreateAppInput): Promise<App> {
  const result = await db
    .insert(apps)
    .values({
      name: input.name,
      platform: input.platform,
      appId: input.appId,
      country: input.country || "us",
      ownedByMe: input.ownedByMe || false,
      status: "active",
      totalReviews: 0,
    })
    .returning();

  return result[0] as App;
}

export async function updateApp(
  id: number,
  input: UpdateAppInput
): Promise<App | undefined> {
  const result = await db
    .update(apps)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(apps.id, id))
    .returning();

  return result[0] as App | undefined;
}

export async function deleteApp(id: number): Promise<void> {
  await db.delete(apps).where(eq(apps.id, id));
}

export async function updateAppStats(
  appId: number,
  totalReviews: number,
  averageRating: number
): Promise<void> {
  await db
    .update(apps)
    .set({
      totalReviews,
      averageRating: averageRating.toFixed(2),
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(apps.id, appId));
}

// ===== REVIEW QUERIES =====

export async function getReviews(filters: ReviewFilters = {}): Promise<Review[]> {
  const conditions = [];

  if (filters.appId) {
    conditions.push(eq(reviews.appId, filters.appId));
  }

  if (filters.platform) {
    conditions.push(eq(reviews.platform, filters.platform));
  }

  if (filters.rating) {
    conditions.push(eq(reviews.rating, filters.rating));
  }

  if (filters.dateFrom) {
    conditions.push(gte(reviews.reviewDate, filters.dateFrom));
  }

  if (filters.dateTo) {
    conditions.push(lte(reviews.reviewDate, filters.dateTo));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select()
    .from(reviews)
    .where(whereClause)
    .orderBy(desc(reviews.reviewDate))
    .limit(filters.limit || 50)
    .offset(filters.offset || 0);

  return result as Review[];
}

export async function getReviewById(id: number): Promise<Review | undefined> {
  const result = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
  return result[0] as Review | undefined;
}

export async function createReview(input: CreateReviewInput): Promise<Review> {
  const result = await db
    .insert(reviews)
    .values({
      appId: input.appId,
      platformReviewId: input.platformReviewId,
      platform: input.platform,
      author: input.author,
      rating: input.rating,
      title: input.title,
      content: input.content,
      reviewDate: input.reviewDate,
      appVersion: input.appVersion || null,
      embeddingProvider: input.embeddingProvider || null,
    })
    .returning();

  return result[0] as Review;
}

export async function upsertReview(input: CreateReviewInput): Promise<Review> {
  // Check if review exists
  const existing = await db
    .select()
    .from(reviews)
    .where(
      and(
        eq(reviews.platformReviewId, input.platformReviewId),
        eq(reviews.appId, input.appId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing review
    const result = await db
      .update(reviews)
      .set({
        author: input.author,
        rating: input.rating,
        title: input.title,
        content: input.content,
        reviewDate: input.reviewDate,
        appVersion: input.appVersion || null,
        embeddingProvider: input.embeddingProvider || null,
      })
      .where(eq(reviews.id, existing[0].id))
      .returning();

    return result[0] as Review;
  } else {
    // Create new review
    return await createReview(input);
  }
}

// ===== VECTOR SEARCH QUERIES =====

/**
 * Find similar reviews using pgvector cosine similarity
 * Note: Requires pgvector extension and embedding column to be set up
 */
export async function findSimilarReviews(
  appId: number | undefined,
  queryEmbedding: number[],
  limit: number = 10,
  similarityThreshold: number = 0.7
): Promise<ReviewWithSimilarity[]> {
  // Convert embedding array to pgvector format: '[1,2,3,...]'
  const embeddingString = `[${queryEmbedding.join(",")}]`;

  // Build query based on whether appId is provided
  const appFilter = appId ? `AND app_id = ${appId}` : "";

  // Use raw SQL for pgvector operations since Drizzle doesn't support it yet
  const query = `
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
    WHERE embedding IS NOT NULL
      ${appFilter}
      AND 1 - (embedding <=> $1::vector) > $2
    ORDER BY embedding <=> $1::vector
    LIMIT $3
  `;

  const result = await pool.query(query, [
    embeddingString,
    similarityThreshold,
    limit,
  ]);

  return result.rows as ReviewWithSimilarity[];
}

// ===== ANALYTICS QUERIES =====

export async function getRatingDistribution(appId?: number) {
  const whereClause = appId ? eq(reviews.appId, appId) : undefined;

  const result = await db
    .select({
      rating: reviews.rating,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(whereClause)
    .groupBy(reviews.rating)
    .orderBy(reviews.rating);

  const total = result.reduce((sum, r) => sum + r.count, 0);

  return result.map((r) => ({
    rating: r.rating,
    count: r.count,
    percentage: total > 0 ? (r.count / total) * 100 : 0,
  }));
}

export async function getReviewsOverTime(
  appId?: number,
  dateFrom?: Date,
  dateTo?: Date
) {
  const conditions = [];

  if (appId) {
    conditions.push(eq(reviews.appId, appId));
  }

  if (dateFrom) {
    conditions.push(gte(reviews.reviewDate, dateFrom));
  }

  if (dateTo) {
    conditions.push(lte(reviews.reviewDate, dateTo));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select({
      date: sql<string>`DATE(review_date)`,
      count: sql<number>`count(*)::int`,
      averageRating: sql<number>`avg(rating)::numeric`,
    })
    .from(reviews)
    .where(whereClause)
    .groupBy(sql`DATE(review_date)`)
    .orderBy(sql`DATE(review_date)`);

  return result;
}

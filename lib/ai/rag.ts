/**
 * RAG (Retrieval-Augmented Generation) Pipeline
 * Combines vector search with LLM generation for context-aware responses
 */

import { retrieveContextReviews, searchSimilarReviews } from "../vector/search";
import { getRemoteConfig } from "../firebase/remote-config";
import type { ReviewWithSimilarity } from "@/types/review";

export interface RAGContext {
  query: string;
  reviews: ReviewWithSimilarity[];
  systemInstructions: string;
  model: string;
  reviewCount: number;
  avgSimilarity: number;
}

export interface RAGOptions {
  appId?: number;
  platform?: "ios" | "android";
  maxReviews?: number;
  similarityThreshold?: number;
  includeMetadata?: boolean;
}

/**
 * Retrieve relevant reviews and prepare context for LLM
 */
export async function prepareRAGContext(
  query: string,
  options: RAGOptions = {}
): Promise<RAGContext> {
  const {
    appId,
    platform,
    maxReviews,
    similarityThreshold = 0.5,
    includeMetadata = true,
  } = options;

  // Get configuration from Remote Config
  const config = await getRemoteConfig();
  const reviewLimit = maxReviews || config.max_context_reviews;

  // Retrieve contextually relevant reviews
  const contextReviews = await retrieveContextReviews(query, {
    appId,
    platform,
    limit: reviewLimit,
    similarityThreshold,
    maxContextLength: 8000, // Keep context under ~8K chars for token limits
  });

  // Calculate average similarity
  const avgSimilarity =
    contextReviews.length > 0
      ? contextReviews.reduce((sum, r) => sum + (r.similarity || 0), 0) /
        contextReviews.length
      : 0;

  return {
    query,
    reviews: contextReviews,
    systemInstructions: config.agent_system_instructions,
    model: config.preferred_model,
    reviewCount: contextReviews.length,
    avgSimilarity,
  };
}

/**
 * Format reviews into a context string for the LLM
 */
export function formatReviewsForContext(
  reviews: ReviewWithSimilarity[],
  options: {
    includeMetadata?: boolean;
    includeSimilarity?: boolean;
  } = {}
): string {
  const { includeMetadata = true, includeSimilarity = false } = options;

  if (reviews.length === 0) {
    return "No reviews found matching your query.";
  }

  const formattedReviews = reviews.map((review, index) => {
    let text = `Review ${index + 1}:\n`;

    if (includeMetadata) {
      text += `Rating: ${review.rating}/5 stars\n`;
      text += `Author: ${review.author}\n`;
      text += `Date: ${new Date(review.reviewDate).toLocaleDateString()}\n`;
      if (review.appVersion) {
        text += `App Version: ${review.appVersion}\n`;
      }
      if (includeSimilarity && review.similarity) {
        text += `Relevance: ${(review.similarity * 100).toFixed(1)}%\n`;
      }
    }

    text += `Title: ${review.title}\n`;
    text += `Content: ${review.content}\n`;

    return text;
  });

  return formattedReviews.join("\n---\n\n");
}

/**
 * Build the complete prompt for RAG
 */
export function buildRAGPrompt(context: RAGContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const reviewsContext = formatReviewsForContext(context.reviews, {
    includeMetadata: true,
    includeSimilarity: false,
  });

  const systemPrompt = `${context.systemInstructions}

You have access to ${context.reviewCount} relevant app reviews (average relevance: ${(context.avgSimilarity * 100).toFixed(1)}%).

IMPORTANT GUIDELINES:
1. Base your analysis ONLY on the provided reviews
2. Cite specific reviews when making claims (e.g., "Review 3 mentions...")
3. If the reviews don't contain enough information, acknowledge it
4. Summarize common themes and patterns across reviews
5. Highlight both positive and negative feedback
6. Be objective and data-driven`;

  const userPrompt = `USER QUESTION:
${context.query}

RELEVANT REVIEWS:
${reviewsContext}

Please analyze the above reviews and answer the user's question. Focus on actionable insights.`;

  return {
    systemPrompt,
    userPrompt,
  };
}

/**
 * Extract key themes from retrieved reviews
 * Useful for providing context to the user about what was found
 */
export function extractReviewThemes(
  reviews: ReviewWithSimilarity[]
): {
  totalReviews: number;
  avgRating: number;
  ratingDistribution: Record<number, number>;
  topVersions: string[];
  platforms: Record<string, number>;
} {
  if (reviews.length === 0) {
    return {
      totalReviews: 0,
      avgRating: 0,
      ratingDistribution: {},
      topVersions: [],
      platforms: {},
    };
  }

  const ratingDistribution: Record<number, number> = {};
  const versionCounts: Record<string, number> = {};
  const platforms: Record<string, number> = {};
  let totalRating = 0;

  for (const review of reviews) {
    // Rating distribution
    ratingDistribution[review.rating] =
      (ratingDistribution[review.rating] || 0) + 1;
    totalRating += review.rating;

    // Version counts
    if (review.appVersion) {
      versionCounts[review.appVersion] =
        (versionCounts[review.appVersion] || 0) + 1;
    }

    // Platform counts
    platforms[review.platform] = (platforms[review.platform] || 0) + 1;
  }

  // Get top 3 versions
  const topVersions = Object.entries(versionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([version]) => version);

  return {
    totalReviews: reviews.length,
    avgRating: totalRating / reviews.length,
    ratingDistribution,
    topVersions,
    platforms,
  };
}

/**
 * Analyze sentiment of retrieved reviews
 */
export function analyzeSentiment(reviews: ReviewWithSimilarity[]): {
  positive: number;
  neutral: number;
  negative: number;
  positivePercentage: number;
  negativePercentage: number;
} {
  if (reviews.length === 0) {
    return {
      positive: 0,
      neutral: 0,
      negative: 0,
      positivePercentage: 0,
      negativePercentage: 0,
    };
  }

  let positive = 0;
  let neutral = 0;
  let negative = 0;

  for (const review of reviews) {
    if (review.rating >= 4) {
      positive++;
    } else if (review.rating === 3) {
      neutral++;
    } else {
      negative++;
    }
  }

  return {
    positive,
    neutral,
    negative,
    positivePercentage: (positive / reviews.length) * 100,
    negativePercentage: (negative / reviews.length) * 100,
  };
}

/**
 * Complete RAG pipeline: retrieve context and build prompts
 */
export async function executeRAGPipeline(
  query: string,
  options: RAGOptions = {}
): Promise<{
  context: RAGContext;
  prompts: {
    systemPrompt: string;
    userPrompt: string;
  };
  metadata: {
    themes: ReturnType<typeof extractReviewThemes>;
    sentiment: ReturnType<typeof analyzeSentiment>;
  };
}> {
  // Prepare context
  const context = await prepareRAGContext(query, options);

  // Build prompts
  const prompts = buildRAGPrompt(context);

  // Extract metadata
  const themes = extractReviewThemes(context.reviews);
  const sentiment = analyzeSentiment(context.reviews);

  return {
    context,
    prompts,
    metadata: {
      themes,
      sentiment,
    },
  };
}

/**
 * Generate a summary of the RAG context for debugging
 */
export function summarizeRAGContext(context: RAGContext): string {
  const sentiment = analyzeSentiment(context.reviews);
  const themes = extractReviewThemes(context.reviews);

  return `
RAG Context Summary:
- Query: "${context.query}"
- Reviews retrieved: ${context.reviewCount}
- Average relevance: ${(context.avgSimilarity * 100).toFixed(1)}%
- Average rating: ${themes.avgRating.toFixed(1)}/5
- Sentiment: ${sentiment.positive} positive, ${sentiment.neutral} neutral, ${sentiment.negative} negative
- Model: ${context.model}
  `.trim();
}

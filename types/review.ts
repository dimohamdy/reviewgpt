export interface Review {
  id: number;
  appId: number;
  platformReviewId: string;
  platform: "ios" | "android";
  author: string;
  rating: number;
  title: string;
  content: string;
  reviewDate: Date;
  appVersion: string;
  embedding: number[] | null;
  embeddingProvider: "google" | "openai" | null;
  createdAt: Date;
}

export interface CreateReviewInput {
  appId: number;
  platformReviewId: string;
  platform: "ios" | "android";
  author: string;
  rating: number;
  title: string;
  content: string;
  reviewDate: Date;
  appVersion?: string;
  embedding?: number[];
  embeddingProvider?: "google" | "openai";
}

export interface ReviewFilters {
  appId?: number;
  platform?: "ios" | "android";
  rating?: number;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface ReviewWithSimilarity extends Review {
  similarity?: number;
}

export interface RatingDistribution {
  rating: number;
  count: number;
  percentage: number;
}

export interface ReviewsOverTime {
  date: string;
  count: number;
  averageRating: number;
}

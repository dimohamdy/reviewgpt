import { RatingDistribution, ReviewsOverTime } from "./review";

export interface AnalyticsData {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: RatingDistribution[];
  reviewsOverTime: ReviewsOverTime[];
  recentReviews: number;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface AnalyticsFilters {
  appId?: number;
  platform?: "ios" | "android";
  dateFrom?: Date;
  dateTo?: Date;
}

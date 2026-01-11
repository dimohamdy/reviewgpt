/**
 * Google Play Store Web Scraper
 * Uses google-play-scraper library to fetch reviews from public Play Store pages
 * Works for ANY app, not just your own
 */

import gplay from "google-play-scraper";
import type { NormalizedReview } from "./app-store-connect";

export interface GooglePlayReview {
  id: string;
  userName: string;
  userImage: string;
  date: string;
  score: number;
  scoreText: string;
  url: string;
  title: string;
  text: string;
  replyDate?: string;
  replyText?: string;
  version: string;
  thumbsUp: number;
  criterias?: Array<{
    criteria: string;
    rating: number;
  }>;
}

export interface GooglePlayScraperOptions {
  appId: string;
  lang?: string;
  country?: string;
  sort?: "NEWEST" | "RATING" | "HELPFULNESS";
  num?: number;
  paginate?: boolean;
  nextPaginationToken?: string;
}

/**
 * Scrape reviews from Google Play Store
 */
export async function scrapeGooglePlayReviews(
  options: GooglePlayScraperOptions
): Promise<{
  reviews: NormalizedReview[];
  nextToken?: string;
}> {
  const {
    appId,
    lang = "en",
    country = "us",
    sort = "NEWEST",
    num = 100,
    paginate = true,
    nextPaginationToken,
  } = options;

  try {
    const result = await gplay.reviews({
      appId,
      lang,
      country,
      sort: gplay.sort[sort],
      num,
      paginate,
      nextPaginationToken,
    });

    const reviews = result.data.map(normalizeGooglePlayReview);

    return {
      reviews,
      nextToken: result.nextPaginationToken,
    };
  } catch (error) {
    console.error(
      `Failed to scrape Google Play reviews for ${appId}:`,
      error
    );
    throw error;
  }
}

/**
 * Scrape multiple pages of reviews
 */
export async function scrapeGooglePlayReviewsPaginated(
  appId: string,
  country: string = "us",
  maxReviews: number = 500
): Promise<NormalizedReview[]> {
  const allReviews: NormalizedReview[] = [];
  let nextToken: string | undefined;

  while (allReviews.length < maxReviews) {
    try {
      const result = await scrapeGooglePlayReviews({
        appId,
        country,
        sort: "NEWEST",
        num: Math.min(150, maxReviews - allReviews.length), // 150 is max per request
        paginate: true,
        nextPaginationToken: nextToken,
      });

      if (result.reviews.length === 0) {
        // No more reviews
        break;
      }

      allReviews.push(...result.reviews);
      nextToken = result.nextToken;

      if (!nextToken) {
        // No more pages
        break;
      }

      // Rate limiting: wait 500ms between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(
        `Failed to fetch reviews (total: ${allReviews.length}):`,
        error
      );
      break;
    }
  }

  return allReviews;
}

/**
 * Get app details from Google Play
 */
export async function getGooglePlayAppDetails(
  appId: string,
  country: string = "us"
) {
  try {
    const app = await gplay.app({
      appId,
      country,
    });

    return {
      appId: app.appId,
      title: app.title,
      summary: app.summary,
      description: app.description,
      version: app.version,
      score: app.score,
      ratings: app.ratings,
      reviews: app.reviews,
      price: app.price,
      free: app.free,
      developer: app.developer,
      developerEmail: app.developerEmail,
      genre: app.genre,
      genreId: app.genreId,
      released: app.released,
      updated: app.updated,
      installs: app.installs,
    };
  } catch (error) {
    console.error(`Failed to fetch app details for ${appId}:`, error);
    throw error;
  }
}

/**
 * Normalize google-play-scraper format to our internal format
 */
function normalizeGooglePlayReview(review: GooglePlayReview): NormalizedReview {
  return {
    id: review.id,
    author: review.userName,
    rating: review.score,
    title: review.title || "",
    content: review.text,
    date: new Date(review.date),
    version: review.version,
    platform: "android",
  };
}

/**
 * Test if scraping works for a given app
 */
export async function testGooglePlayScraper(
  appId: string,
  country: string = "us"
): Promise<boolean> {
  try {
    const result = await scrapeGooglePlayReviews({
      appId,
      country,
      num: 10,
    });

    console.log(
      `✓ Successfully scraped ${result.reviews.length} reviews from Google Play`
    );
    return result.reviews.length > 0;
  } catch (error) {
    console.error("✗ Google Play scraper test failed:", error);
    return false;
  }
}

/**
 * iOS App Store Web Scraper
 * Uses app-store-scraper library to fetch reviews from public App Store pages
 * Works for ANY app, not just your own
 */

import appStoreScraper from "app-store-scraper";
import type { NormalizedReview } from "./app-store-connect";

export interface AppStoreReview {
  id: string;
  userName: string;
  userUrl: string;
  version: string;
  score: number;
  title: string;
  text: string;
  url: string;
  updated: string;
}

export interface AppStoreScraperOptions {
  appId: string;
  country?: string;
  page?: number;
  sort?: "RECENT" | "HELPFUL";
}

/**
 * Scrape reviews from the iOS App Store
 */
export async function scrapeAppStoreReviews(
  options: AppStoreScraperOptions
): Promise<NormalizedReview[]> {
  const { appId, country = "us", page = 1, sort = "RECENT" } = options;

  try {
    const reviews = await appStoreScraper.reviews({
      id: appId,
      country,
      page,
      sort: appStoreScraper.sort[sort],
    });

    return reviews.map(normalizeAppStoreReview);
  } catch (error) {
    console.error(`Failed to scrape App Store reviews for ${appId}:`, error);
    throw error;
  }
}

/**
 * Scrape multiple pages of reviews
 */
export async function scrapeAppStoreReviewsPaginated(
  appId: string,
  country: string = "us",
  maxPages: number = 5
): Promise<NormalizedReview[]> {
  const allReviews: NormalizedReview[] = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      const reviews = await scrapeAppStoreReviews({
        appId,
        country,
        page,
        sort: "RECENT",
      });

      if (reviews.length === 0) {
        // No more reviews
        break;
      }

      allReviews.push(...reviews);

      // Rate limiting: wait 500ms between requests to avoid being blocked
      if (page < maxPages) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Failed to fetch page ${page}:`, error);
      break;
    }
  }

  return allReviews;
}

/**
 * Get app details from the App Store
 */
export async function getAppStoreAppDetails(appId: string, country: string = "us") {
  try {
    const app = await appStoreScraper.app({
      id: appId,
      country,
    });

    return {
      id: app.id,
      appId: app.bundleId,
      title: app.title,
      description: app.description,
      version: app.version,
      score: app.score,
      reviews: app.reviews,
      ratings: app.ratings,
      price: app.price,
      free: app.free,
      developer: app.developer,
      genre: app.genre,
      genreId: app.genreId,
      released: app.released,
      currentVersionReleaseDate: app.currentVersionReleaseDate,
    };
  } catch (error) {
    console.error(`Failed to fetch app details for ${appId}:`, error);
    throw error;
  }
}

/**
 * Normalize app-store-scraper format to our internal format
 */
function normalizeAppStoreReview(review: AppStoreReview): NormalizedReview {
  return {
    id: review.id,
    author: review.userName,
    rating: review.score,
    title: review.title,
    content: review.text,
    date: new Date(review.updated),
    version: review.version,
    platform: "ios",
  };
}

/**
 * Test if scraping works for a given app
 */
export async function testAppStoreScraper(
  appId: string,
  country: string = "us"
): Promise<boolean> {
  try {
    const reviews = await scrapeAppStoreReviews({
      appId,
      country,
      page: 1,
    });

    console.log(`✓ Successfully scraped ${reviews.length} reviews from App Store`);
    return reviews.length > 0;
  } catch (error) {
    console.error("✗ App Store scraper test failed:", error);
    return false;
  }
}

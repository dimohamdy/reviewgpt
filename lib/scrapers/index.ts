/**
 * Scraper Factory
 * Routes review fetching between App Store Connect API (owned apps) and web scrapers (competitor apps)
 */

import type { NormalizedReview } from "./app-store-connect";
import { getAppStoreConnectClient } from "./app-store-connect";
import { scrapeAppStoreReviewsPaginated } from "./app-store";
import { scrapeGooglePlayReviewsPaginated } from "./google-play";

export interface ScraperOptions {
  appId: string;
  platform: "ios" | "android";
  country?: string;
  maxReviews?: number;
  ownedByMe?: boolean;
  // For App Store Connect API (owned apps only)
  appStoreConnectAppId?: string;
}

export interface ScraperResult {
  reviews: NormalizedReview[];
  source: "app-store-connect" | "web-scraper";
  totalFetched: number;
}

/**
 * Fetch reviews using the appropriate method (API or scraper)
 */
export async function fetchReviews(
  options: ScraperOptions
): Promise<ScraperResult> {
  const {
    appId,
    platform,
    country = "us",
    maxReviews = 100,
    ownedByMe = false,
    appStoreConnectAppId,
  } = options;

  // Use App Store Connect API for owned iOS apps
  if (ownedByMe && platform === "ios" && appStoreConnectAppId) {
    console.log(
      `📱 Fetching reviews via App Store Connect API for app ${appStoreConnectAppId}...`
    );

    try {
      const client = getAppStoreConnectClient();
      const reviews = await client.fetchAllReviews(
        appStoreConnectAppId,
        maxReviews
      );

      return {
        reviews,
        source: "app-store-connect",
        totalFetched: reviews.length,
      };
    } catch (error) {
      console.error(
        "App Store Connect API failed, falling back to web scraper:",
        error
      );
      // Fall back to web scraper
    }
  }

  // Use web scrapers for competitor apps or when API fails
  console.log(
    `🌐 Fetching reviews via web scraper for ${platform} app ${appId}...`
  );

  if (platform === "ios") {
    const maxPages = Math.ceil(maxReviews / 20); // ~20 reviews per page
    const reviews = await scrapeAppStoreReviewsPaginated(
      appId,
      country,
      maxPages
    );

    return {
      reviews: reviews.slice(0, maxReviews),
      source: "web-scraper",
      totalFetched: reviews.length,
    };
  } else if (platform === "android") {
    const reviews = await scrapeGooglePlayReviewsPaginated(
      appId,
      country,
      maxReviews
    );

    return {
      reviews: reviews.slice(0, maxReviews),
      source: "web-scraper",
      totalFetched: reviews.length,
    };
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Batch fetch reviews for multiple apps
 */
export async function fetchReviewsBatch(
  apps: ScraperOptions[]
): Promise<Map<string, ScraperResult>> {
  const results = new Map<string, ScraperResult>();

  for (const app of apps) {
    try {
      const result = await fetchReviews(app);
      const key = `${app.platform}-${app.appId}`;
      results.set(key, result);

      // Rate limiting between apps
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(
        `Failed to fetch reviews for ${app.platform}:${app.appId}:`,
        error
      );
    }
  }

  return results;
}

/**
 * Test all scraper methods
 */
export async function testAllScrapers(): Promise<{
  appStoreConnect: boolean;
  appStore: boolean;
  googlePlay: boolean;
}> {
  const results = {
    appStoreConnect: false,
    appStore: false,
    googlePlay: false,
  };

  // Test App Store Connect API
  console.log("\n1️⃣  Testing App Store Connect API...");
  try {
    const client = getAppStoreConnectClient();
    results.appStoreConnect = await client.testConnection();
  } catch (error) {
    console.log("⚠️  App Store Connect not configured (optional)");
  }

  // Test App Store web scraper with a popular app (Instagram)
  console.log("\n2️⃣  Testing App Store web scraper...");
  try {
    const reviews = await scrapeAppStoreReviewsPaginated("389801252", "us", 1);
    results.appStore = reviews.length > 0;
    console.log(`✓ Fetched ${reviews.length} reviews from App Store`);
  } catch (error) {
    console.error("✗ App Store scraper failed:", error);
  }

  // Test Google Play web scraper with a popular app (Instagram)
  console.log("\n3️⃣  Testing Google Play web scraper...");
  try {
    const reviews = await scrapeGooglePlayReviewsPaginated(
      "com.instagram.android",
      "us",
      10
    );
    results.googlePlay = reviews.length > 0;
    console.log(`✓ Fetched ${reviews.length} reviews from Google Play`);
  } catch (error) {
    console.error("✗ Google Play scraper failed:", error);
  }

  return results;
}

// Re-export types
export type { NormalizedReview } from "./app-store-connect";

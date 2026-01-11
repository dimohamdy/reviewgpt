/**
 * App Store Connect API Client
 * Official Apple API for fetching reviews from YOUR apps
 *
 * Requirements:
 * - ASC_KEY_ID: Your App Store Connect API Key ID
 * - ASC_ISSUER_ID: Your Issuer ID
 * - ASC_PRIVATE_KEY_PATH: Path to your .p8 private key file
 */

import jwt from "jsonwebtoken";
import { readFileSync } from "fs";

export interface AppStoreConnectConfig {
  keyId: string;
  issuerId: string;
  privateKeyPath: string;
}

export interface AppStoreConnectReview {
  id: string;
  type: "customerReviews";
  attributes: {
    rating: number;
    title: string;
    body: string;
    reviewerNickname: string;
    createdDate: string;
    territory: string;
  };
  relationships?: {
    response?: {
      data: {
        id: string;
        type: "customerReviewResponses";
      } | null;
    };
  };
}

export interface NormalizedReview {
  id: string;
  author: string;
  rating: number;
  title: string;
  content: string;
  date: Date;
  version?: string;
  platform: "ios" | "android";
}

export class AppStoreConnectClient {
  private config: AppStoreConnectConfig;
  private privateKey: string;
  private baseUrl = "https://api.appstoreconnect.apple.com/v1";

  constructor(config?: AppStoreConnectConfig) {
    // Use environment variables if config not provided
    this.config = config || {
      keyId: process.env.ASC_KEY_ID || "",
      issuerId: process.env.ASC_ISSUER_ID || "",
      privateKeyPath: process.env.ASC_PRIVATE_KEY_PATH || "",
    };

    if (!this.config.keyId || !this.config.issuerId || !this.config.privateKeyPath) {
      throw new Error(
        "App Store Connect credentials not configured. Set ASC_KEY_ID, ASC_ISSUER_ID, and ASC_PRIVATE_KEY_PATH environment variables."
      );
    }

    // Load private key
    try {
      this.privateKey = readFileSync(this.config.privateKeyPath, "utf8");
    } catch (error) {
      throw new Error(
        `Failed to read private key from ${this.config.privateKeyPath}: ${error}`
      );
    }
  }

  /**
   * Generate JWT token for authentication
   * Tokens are valid for 20 minutes
   */
  private generateToken(): string {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      iss: this.config.issuerId,
      iat: now,
      exp: now + 20 * 60, // 20 minutes
      aud: "appstoreconnect-v1",
    };

    return jwt.sign(payload, this.privateKey, {
      algorithm: "ES256",
      keyid: this.config.keyId,
    });
  }

  /**
   * Make authenticated request to App Store Connect API
   */
  private async makeRequest<T>(endpoint: string): Promise<T> {
    const token = this.generateToken();
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `App Store Connect API error (${response.status}): ${error}`
      );
    }

    return await response.json();
  }

  /**
   * Get all apps for this account
   */
  async getApps(): Promise<any[]> {
    const response = await this.makeRequest<{ data: any[] }>("/apps");
    return response.data;
  }

  /**
   * Fetch customer reviews for a specific app
   *
   * @param appId - The App Store Connect app ID (not bundle ID)
   * @param options - Pagination and filtering options
   */
  async fetchReviews(
    appId: string,
    options: {
      limit?: number;
      cursor?: string;
      sort?: "CREATED_DATE" | "-CREATED_DATE";
    } = {}
  ): Promise<{
    reviews: NormalizedReview[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    const limit = options.limit || 200; // Max 200 per request
    const sort = options.sort || "-CREATED_DATE"; // Newest first

    let endpoint = `/apps/${appId}/customerReviews?limit=${limit}&sort=${sort}`;

    if (options.cursor) {
      endpoint += `&cursor=${options.cursor}`;
    }

    const response = await this.makeRequest<{
      data: AppStoreConnectReview[];
      links?: {
        next?: string;
      };
      meta?: {
        paging: {
          total: number;
        };
      };
    }>(endpoint);

    const reviews = response.data.map((review) =>
      this.normalizeReview(review)
    );

    // Extract cursor from next link if it exists
    let nextCursor: string | undefined;
    if (response.links?.next) {
      const url = new URL(response.links.next);
      nextCursor = url.searchParams.get("cursor") || undefined;
    }

    return {
      reviews,
      nextCursor,
      hasMore: !!nextCursor,
    };
  }

  /**
   * Fetch all reviews for an app (handles pagination)
   *
   * @param appId - The App Store Connect app ID
   * @param maxReviews - Maximum number of reviews to fetch (default: 1000)
   */
  async fetchAllReviews(
    appId: string,
    maxReviews: number = 1000
  ): Promise<NormalizedReview[]> {
    const allReviews: NormalizedReview[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore && allReviews.length < maxReviews) {
      const result = await this.fetchReviews(appId, {
        limit: Math.min(200, maxReviews - allReviews.length),
        cursor,
      });

      allReviews.push(...result.reviews);
      cursor = result.nextCursor;
      hasMore = result.hasMore;

      // Rate limiting: wait 200ms between requests
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return allReviews;
  }

  /**
   * Normalize App Store Connect review format to our internal format
   */
  private normalizeReview(review: AppStoreConnectReview): NormalizedReview {
    return {
      id: review.id,
      author: review.attributes.reviewerNickname,
      rating: review.attributes.rating,
      title: review.attributes.title || "",
      content: review.attributes.body || "",
      date: new Date(review.attributes.createdDate),
      platform: "ios",
    };
  }

  /**
   * Test if credentials are valid
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getApps();
      return true;
    } catch (error) {
      console.error("App Store Connect authentication failed:", error);
      return false;
    }
  }
}

/**
 * Create a singleton instance
 */
let clientInstance: AppStoreConnectClient | null = null;

export function getAppStoreConnectClient(): AppStoreConnectClient {
  if (!clientInstance) {
    clientInstance = new AppStoreConnectClient();
  }
  return clientInstance;
}

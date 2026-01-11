/**
 * Reviews API
 * GET /api/reviews - Query reviews with filters
 */

import { NextResponse } from "next/server";
import { getReviews } from "@/lib/db/queries";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const appId = searchParams.get("appId");
    const platform = searchParams.get("platform");
    const rating = searchParams.get("rating");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    // Build filters
    const filters: any = {};

    if (appId) {
      const parsedAppId = parseInt(appId);
      if (isNaN(parsedAppId)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid appId parameter",
          },
          { status: 400 }
        );
      }
      filters.appId = parsedAppId;
    }

    if (platform) {
      if (platform !== "ios" && platform !== "android") {
        return NextResponse.json(
          {
            success: false,
            error: "Platform must be 'ios' or 'android'",
          },
          { status: 400 }
        );
      }
      filters.platform = platform;
    }

    if (rating) {
      const parsedRating = parseInt(rating);
      if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return NextResponse.json(
          {
            success: false,
            error: "Rating must be between 1 and 5",
          },
          { status: 400 }
        );
      }
      filters.rating = parsedRating;
    }

    if (dateFrom) {
      const date = new Date(dateFrom);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid dateFrom parameter",
          },
          { status: 400 }
        );
      }
      filters.dateFrom = date;
    }

    if (dateTo) {
      const date = new Date(dateTo);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid dateTo parameter",
          },
          { status: 400 }
        );
      }
      filters.dateTo = date;
    }

    if (limit) {
      const parsedLimit = parseInt(limit);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return NextResponse.json(
          {
            success: false,
            error: "Limit must be between 1 and 100",
          },
          { status: 400 }
        );
      }
      filters.limit = parsedLimit;
    }

    if (offset) {
      const parsedOffset = parseInt(offset);
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Offset must be a non-negative number",
          },
          { status: 400 }
        );
      }
      filters.offset = parsedOffset;
    }

    // Fetch reviews
    const reviews = await getReviews(filters);

    return NextResponse.json({
      success: true,
      data: reviews,
      count: reviews.length,
      filters,
    });
  } catch (error: any) {
    console.error("Failed to fetch reviews:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch reviews",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Analytics API
 * GET /api/analytics - Get aggregated analytics data
 */

import { NextResponse } from "next/server";
import {
  getRatingDistribution,
  getReviewsOverTime,
} from "@/lib/db/queries";
import { pool } from "@/lib/db/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const appId = searchParams.get("appId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    let parsedAppId: number | undefined;
    let parsedDateFrom: Date | undefined;
    let parsedDateTo: Date | undefined;

    if (appId) {
      parsedAppId = parseInt(appId);
      if (isNaN(parsedAppId)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid appId parameter",
          },
          { status: 400 }
        );
      }
    }

    if (dateFrom) {
      parsedDateFrom = new Date(dateFrom);
      if (isNaN(parsedDateFrom.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid dateFrom parameter",
          },
          { status: 400 }
        );
      }
    }

    if (dateTo) {
      parsedDateTo = new Date(dateTo);
      if (isNaN(parsedDateTo.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid dateTo parameter",
          },
          { status: 400 }
        );
      }
    }

    // Get overall statistics
    let statsQuery = `
      SELECT
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(DISTINCT app_id) as total_apps
      FROM reviews
      WHERE 1=1
    `;

    const statsParams: any[] = [];
    let paramIndex = 1;

    if (parsedAppId) {
      statsQuery += ` AND app_id = $${paramIndex}`;
      statsParams.push(parsedAppId);
      paramIndex++;
    }

    if (parsedDateFrom) {
      statsQuery += ` AND review_date >= $${paramIndex}`;
      statsParams.push(parsedDateFrom);
      paramIndex++;
    }

    if (parsedDateTo) {
      statsQuery += ` AND review_date <= $${paramIndex}`;
      statsParams.push(parsedDateTo);
      paramIndex++;
    }

    const statsResult = await pool.query(statsQuery, statsParams);
    const stats = statsResult.rows[0];

    // Get rating distribution
    const ratingDistribution = await getRatingDistribution(parsedAppId);

    // Get reviews over time
    const reviewsOverTime = await getReviewsOverTime(
      parsedAppId,
      parsedDateFrom,
      parsedDateTo
    );

    // Calculate sentiment breakdown
    const sentiment = {
      positive: ratingDistribution
        .filter((r) => r.rating >= 4)
        .reduce((sum, r) => sum + r.count, 0),
      neutral: ratingDistribution
        .filter((r) => r.rating === 3)
        .reduce((sum, r) => sum + r.count, 0),
      negative: ratingDistribution
        .filter((r) => r.rating <= 2)
        .reduce((sum, r) => sum + r.count, 0),
    };

    const totalReviews = parseInt(stats.total_reviews);
    const sentimentPercentages = {
      positive: totalReviews > 0 ? (sentiment.positive / totalReviews) * 100 : 0,
      neutral: totalReviews > 0 ? (sentiment.neutral / totalReviews) * 100 : 0,
      negative: totalReviews > 0 ? (sentiment.negative / totalReviews) * 100 : 0,
    };

    // Get recent reviews (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let recentQuery = `
      SELECT COUNT(*) as recent_count
      FROM reviews
      WHERE review_date >= $1
    `;

    const recentParams: any[] = [sevenDaysAgo];
    let recentParamIndex = 2;

    if (parsedAppId) {
      recentQuery += ` AND app_id = $${recentParamIndex}`;
      recentParams.push(parsedAppId);
      recentParamIndex++;
    }

    const recentResult = await pool.query(recentQuery, recentParams);
    const recentCount = parseInt(recentResult.rows[0].recent_count);

    // Get app info if appId is specified
    let appInfo = null;
    if (parsedAppId) {
      const appResult = await pool.query(
        "SELECT * FROM apps WHERE id = $1",
        [parsedAppId]
      );
      if (appResult.rows.length > 0) {
        appInfo = appResult.rows[0];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalReviews,
        totalApps: parseInt(stats.total_apps),
        averageRating: parseFloat(stats.average_rating) || 0,
        recentReviews: recentCount,
        ratingDistribution,
        reviewsOverTime: reviewsOverTime.map((row) => ({
          date: row.date,
          count: row.count,
          averageRating: parseFloat(row.averageRating as any),
        })),
        sentiment: {
          ...sentiment,
          percentages: sentimentPercentages,
        },
        appInfo,
      },
      filters: {
        appId: parsedAppId,
        dateFrom: parsedDateFrom?.toISOString(),
        dateTo: parsedDateTo?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch analytics:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch analytics",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

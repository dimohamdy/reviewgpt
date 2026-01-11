import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RatingDistributionChart } from "@/components/dashboard/rating-distribution-chart";

async function getApp(id: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/apps/${id}`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching app:", error);
    return null;
  }
}

async function getAppAnalytics(id: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/analytics?appId=${id}`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return null;
  }
}

async function getAppReviews(id: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/reviews?appId=${id}&limit=20`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return [];
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getSentimentBadge(rating: number) {
  if (rating >= 4) {
    return <Badge variant="default">Positive</Badge>;
  } else if (rating === 3) {
    return <Badge variant="secondary">Neutral</Badge>;
  } else {
    return <Badge variant="destructive">Negative</Badge>;
  }
}

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await getApp(id);

  if (!app) {
    notFound();
  }

  const analytics = await getAppAnalytics(id);
  const reviews = await getAppReviews(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/apps">
              <Button variant="ghost" size="sm">
                ← Back to Apps
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">{app.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={app.platform === "ios" ? "default" : "secondary"}>
              {app.platform === "ios" ? "📱 iOS" : "🤖 Android"}
            </Badge>
            <Badge variant={app.status === "active" ? "default" : "secondary"}>
              {app.status}
            </Badge>
            <span className="text-sm text-muted-foreground">{app.appId}</span>
          </div>
        </div>
      </div>

      {analytics && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Reviews"
              value={analytics.totalReviews.toLocaleString()}
              icon="📝"
              description="All time"
            />
            <StatsCard
              title="Average Rating"
              value={analytics.averageRating.toFixed(1)}
              icon="⭐"
              description="Overall rating"
            />
            <StatsCard
              title="Recent Reviews"
              value={analytics.recentReviews.toLocaleString()}
              icon="🆕"
              description="Last 7 days"
            />
            <StatsCard
              title="Positive Sentiment"
              value={`${analytics.sentiment.percentages.positive.toFixed(0)}%`}
              icon="😊"
              description={`${analytics.sentiment.positive} positive`}
            />
          </div>

          <RatingDistributionChart data={analytics.ratingDistribution} />
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No reviews yet. Click "Sync Reviews" to fetch reviews.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Author</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Sentiment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review: any) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">
                      {review.author}
                    </TableCell>
                    <TableCell>{review.rating} ⭐</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="font-medium">{review.title}</div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate text-sm text-muted-foreground">
                        {review.content}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(review.reviewDate)}
                    </TableCell>
                    <TableCell>{getSentimentBadge(review.rating)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

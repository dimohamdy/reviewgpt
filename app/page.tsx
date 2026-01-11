import { StatsCard } from "@/components/dashboard/stats-card";
import { RatingDistributionChart } from "@/components/dashboard/rating-distribution-chart";
import { ReviewsOverTimeChart } from "@/components/dashboard/reviews-over-time-chart";
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

async function getAnalytics() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/analytics`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch analytics");
    }

    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return null;
  }
}

async function getRecentReviews() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/reviews?limit=10`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch reviews");
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

export default async function Home() {
  const analytics = await getAnalytics();
  const recentReviews = await getRecentReviews();

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to ReviewGPT - AI-Powered Review Analytics
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No data available. Add your first app to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your app reviews and analytics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Reviews"
          value={analytics.totalReviews.toLocaleString()}
          icon="📝"
          description={`Across ${analytics.totalApps} app${analytics.totalApps !== 1 ? "s" : ""}`}
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
          description={`${analytics.sentiment.positive} positive reviews`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RatingDistributionChart data={analytics.ratingDistribution} />
        <ReviewsOverTimeChart data={analytics.reviewsOverTime} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {recentReviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No reviews yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Author</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Sentiment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentReviews.map((review: any) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">
                      {review.author}
                    </TableCell>
                    <TableCell>
                      {review.rating} ⭐
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {review.title}
                    </TableCell>
                    <TableCell>{formatDate(review.reviewDate)}</TableCell>
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

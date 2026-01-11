"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RatingDistributionChartProps {
  data: Array<{
    rating: number;
    count: number;
    percentage: number;
  }>;
}

export function RatingDistributionChart({
  data,
}: RatingDistributionChartProps) {
  const chartData = data.map((item) => ({
    rating: `${item.rating} ⭐`,
    count: item.count,
    percentage: item.percentage,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rating Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="rating" />
            <YAxis />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-muted-foreground">
                            {payload[0].payload.rating}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold">
                            {payload[0].value} reviews
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {payload[0].payload.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface ReviewsOverTimeChartProps {
  data: Array<{
    date: string;
    count: number;
    averageRating: number;
  }>;
}

export function ReviewsOverTimeChart({ data }: ReviewsOverTimeChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    formattedDate: format(new Date(item.date), "MMM dd"),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reviews Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="formattedDate" />
            <YAxis />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-muted-foreground">
                            {payload[0].payload.formattedDate}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm">Reviews:</span>
                          <span className="text-sm font-bold">
                            {payload[0].value}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm">Avg Rating:</span>
                          <span className="text-sm font-bold">
                            {payload[0].payload.averageRating.toFixed(1)} ⭐
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

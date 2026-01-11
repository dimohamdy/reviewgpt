import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
}

export function StatsCard({
  title,
  value,
  icon,
  description,
  trend,
}: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className="text-2xl">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <p className="text-xs text-muted-foreground mt-1">
            <span
              className={
                trend.value > 0 ? "text-green-600" : "text-red-600"
              }
            >
              {trend.value > 0 ? "+" : ""}
              {trend.value}
            </span>{" "}
            {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

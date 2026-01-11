"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AppCardProps {
  app: {
    id: number;
    name: string;
    platform: string;
    appId: string;
    country: string | null;
    status: string | null;
    totalReviews: number | null;
    averageRating: string | null;
    lastSyncedAt: string | null;
  };
}

export function AppCard({ app }: AppCardProps) {
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSync = async () => {
    setSyncing(true);

    try {
      const res = await fetch(`/api/apps/${app.id}/sync`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to sync app");
      }

      toast({
        title: "Sync Complete",
        description: `Fetched ${data.data.reviewsFetched} reviews, stored ${data.data.reviewsStored} new`,
      });

      router.refresh();
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${app.name}?`)) {
      return;
    }

    setDeleting(true);

    try {
      const res = await fetch(`/api/apps/${app.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete app");
      }

      toast({
        title: "App Deleted",
        description: "App and all reviews have been deleted",
      });

      router.refresh();
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{app.name}</h3>
            <p className="text-sm text-muted-foreground">{app.appId}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant={app.platform === "ios" ? "default" : "secondary"}>
              {app.platform === "ios" ? "📱 iOS" : "🤖 Android"}
            </Badge>
            <Badge
              variant={app.status === "active" ? "default" : "secondary"}
            >
              {app.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Reviews</p>
            <p className="text-2xl font-bold">{app.totalReviews || 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Average Rating</p>
            <p className="text-2xl font-bold">
              {app.averageRating ? parseFloat(app.averageRating).toFixed(1) : "N/A"} ⭐
            </p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground pt-2">
          Last synced: {formatDate(app.lastSyncedAt)}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleSync}
          disabled={syncing || deleting}
        >
          {syncing ? "Syncing..." : "Sync Reviews"}
        </Button>
        <Link href={`/apps/${app.id}`}>
          <Button variant="outline" size="sm">
            View Details
          </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={deleting}>
              •••
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
              {deleting ? "Deleting..." : "Delete App"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}

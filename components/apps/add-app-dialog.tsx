"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function AddAppDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    platform: "ios",
    appId: "",
    country: "us",
    ownedByMe: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/apps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create app");
      }

      toast({
        title: "Success",
        description: "App added successfully",
      });

      setOpen(false);
      setFormData({
        name: "",
        platform: "ios",
        appId: "",
        country: "us",
        ownedByMe: false,
      });

      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add App</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New App</DialogTitle>
          <DialogDescription>
            Add an app to start collecting and analyzing reviews
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              App Name
            </label>
            <Input
              id="name"
              placeholder="My Awesome App"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="platform" className="text-sm font-medium">
              Platform
            </label>
            <Select
              value={formData.platform}
              onValueChange={(value) =>
                setFormData({ ...formData, platform: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ios">iOS (App Store)</SelectItem>
                <SelectItem value="android">Android (Google Play)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="appId" className="text-sm font-medium">
              App ID
            </label>
            <Input
              id="appId"
              placeholder="123456789 (iOS) or com.example.app (Android)"
              value={formData.appId}
              onChange={(e) =>
                setFormData({ ...formData, appId: e.target.value })
              }
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.platform === "ios"
                ? "Find in App Store URL: apps.apple.com/app/idXXXXXXXXX"
                : "Find in Google Play URL: play.google.com/store/apps/details?id=XXXXX"}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="country" className="text-sm font-medium">
              Country Code
            </label>
            <Input
              id="country"
              placeholder="us"
              value={formData.country}
              onChange={(e) =>
                setFormData({ ...formData, country: e.target.value.toLowerCase() })
              }
              maxLength={2}
              required
            />
            <p className="text-xs text-muted-foreground">
              2-letter country code (e.g., us, uk, ca)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="ownedByMe"
              checked={formData.ownedByMe}
              onChange={(e) =>
                setFormData({ ...formData, ownedByMe: e.target.checked })
              }
              className="rounded"
            />
            <label htmlFor="ownedByMe" className="text-sm">
              I own this app (use App Store Connect API)
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add App"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

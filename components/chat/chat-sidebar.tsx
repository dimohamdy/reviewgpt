"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Review {
  id: number;
  author: string;
  rating: number;
  title: string;
  content: string;
  similarity?: number;
}

interface ChatSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviews: Review[];
  metadata?: {
    reviewCount: number;
    avgSimilarity: number;
    model: string;
    sentiment?: {
      positive: number;
      neutral: number;
      negative: number;
    };
    themes?: string[];
  };
}

export function ChatSidebar({
  open,
  onOpenChange,
  reviews,
  metadata,
}: ChatSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Context & Sources</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {metadata && (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Reviews Used:</span>
                  <span className="font-medium">{metadata.reviewCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg Relevance:</span>
                  <span className="font-medium">
                    {(metadata.avgSimilarity * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">AI Model:</span>
                  <span className="font-medium text-xs">{metadata.model}</span>
                </div>
                {metadata.themes && metadata.themes.length > 0 && (
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground mb-2">Key Themes:</p>
                    <div className="flex flex-wrap gap-1">
                      {metadata.themes.map((theme, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Retrieved Reviews</h3>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No reviews retrieved for this query
              </p>
            ) : (
              reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{review.author}</span>
                        <Badge variant="secondary" className="text-xs">
                          {review.rating} ⭐
                        </Badge>
                      </div>
                      {review.similarity && (
                        <span className="text-xs text-muted-foreground">
                          {(review.similarity * 100).toFixed(0)}% match
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium">{review.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {review.content}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

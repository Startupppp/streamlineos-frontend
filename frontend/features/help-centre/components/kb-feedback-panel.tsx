"use client";

import { format } from "date-fns";
import { Eye, MessageSquare, ThumbsDown, ThumbsUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyMailIllustration } from "@/components/illustrations";
import {
  useSupportKbArticleFeedback,
  type KbArticleDetail,
} from "@/hooks/api/support/kb";

export function KbFeedbackPanel({ article }: { article: KbArticleDetail }) {
  const feedbackQuery = useSupportKbArticleFeedback(article.id);
  const feedback = feedbackQuery.data ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" /> Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <StatCardGrid>
          <StatCard label="Views" value={article.views} icon={Eye} />
          <StatCard label="Helpful" value={article.helpfulCount} icon={ThumbsUp} tone="emerald" />
          <StatCard label="Not helpful" value={article.notHelpfulCount} icon={ThumbsDown} tone="red" />
        </StatCardGrid>

        {feedbackQuery.isLoading ? (
          <LoadingState variant="list" rows={8} />
        ) : feedback.length === 0 ? (
          <EmptyState
            illustration={<EmptyMailIllustration />}
            title="No feedback yet"
            description="Reader feedback will appear here."
            compact
          />
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {feedback.map((item) => (
              <div key={item.id} className="rounded-lg border border-border px-3 py-2">
                <div className="flex items-center justify-between">
                  <Badge
                    variant={item.helpful ? "default" : "secondary"}
                    className="text-micro"
                  >
                    {item.helpful ? "Helpful" : "Not helpful"}
                  </Badge>
                  {item.createdAt && (
                    <span className="text-dense text-muted-foreground">
                      {format(new Date(item.createdAt), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
                {item.comment && (
                  <p className="text-xs text-muted-foreground mt-1">{item.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

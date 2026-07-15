"use client";

import { format } from "date-fns";
import { Eye, MessageSquare, ThumbsDown, ThumbsUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyMailIllustration } from "@/components/illustrations";
import {
  useKbArticleFeedback,
  type KbArticleDetail,
} from "@/hooks/api/support/kb";

export function KbFeedbackPanel({ article }: { article: KbArticleDetail }) {
  const feedbackQuery = useKbArticleFeedback(article.id);
  const feedback = feedbackQuery.data ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" /> Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-border py-2">
            <p className="text-base font-semibold tabular-nums">{article.views}</p>
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
              <Eye className="h-3 w-3" /> Views
            </p>
          </div>
          <div className="rounded-lg border border-border py-2">
            <p className="text-base font-semibold tabular-nums text-emerald-600">
              {article.helpfulCount}
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
              <ThumbsUp className="h-3 w-3" /> Helpful
            </p>
          </div>
          <div className="rounded-lg border border-border py-2">
            <p className="text-base font-semibold tabular-nums text-red-600">
              {article.notHelpfulCount}
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
              <ThumbsDown className="h-3 w-3" /> Not helpful
            </p>
          </div>
        </div>

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
                    className="text-[10px]"
                  >
                    {item.helpful ? "Helpful" : "Not helpful"}
                  </Badge>
                  {item.createdAt && (
                    <span className="text-[11px] text-muted-foreground">
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

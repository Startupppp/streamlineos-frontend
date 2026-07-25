"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { CopyIcon } from "@animateicons/react/lucide";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAIGenerateReview } from "@/hooks/api/ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { useFeature } from "@/lib/billing/use-feature";

interface AIGenerateReviewButtonProps {
  userId: string;
  userName: string;
  periodStart: string;
  periodEnd: string;
}

export function AIGenerateReviewButton({ userId, userName, periodStart, periodEnd }: AIGenerateReviewButtonProps) {
  const [open, setOpen] = useState(false);
  const generateMutation = useAIGenerateReview();
  const result = generateMutation.data;
  const { enabled: featureEnabled, requiredPlan } = useFeature("ai.review-generation");

  const handleGenerate = () => {
    if (!featureEnabled) { toast.error(`AI review generation requires the ${requiredPlan ?? "PROFESSIONAL"} plan. Upgrade to unlock.`); return; }
    generateMutation.mutate(
      { userId, periodStart, periodEnd },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  };

  const copyAll = () => {
    if (!result) return;
    const text = `OVERALL: ${result.overallRating}/5

STRENGTHS:
${result.strengths}

AREAS FOR IMPROVEMENT:
${result.improvements}

COMMENTS:
${result.comments}

CATEGORY RATINGS:
${result.ratings.map((r) => `- ${r.category}: ${r.score}/5 — ${r.comment}`).join("\n")}`;
    navigator.clipboard.writeText(text);
    toast.success("Review copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI Draft Review
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl flex flex-col p-0 gap-0 max-h-[85dvh]">
        <DialogHeader className="shrink-0 px-5 pt-5 pb-3 border-b">
          <DialogTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Performance Review Draft
          </DialogTitle>
          <DialogDescription className="text-xs">
            For {userName} — {periodStart} to {periodEnd}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-4 space-y-4">
            {!result && (
              <LoadingButton
                onClick={handleGenerate}
                className="w-full"
                size="sm"
                isPending={generateMutation.isPending}
                loadingText="Drafting review..."
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Review Draft
              </LoadingButton>
            )}

            {result && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Overall Rating</p>
                    <p className="text-2xl font-bold text-foreground">{result.overallRating}/5</p>
                  </div>
                  <AnimatedIconButton size="sm" variant="outline" onClick={copyAll} icon={CopyIcon} iconSize={14} iconClassName="mr-1.5">
                    Copy All
                  </AnimatedIconButton>
                </div>

                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Strengths</p>
                  <p className="text-sm leading-snug">{result.strengths}</p>
                </div>

                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Areas for Improvement</p>
                  <p className="text-sm leading-snug">{result.improvements}</p>
                </div>

                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Overall Comments</p>
                  <p className="text-sm leading-snug">{result.comments}</p>
                </div>

                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Category Ratings</p>
                  <div className="space-y-2">
                    {result.ratings.map((r, i) => (
                      <div key={i} className="rounded-md border border-border bg-muted/20 p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{r.category}</span>
                          <Badge variant="secondary" className="text-[10px] h-5">{r.score}/5</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <LoadingButton
                  onClick={handleGenerate}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  isPending={generateMutation.isPending}
                  loadingText="Regenerating..."
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Regenerate
                </LoadingButton>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

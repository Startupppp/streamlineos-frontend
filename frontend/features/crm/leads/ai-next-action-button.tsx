"use client";

import { useState, useCallback } from "react";
import { Sparkles, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNextBestAction } from "@/hooks/api/ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { useFeature } from "@/lib/billing/use-feature";

interface AINextActionButtonProps {
  leadId: number;
  compact?: boolean;
}

export function AINextActionButton({
  leadId,
  compact,
}: AINextActionButtonProps) {
  const [open, setOpen] = useState(false);
  const actionMutation = useNextBestAction();
  const result = actionMutation.data;
  const { enabled: featureEnabled, requiredPlan } =
    useFeature("ai.next-action");

  const handleSuggest = useCallback(() => {
    if (!featureEnabled) {
      toast.error(
        `AI next-action suggestion requires the ${requiredPlan ?? "PROFESSIONAL"} plan. Upgrade to unlock.`,
      );
      return;
    }
    actionMutation.mutate(leadId, {
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [featureEnabled, requiredPlan, actionMutation, leadId]);

  const handleCompactClick = useCallback(() => {
    if (!result) handleSuggest();
  }, [result, handleSuggest]);

  const urgencyColor = (u: string) => {
    if (u === "critical") return "text-red-500";
    if (u === "high") return "text-orange-500";
    if (u === "medium") return "text-amber-500";
    return "text-emerald-500";
  };

  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={handleCompactClick}
            disabled={actionMutation.isPending}
          >
            {actionMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Zap className="h-3 w-3 text-primary" />
            )}
            Next Action
          </Button>
        </PopoverTrigger>
        {result && (
          <PopoverContent className="w-72 p-3" align="end">
            <ActionDetails result={result} urgencyColor={urgencyColor} />
          </PopoverContent>
        )}
      </Popover>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSuggest}
        disabled={actionMutation.isPending}
        className="w-full"
      >
        {actionMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Thinking...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2 text-primary" />
            Suggest Next Action
          </>
        )}
      </Button>
      {result && <ActionDetails result={result} urgencyColor={urgencyColor} />}
    </div>
  );
}

interface ActionResult {
  action: string;
  urgency: string;
  reasoning: string;
  template?: string;
}

function ActionDetails({
  result,
  urgencyColor,
}: {
  result: ActionResult;
  urgencyColor: (u: string) => string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Zap
          className={cn(
            "h-4 w-4 mt-0.5 shrink-0",
            urgencyColor(result.urgency),
          )}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{result.action}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge
              variant="secondary"
              className={cn(
                "text-[9px] h-4 px-1 capitalize",
                urgencyColor(result.urgency),
              )}
            >
              {result.urgency}
            </Badge>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">
        {result.reasoning}
      </p>
      {result.template && (
        <div className="rounded-md border border-border bg-muted/40 p-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Template
          </p>
          <p className="text-[11px] leading-snug whitespace-pre-wrap">
            {result.template}
          </p>
        </div>
      )}
    </div>
  );
}

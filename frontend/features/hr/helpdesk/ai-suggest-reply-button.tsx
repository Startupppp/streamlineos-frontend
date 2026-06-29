"use client";

import { useState, useCallback } from "react";
import { Sparkles, Loader2, Copy, Clock, Tag, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAISuggestHelpdeskReply } from "@/hooks/api/ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { useFeature } from "@/lib/billing/use-feature";
import { cn } from "@/lib/utils";

interface AISuggestReplyButtonProps {
  ticketId: number;
  compact?: boolean;
}

const NOT_CONFIGURED_PHRASES = ["not available", "not configured", "administrator", "openai"];

function isConfigurationError(message: string): boolean {
  const lower = message.toLowerCase();
  return NOT_CONFIGURED_PHRASES.some((p) => lower.includes(p));
}

export function AISuggestReplyButton({ ticketId, compact }: AISuggestReplyButtonProps) {
  const [open, setOpen] = useState(false);
  const suggestMutation = useAISuggestHelpdeskReply();
  const result = suggestMutation.data;
  const hasError = suggestMutation.isError;
  const { enabled: featureEnabled, requiredPlan } = useFeature("ai.reply-suggestion");

  const runSuggest = useCallback(() => {
    suggestMutation.mutate(ticketId, {
      onError: (e) => {
        const msg = getErrorMessage(e);
        if (isConfigurationError(msg)) {
          toast.info("AI reply generation is not configured for this workspace. Contact your administrator.");
        } else {
          toast.error(msg || "Failed to generate AI reply. Please try again.");
        }
      },
    });
  }, [suggestMutation, ticketId]);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!featureEnabled) {
      toast.error(`AI reply requires the ${requiredPlan ?? "PROFESSIONAL"} plan.`);
      return;
    }
    if (!result || hasError) {
      if (hasError) suggestMutation.reset();
      runSuggest();
    }
  }, [featureEnabled, requiredPlan, result, hasError, suggestMutation, runSuggest]);

  const handleRegenerate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    runSuggest();
  }, [runSuggest]);

  const handleCopyReply = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result.suggestedReply);
    toast.success("Reply copied to clipboard");
  }, [result]);

  const handlePopoverContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 transition-colors duration-200",
            compact ? "h-7 px-2 text-[11px]" : "h-8 text-xs",
            !featureEnabled && "opacity-50"
          )}
          onClick={handleButtonClick}
          disabled={suggestMutation.isPending}
          title={!featureEnabled ? `Requires ${requiredPlan ?? "PROFESSIONAL"} plan` : "Generate AI reply suggestion"}
        >
          {suggestMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          ) : hasError ? (
            <WifiOff className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Sparkles className="h-3 w-3 text-violet-500" />
          )}
          AI Reply
        </Button>
      </PopoverTrigger>
      {result && (
        <PopoverContent className="w-96 p-4" align="end" onClick={handlePopoverContentClick}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-xs font-semibold text-foreground">Suggested Reply</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 gap-1 text-[10px] transition-colors duration-200"
                  onClick={handleRegenerate}
                  disabled={suggestMutation.isPending}
                  title="Regenerate suggestion"
                >
                  {suggestMutation.isPending ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-2.5 w-2.5" />
                  )}
                  {!suggestMutation.isPending && "Retry"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 gap-1 text-[10px] transition-colors duration-200"
                  onClick={handleCopyReply}
                >
                  <Copy className="h-2.5 w-2.5" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs leading-relaxed whitespace-pre-wrap text-foreground">
                {result.suggestedReply}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800">
                <Tag className="h-2.5 w-2.5" />
                {result.category}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800">
                <Clock className="h-2.5 w-2.5" />
                {result.estimatedResolutionTime}
              </span>
            </div>

            {result.followUpActions.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Follow-up Actions
                </p>
                <ul className="space-y-1">
                  {result.followUpActions.map((a, i) => (
                    <li key={i} className="text-[11px] flex items-start gap-1.5 text-foreground/80">
                      <span className="text-violet-500 mt-0.5 shrink-0">→</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}

"use client";

import { useState, useCallback } from "react";
import { Sparkles, Loader2, Copy, Clock, Tag, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useAISuggestHelpdeskReply } from "@/lib/api/hooks/ai";
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(compact ? "h-7 px-2 text-xs gap-1" : "gap-1.5", !featureEnabled && "opacity-60")}
          onClick={handleButtonClick}
          disabled={suggestMutation.isPending}
          title={!featureEnabled ? `Requires ${requiredPlan ?? "PROFESSIONAL"} plan` : "Generate AI reply suggestion"}
        >
          {suggestMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : hasError ? (
            <WifiOff className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Sparkles className="h-3 w-3 text-blue-600" />
          )}
          AI Reply
        </Button>
      </PopoverTrigger>
      {result && (
        <PopoverContent className="w-96 p-3" align="end" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Suggested Reply</p>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px]"
                  onClick={handleRegenerate}
                  disabled={suggestMutation.isPending}
                  title="Regenerate suggestion"
                >
                  {suggestMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  {!suggestMutation.isPending && "Retry"}
                </Button>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={handleCopyReply}>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted/20 p-2.5">
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{result.suggestedReply}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Tag className="h-2.5 w-2.5" />
                {result.category}
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1">
                <Clock className="h-2.5 w-2.5" />
                {result.estimatedResolutionTime}
              </Badge>
            </div>

            {result.followUpActions.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Follow-up Actions</p>
                <ul className="space-y-0.5">
                  {result.followUpActions.map((a, i) => (
                    <li key={i} className="text-[11px] flex items-start gap-1.5">
                      <span className="text-blue-400 mt-0.5">→</span>
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

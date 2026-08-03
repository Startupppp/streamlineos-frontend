"use client";

import { useState, useCallback } from "react";
import {
  Sparkles,
  ChevronDown,
  RefreshCw,
  Reply,
  Users,
  GitBranch,
} from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PendingSuggestionCard, ResolvedSuggestionCard } from "./suggestion-card";
import {
  useTicketAiSuggestions,
  useAnalyzeTicket,
  useFindDuplicates,
  useSuggestKbArticles,
  useSuggestReply,
  useSuggestMacro,
  useGenerateHandoffSummary,
  useFindRootCauseCluster,
  useResolveAiSuggestion,
  type AiSuggestion,
} from "@/hooks/api/support/ai";
import { useSupportMacros } from "@/hooks/api/support/macros";
import { getErrorMessage } from "@/lib/get-error-message";

interface TicketAiPanelProps {
  ticketId: number;
  onInsertReply?: (body: string) => void;
  replyDraftContent?: string;
}

export function TicketAiPanel({ ticketId, onInsertReply, replyDraftContent }: TicketAiPanelProps) {
  const [open, setOpen] = useState(false);

  const { data: suggestions, isLoading } = useTicketAiSuggestions(ticketId);
  const { data: macros } = useSupportMacros();
  const analyzeTicket = useAnalyzeTicket(ticketId);
  const findDuplicates = useFindDuplicates(ticketId);
  const suggestKbArticles = useSuggestKbArticles(ticketId);
  const suggestReply = useSuggestReply(ticketId);
  const suggestMacro = useSuggestMacro(ticketId);
  const handoffSummary = useGenerateHandoffSummary(ticketId);
  const rootCauseCluster = useFindRootCauseCluster(ticketId);
  const resolveSuggestion = useResolveAiSuggestion(ticketId);

  const handleToggle = useCallback(() => setOpen((v) => !v), []);

  const handleRegenerate = useCallback(async () => {
    const results = await Promise.allSettled([
      analyzeTicket.mutateAsync(),
      findDuplicates.mutateAsync(),
      suggestKbArticles.mutateAsync(),
    ]);
    if (results.some((r) => r.status === "rejected")) {
      toast.error("Some insights could not be generated");
    } else {
      toast.success("Insights refreshed");
    }
  }, [analyzeTicket, findDuplicates, suggestKbArticles]);

  const handleSuggestReply = useCallback(() => {
    suggestReply.mutate(undefined, {
      onSuccess: (result) => { if (!result) toast.info("No reply suggestion available"); },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [suggestReply]);

  const handleSuggestMacro = useCallback(() => {
    suggestMacro.mutate(undefined, {
      onSuccess: (result) => { if (!result) toast.info("No macro suggestion available"); },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [suggestMacro]);

  const handleHandoffSummary = useCallback(() => {
    handoffSummary.mutate(undefined, {
      onSuccess: (result) => { if (!result) toast.info("No handoff summary available"); },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [handoffSummary]);

  const handleRootCauseCluster = useCallback(() => {
    rootCauseCluster.mutate(undefined, {
      onSuccess: (result) => { if (!result) toast.info("No related tickets found"); },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [rootCauseCluster]);

  const handleAccept = useCallback(
    (suggestion: AiSuggestion) => {
      resolveSuggestion.mutate(
        { suggestionId: suggestion.id, status: "accepted", feedback: "helpful" },
        {
          onSuccess: () => {
            switch (suggestion.type) {
              case "reply":
                onInsertReply?.(suggestion.payload.body);
                toast.success("Reply inserted into composer");
                return;
              case "macro": {
                const macro = (macros ?? []).find((m) => m.id === suggestion.payload.macroId);
                toast.success(macro ? `Suggested macro: ${macro.title}` : "Macro suggestion accepted");
                return;
              }
              case "priority":
                toast.success(`Priority applied: ${suggestion.payload.priority}`);
                return;
              case "category":
                toast.success(`Category applied: ${suggestion.payload.category}`);
                return;
              case "duplicate":
                toast.success(`Linked as duplicate of #${suggestion.payload.candidateTicketId}`);
                return;
              default:
                toast.success("Suggestion accepted");
            }
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [resolveSuggestion, onInsertReply, macros],
  );

  const handleReject = useCallback(
    (suggestionId: number) => {
      resolveSuggestion.mutate(
        { suggestionId, status: "rejected", feedback: "not_helpful" },
        {
          onSuccess: () => toast.success("Suggestion dismissed"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [resolveSuggestion],
  );

  const allSuggestions = suggestions ?? [];
  const pendingSuggestions = allSuggestions.filter((s) => s.status === "pending");
  const resolvedSuggestions = allSuggestions.filter((s) => s.status !== "pending");
  const isRegenerating = analyzeTicket.isPending || findDuplicates.isPending || suggestKbArticles.isPending;
  const macroList = macros ?? [];

  return (
    <div className="px-4 py-2 border-t border-border/40 shrink-0">
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5 w-full text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        AI Insights
        {pendingSuggestions.length > 0 && (
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
            {pendingSuggestions.length}
          </Badge>
        )}
        <ChevronDown className={cn("h-3.5 w-3.5 ml-auto transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-2 space-y-3 pb-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <LoadingButton type="button" variant="outline" size="sm" className="h-7 text-xs" isPending={isRegenerating} onClick={handleRegenerate}>
              {!isRegenerating && <RefreshCw className="h-3.5 w-3.5 mr-1" />}
              Regenerate insights
            </LoadingButton>
            <LoadingButton type="button" variant="ghost" size="sm" className="h-7 text-xs" isPending={suggestReply.isPending} onClick={handleSuggestReply}>
              {!suggestReply.isPending && <Reply className="h-3.5 w-3.5 mr-1" />}
              Suggest reply
            </LoadingButton>
            <LoadingButton type="button" variant="ghost" size="sm" className="h-7 text-xs" isPending={suggestMacro.isPending} onClick={handleSuggestMacro}>
              Suggest macro
            </LoadingButton>
            <LoadingButton type="button" variant="ghost" size="sm" className="h-7 text-xs" isPending={handoffSummary.isPending} onClick={handleHandoffSummary}>
              {!handoffSummary.isPending && <Users className="h-3.5 w-3.5 mr-1" />}
              Handoff summary
            </LoadingButton>
            <LoadingButton type="button" variant="ghost" size="sm" className="h-7 text-xs" isPending={rootCauseCluster.isPending} onClick={handleRootCauseCluster}>
              {!rootCauseCluster.isPending && <GitBranch className="h-3.5 w-3.5 mr-1" />}
              Find root cause
            </LoadingButton>
          </div>

          {isLoading ? (
            <div className="space-y-1.5">
              {[0, 1].map((i) => (
                <div key={i} className="h-8 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : allSuggestions.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              No AI insights yet. Click &quot;Regenerate insights&quot; to analyze this ticket.
            </p>
          ) : (
            <div className="space-y-2">
              {pendingSuggestions.map((suggestion) => (
                <PendingSuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  macros={macroList}
                  isResolvePending={resolveSuggestion.isPending}
                  ticketId={ticketId}
                  replyDraftContent={replyDraftContent}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onInsertReply={onInsertReply}
                />
              ))}
              {resolvedSuggestions.map((suggestion) => (
                <ResolvedSuggestionCard key={suggestion.id} suggestion={suggestion} macros={macroList} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

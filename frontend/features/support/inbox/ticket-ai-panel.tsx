"use client";

import { useState, useCallback } from "react";
import {
  Sparkles,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  Reply,
  Wand2,
  Loader2,
  Users,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ThumbsUpIcon, ThumbsDownIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import { useSupportMacros, type SupportMacro } from "@/hooks/api/support/macros";

interface TicketAiPanelProps {
  ticketId: number;
  onInsertReply?: (body: string) => void;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled AI suggestion case: ${JSON.stringify(value)}`);
}

function formatConfidence(confidence: string | null): string | null {
  if (confidence === null) return null;
  const parsed = Number(confidence);
  if (Number.isNaN(parsed)) return null;
  return `${Math.round(parsed * 100)}%`;
}

function suggestionTypeLabel(type: AiSuggestion["type"]): string {
  switch (type) {
    case "summary":
      return "Summary";
    case "sentiment":
      return "Sentiment";
    case "category":
      return "Category";
    case "priority":
      return "Priority";
    case "spam":
      return "Spam warning";
    case "reply":
      return "Suggested reply";
    case "macro":
      return "Suggested macro";
    case "kb_article":
      return "Related KB articles";
    case "duplicate":
      return "Possible duplicate";
    case "handoff_summary":
      return "Handoff summary";
    case "root_cause_cluster":
      return "Root cause cluster";
    default:
      return assertNever(type);
  }
}

function acceptLabel(suggestion: AiSuggestion): string {
  switch (suggestion.type) {
    case "priority":
      return `Apply priority: ${suggestion.payload.priority}`;
    case "category":
      return `Apply category: ${suggestion.payload.category}`;
    case "sentiment":
      return "Accept sentiment";
    case "summary":
      return "Accept summary";
    case "spam":
      return "Confirm spam";
    case "reply":
      return "Insert into reply";
    case "macro":
      return "Acknowledge macro suggestion";
    case "kb_article":
      return "Accept KB suggestions";
    case "duplicate":
      return "Link as duplicate";
    case "handoff_summary":
      return "Acknowledge summary";
    case "root_cause_cluster":
      return "Acknowledge root cause";
    default:
      return assertNever(suggestion);
  }
}

interface SuggestionBodyProps {
  suggestion: AiSuggestion;
  macros: SupportMacro[];
}

function SuggestionBody({ suggestion, macros }: SuggestionBodyProps) {
  switch (suggestion.type) {
    case "summary":
      return (
        <p className="text-[12px] text-foreground/90 whitespace-pre-wrap">{suggestion.payload.text}</p>
      );
    case "sentiment":
      return (
        <Badge variant="outline" className="text-[10px] capitalize">
          {suggestion.payload.sentiment}
        </Badge>
      );
    case "category":
      return (
        <Badge variant="outline" className="text-[10px]">
          {suggestion.payload.category}
        </Badge>
      );
    case "priority":
      return (
        <Badge variant="outline" className="text-[10px]">
          {suggestion.payload.priority}
        </Badge>
      );
    case "spam":
      return (
        <div className="flex items-center gap-1.5 text-[12px] text-red-700 dark:text-red-400 bg-destructive/10 rounded px-2 py-1">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Flagged as likely spam
        </div>
      );
    case "reply":
      return (
        <p className="text-[12px] text-foreground/90 whitespace-pre-wrap line-clamp-6">
          {suggestion.payload.body}
        </p>
      );
    case "macro": {
      const macro = macros.find((m) => m.id === suggestion.payload.macroId);
      return (
        <p className="text-[12px] text-foreground/90">
          {macro ? `${macro.title} — ` : ""}
          {suggestion.payload.reason}
        </p>
      );
    }
    case "kb_article":
      return (
        <ul className="space-y-1">
          {suggestion.payload.articles.map((article) => (
            <li key={article.articleId} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="truncate">{article.title}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {Math.round(article.similarity * 100)}%
              </span>
            </li>
          ))}
        </ul>
      );
    case "duplicate":
      return (
        <p className="text-[12px] text-foreground/90">
          Ticket #{suggestion.payload.candidateTicketId} — {suggestion.payload.title}
        </p>
      );
    case "handoff_summary":
      return (
        <div className="space-y-1.5">
          <p className="text-[12px] text-foreground/90 whitespace-pre-wrap">{suggestion.payload.summary}</p>
          {suggestion.payload.keyPoints.length > 0 && (
            <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5">
              {suggestion.payload.keyPoints.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          )}
          <p className="text-[11px] font-medium text-foreground/80">
            Next step: {suggestion.payload.suggestedNextStep}
          </p>
        </div>
      );
    case "root_cause_cluster":
      return (
        <div className="space-y-1">
          <p className="text-[12px] font-medium text-foreground/90">{suggestion.payload.rootCause}</p>
          <p className="text-[11px] text-muted-foreground">{suggestion.payload.summary}</p>
          <p className="text-[11px] text-muted-foreground">
            Related: {suggestion.payload.relatedTicketIds.map((id) => `#${id}`).join(", ")}
          </p>
        </div>
      );
    default:
      return assertNever(suggestion);
  }
}

export function TicketAiPanel({ ticketId, onInsertReply }: TicketAiPanelProps) {
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
    if (results.some((result) => result.status === "rejected")) {
      toast.error("Some insights could not be generated");
    } else {
      toast.success("Insights refreshed");
    }
  }, [analyzeTicket, findDuplicates, suggestKbArticles]);

  const handleSuggestReply = useCallback(() => {
    suggestReply.mutate(undefined, {
      onSuccess: (result) => {
        if (!result) toast.info("No reply suggestion available");
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to suggest a reply"),
    });
  }, [suggestReply]);

  const handleSuggestMacro = useCallback(() => {
    suggestMacro.mutate(undefined, {
      onSuccess: (result) => {
        if (!result) toast.info("No macro suggestion available");
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to suggest a macro"),
    });
  }, [suggestMacro]);

  const handleHandoffSummary = useCallback(() => {
    handoffSummary.mutate(undefined, {
      onSuccess: (result) => {
        if (!result) toast.info("No handoff summary available");
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to generate handoff summary"),
    });
  }, [handoffSummary]);

  const handleRootCauseCluster = useCallback(() => {
    rootCauseCluster.mutate(undefined, {
      onSuccess: (result) => {
        if (!result) toast.info("No related tickets found");
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to find root cause"),
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
              case "summary":
              case "sentiment":
              case "spam":
              case "kb_article":
              case "handoff_summary":
              case "root_cause_cluster":
                toast.success("Suggestion accepted");
                return;
              default:
                assertNever(suggestion);
            }
          },
          onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to accept suggestion"),
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
          onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to dismiss suggestion"),
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={isRegenerating}
              onClick={handleRegenerate}
            >
              {isRegenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
              )}
              Regenerate insights
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={suggestReply.isPending}
              onClick={handleSuggestReply}
            >
              {suggestReply.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Reply className="h-3.5 w-3.5 mr-1" />
              )}
              Suggest reply
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={suggestMacro.isPending}
              onClick={handleSuggestMacro}
            >
              {suggestMacro.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Wand2 className="h-3.5 w-3.5 mr-1" />
              )}
              Suggest macro
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={handoffSummary.isPending}
              onClick={handleHandoffSummary}
            >
              {handoffSummary.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Users className="h-3.5 w-3.5 mr-1" />
              )}
              Handoff summary
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={rootCauseCluster.isPending}
              onClick={handleRootCauseCluster}
            >
              {rootCauseCluster.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <GitBranch className="h-3.5 w-3.5 mr-1" />
              )}
              Find root cause
            </Button>
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
                <div key={suggestion.id} className="rounded-md border border-border/60 p-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      {suggestionTypeLabel(suggestion.type)}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {formatConfidence(suggestion.confidence) && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatConfidence(suggestion.confidence)}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                        aria-label={`Helpful — ${acceptLabel(suggestion)}`}
                        title={`Helpful — ${acceptLabel(suggestion)}`}
                        disabled={resolveSuggestion.isPending}
                        onClick={() => handleAccept(suggestion)}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        aria-label="Not helpful — dismiss suggestion"
                        title="Not helpful — dismiss suggestion"
                        disabled={resolveSuggestion.isPending}
                        onClick={() => handleReject(suggestion.id)}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <SuggestionBody suggestion={suggestion} macros={macroList} />
                </div>
              ))}

              {resolvedSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="rounded-md border border-border/30 bg-muted/30 p-2 space-y-1 opacity-70"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      {suggestionTypeLabel(suggestion.type)}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {suggestion.feedback && (
                        suggestion.feedback === "helpful" ? (
                          <ThumbsUp className="h-3 w-3 text-green-600" aria-label="Marked helpful" />
                        ) : (
                          <ThumbsDown className="h-3 w-3 text-red-600" aria-label="Marked not helpful" />
                        )
                      )}
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize">
                        {suggestion.status}
                      </Badge>
                    </div>
                  </div>
                  <SuggestionBody suggestion={suggestion} macros={macroList} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

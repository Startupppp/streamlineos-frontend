"use client";

import { memo, useCallback } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { CheckIcon, XIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import {
  useAcceptDealCompetitorSuggestion,
  useDealCompetitorSuggestions,
  useDismissDealCompetitorSuggestion,
  useScanDealCompetitorSuggestions,
} from "@/hooks/api/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import type { DealCompetitorSuggestion } from "@/types/crm";


interface DealCompetitorSuggestionsProps {
  dealId: number;
}

interface SuggestionRowProps {
  suggestion: DealCompetitorSuggestion;
  canDecide: boolean;
  isDeciding: boolean;
  onAccept: (suggestion: DealCompetitorSuggestion) => void;
  onDismiss: (suggestion: DealCompetitorSuggestion) => void;
}

const SuggestionRow = memo(function SuggestionRow({
  suggestion,
  canDecide,
  isDeciding,
  onAccept,
  onDismiss,
}: SuggestionRowProps) {
  const handleAccept = useCallback(() => onAccept(suggestion), [onAccept, suggestion]);
  const handleDismiss = useCallback(() => onDismiss(suggestion), [onDismiss, suggestion]);

  return (
    <div className="rounded-md border border-border/70 bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <Badge variant="outline" className="text-xs">
          {suggestion.competitorKey}
        </Badge>
        {canDecide ? (
          <div className="flex shrink-0 items-center gap-1">
            <AnimatedIconButton
              icon={CheckIcon}
              iconSize={14}
              variant="ghost"
              size="icon"
              className="w-7"
              aria-label={`Track ${suggestion.competitorKey} as a competitor`}
              disabled={isDeciding}
              onClick={handleAccept}
            />
            <AnimatedIconButton
              icon={XIcon}
              iconSize={14}
              variant="ghost"
              size="icon"
              className="w-7"
              aria-label={`Dismiss ${suggestion.competitorKey}`}
              disabled={isDeciding}
              onClick={handleDismiss}
            />
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        &ldquo;{suggestion.evidenceQuote}&rdquo;
      </p>
    </div>
  );
});

export function DealCompetitorSuggestions({ dealId }: DealCompetitorSuggestionsProps) {
  const canDecide = useCan("crm:deals:update");
  const { data: suggestions = [], access } = useDealCompetitorSuggestions(dealId);
  const scan = useScanDealCompetitorSuggestions(dealId);
  const accept = useAcceptDealCompetitorSuggestion(dealId);
  const dismiss = useDismissDealCompetitorSuggestion(dealId);

  const handleScan = useCallback(() => {
    scan.mutate(undefined, {
      onSuccess: (result) => {
        if (result.proposed > 0) {
          toast.success(
            `${result.proposed} competitor ${result.proposed === 1 ? "mention" : "mentions"} found for review`,
          );
          return;
        }
        toast.success(
          result.vocabularySize === 0
            ? "No competitor list to match against yet — add competitors in CRM settings."
            : "Nothing new found in this deal's recent activity.",
        );
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [scan]);

  const handleAccept = useCallback(
    (suggestion: DealCompetitorSuggestion) => {
      accept.mutate(
        {
          suggestionId: suggestion.competitorSuggestionId,
          confirmedCompetitorKey: suggestion.competitorKey,
        },
        {
          onSuccess: () => toast.success(`${suggestion.competitorKey} is now tracked`),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [accept],
  );

  const handleDismiss = useCallback(
    (suggestion: DealCompetitorSuggestion) => {
      dismiss.mutate(
        { suggestionId: suggestion.competitorSuggestionId },
        {
          onSuccess: () => toast.success(`${suggestion.competitorKey} dismissed`),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [dismiss],
  );

  if (access.denied) return null;
  if (suggestions.length === 0 && !canDecide) return null;

  return (
    <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Suggested from activity
        </p>
        {canDecide ? (
          <LoadingButton
            variant="outline"
            size="sm"
            isPending={scan.isPending}
            onClick={handleScan}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Scan activity
          </LoadingButton>
        ) : null}
      </div>

      {suggestions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nothing suggested. Scanning reads this deal&rsquo;s recent activity for
          competitors your organisation already tracks — it never adds one for you.
        </p>
      ) : (
        suggestions.map((suggestion) => (
          <SuggestionRow
            key={suggestion.competitorSuggestionId}
            suggestion={suggestion}
            canDecide={canDecide}
            isDeciding={accept.isPending || dismiss.isPending}
            onAccept={handleAccept}
            onDismiss={handleDismiss}
          />
        ))
      )}
    </div>
  );
}

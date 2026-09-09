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

/**
 * CRM-P2-12. Competitors the system noticed, and the person who decides.
 *
 * Rendered under the tracked list rather than mixed into it, which is the same
 * separation the API and the database make: the list above is what somebody
 * stated, this is what nobody has ruled on. A reader glancing at the card must
 * never have to work out which of the two a row belongs to.
 *
 * The scan is a button and never an effect. A `useEffect` firing it on mount
 * would make the product propose things nobody asked for every time a deal is
 * opened, which is precisely the autonomy this ticket refuses — and it would
 * write rows on a read.
 */

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

/**
 * One proposal, with the line that produced it.
 *
 * The quote is not decoration and is not truncated away: it is the only thing
 * that lets a reviewer tell a real competitor from a name that happened to
 * appear in a sentence, and a card that hid it would be asking for a rubber
 * stamp.
 */
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

  /**
   * The name is sent back with the decision, so the server can refuse a click
   * made against a card that has moved on. Accepting by id alone is what turns a
   * suggestion into something a person did not actually agree to.
   */
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

  /** Nothing to review and nothing to offer: the card stays as short as the facts. */
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

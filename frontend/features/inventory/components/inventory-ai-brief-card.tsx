"use client";

import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { AiGeneratedLabel } from "@/components/ai/ai-generated-label";
import { AiSuggestedActions } from "@/features/inventory/components/ai-suggested-actions";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useNarrateOpsBrief,
  useOpsBrief,
  type OpsBriefSeverity,
  type OpsBriefSignal,
} from "@/hooks/api/inventory/ops-brief";

const SEVERITY_DOT: Record<OpsBriefSeverity, string> = {
  high: "bg-status-danger-fill",
  medium: "bg-status-warning-fill",
  low: "bg-status-info-fill",
  none: "bg-muted-foreground/40",
};

function SignalLink({ signal }: { signal: OpsBriefSignal }) {
  return (
    <Link
      href={signal.href}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-micro text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[signal.severity]}`} aria-hidden="true" />
      {signal.label} · {signal.count}
      <ArrowRight className="h-2.5 w-2.5" aria-hidden="true" />
    </Link>
  );
}

/**
 * INV-101 — the Operations Brief.
 *
 * Two halves with different costs, and the card keeps them visibly apart. The
 * signal counts are deterministic and free, so they are here as soon as the
 * dashboard is; the narrative spends credits and happens only when somebody
 * presses the button. The previous version showed nothing at all until you
 * pressed it, which meant the cheap half was gated behind the expensive one.
 *
 * Every route comes from the server alongside the count it belongs to. A second
 * copy of that map on the client is a copy that drifts.
 */
export function InventoryAiBriefCard() {
  const canView = useCan("inventory:reports:read");
  const brief = useOpsBrief();
  const narrate = useNarrateOpsBrief();

  const shown = narrate.data?.brief ?? brief.data;
  const narration = narrate.data?.narration;

  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Inventory operations brief
          <AiGeneratedLabel />
        </CardTitle>
        {canView ? (
          <CardAction>
            <LoadingButton
              type="button"
              variant="outline"
              size="sm"
              isPending={narrate.isPending}
              loadingText="Reading…"
              disabled={brief.isLoading}
              onClick={() => narrate.mutate()}
            >
              {narrate.isSuccess ? "Refresh narrative" : "Explain this"}
            </LoadingButton>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-3 pt-3">
        {!canView ? (
          // Denial, not emptiness. "No signals" and "you may not see the
          // signals" are different facts and must not render the same.
          <p className="text-sm text-muted-foreground">
            You do not have access to inventory reports, so this brief is hidden.
            Ask an inventory admin for the <code className="text-micro">inventory:reports:read</code> permission.
          </p>
        ) : brief.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : brief.error ? (
          <ErrorState
            compact
            title="Signals unavailable"
            description={getErrorMessage(brief.error)}
            onRetry={() => void brief.refetch()}
          />
        ) : shown ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-micro bg-primary/5">
                {shown.totalSignals} open signal{shown.totalSignals === 1 ? "" : "s"}
              </Badge>
              {shown.signals
                .filter((signal) => signal.count > 0)
                .map((signal) => (
                  <SignalLink key={signal.key} signal={signal} />
                ))}
            </div>

            {shown.totalSignals === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open inventory signals right now.
              </p>
            ) : null}

            {narrate.error ? (
              // The provider failing must not take the deterministic counts
              // above down with it -- they are still true.
              <ErrorState
                compact
                title="Narrative unavailable"
                description={getErrorMessage(narrate.error)}
                onRetry={() => narrate.mutate()}
              />
            ) : null}

            {narration ? (
              <div className="space-y-2">
                <p className="max-w-3xl text-sm leading-relaxed text-foreground">
                  {narration.explanation}
                </p>
                <AiSuggestedActions actions={narration.actions} />
              </div>
            ) : null}

            <p className="text-micro text-muted-foreground">
              Counts computed {new Date(shown.generatedAt).toLocaleString()} from
              deterministic inventory reports.
              {narration ? ` Narrative by ${narration.provenance.model}.` : ""}
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

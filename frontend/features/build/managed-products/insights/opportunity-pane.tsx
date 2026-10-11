"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { useOpportunity, useOpportunityTrace } from "@/hooks/api/build/product-discovery";
import {
  useAcceptOpportunity,
  useDeclineOpportunity,
  useOverrideOpportunityScore,
  useScoreOpportunity,
} from "@/hooks/api/build/product-discovery-mutations";
import { OpportunityTrace } from "./opportunity-trace";
import { OpportunityAcceptDialog } from "./opportunity-accept-dialog";
import { OpportunityDeclineDialog, OpportunityOverrideDialog } from "./opportunity-override-dialog";
import { OpportunityScoreDialog } from "./opportunity-rice-form";
import { OpportunityPaneActions } from "./opportunity-pane-actions";
import type { AcceptOpportunityInput } from "@/hooks/api/build/product-discovery-mutations";
import type { DeclineFormValues, OverrideFormValues, RiceFormValues } from "./opportunity-rice-schema";

interface OpportunityPaneProps {
  managedProductId: number;
  opportunityId: number | null;
  onClose: () => void;
}

export function OpportunityPane({
  managedProductId,
  opportunityId,
  onClose,
}: OpportunityPaneProps) {
  const canWrite = useCan("build:managed-products:update");
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "trace">("details");

  const { data: opportunity, isLoading, isError, error } = useOpportunity(
    managedProductId,
    opportunityId ?? 0,
  );
  const { data: trace } = useOpportunityTrace(
    managedProductId,
    activeTab === "trace" ? (opportunityId ?? 0) : 0,
  );

  const acceptMutation = useAcceptOpportunity(managedProductId);
  const declineMutation = useDeclineOpportunity(managedProductId);
  const overrideMutation = useOverrideOpportunityScore(managedProductId);
  const scoreMutation = useScoreOpportunity(managedProductId);

  const handleAccept = useCallback(
    (data: AcceptOpportunityInput) => {
      if (!opportunityId) return;
      acceptMutation.mutate(
        { opportunityId, ...data },
        {
          onSuccess: () => {
            toast.success("Opportunity accepted and roadmap item created.");
            setAcceptOpen(false);
            onClose();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [opportunityId, acceptMutation, onClose],
  );

  const handleDecline = useCallback(
    (values: DeclineFormValues) => {
      if (!opportunityId || !opportunity) return;
      declineMutation.mutate(
        { opportunityId, note: values.note, expectedVersion: opportunity.version },
        {
          onSuccess: () => {
            toast.success("Opportunity declined.");
            setDeclineOpen(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [opportunityId, opportunity, declineMutation],
  );

  const handleScore = useCallback(
    (values: RiceFormValues) => {
      if (!opportunityId) return;
      scoreMutation.mutate(
        {
          opportunityId,
          reach: Number(values.reach),
          reachPeriod: values.reachPeriod,
          reachUnit: values.reachUnit?.trim() || undefined,
          impact: String(values.impact),
          confidence: values.confidence,
          effort: values.effort,
          effortUnit: values.effortUnit,
          expectedScoreVersion: values.expectedScoreVersion,
        },
        {
          onSuccess: () => {
            toast.success("Score saved.");
            setScoreOpen(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [opportunityId, scoreMutation],
  );

  const handleOpenScore = useCallback(() => setScoreOpen(true), []);
  const handleOpenAccept = useCallback(() => setAcceptOpen(true), []);
  const handleOpenOverride = useCallback(() => setOverrideOpen(true), []);
  const handleOpenDecline = useCallback(() => setDeclineOpen(true), []);

  const handleOverride = useCallback(
    (values: OverrideFormValues) => {
      if (!opportunityId) return;
      overrideMutation.mutate(
        { opportunityId, ...values },
        {
          onSuccess: () => {
            toast.success("Score override saved.");
            setOverrideOpen(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [opportunityId, overrideMutation],
  );

  const handleTabDetails = useCallback(() => setActiveTab("details"), []);
  const handleTabTrace = useCallback(() => setActiveTab("trace"), []);

  const isOpen = opportunityId !== null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="w-full max-w-2xl p-0 flex flex-col sm:max-w-2xl"
        >
          <SheetHeader className="border-b border-border p-4 pb-3">
            <SheetTitle className="truncate text-base">
              {isLoading ? "Loading…" : (opportunity?.title ?? "Opportunity")}
            </SheetTitle>
            <div className="mt-3 inline-flex h-9 items-center gap-1 rounded-lg border border-input bg-card p-1">
              <button
                type="button"
                className={`h-7 rounded-md px-3 text-sm font-medium transition-colors ${activeTab === "details" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={handleTabDetails}
                aria-pressed={activeTab === "details"}
              >
                Details
              </button>
              <button
                type="button"
                className={`h-7 rounded-md px-3 text-sm font-medium transition-colors ${activeTab === "trace" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={handleTabTrace}
                aria-pressed={activeTab === "trace"}
                data-testid="trace-tab-btn"
              >
                Trace
              </button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-auto p-4">
            {isLoading && (
              <p className="text-sm text-muted-foreground">Loading opportunity…</p>
            )}

            {isError && (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <p className="text-sm font-medium text-foreground">Could not load opportunity</p>
                <p className="text-xs text-muted-foreground">{getErrorMessage(error)}</p>
              </div>
            )}

            {!isLoading && !isError && opportunity && activeTab === "details" && (
              <div className="space-y-4">
                {opportunity.problem && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Problem</p>
                    <p className="text-sm text-foreground">{opportunity.problem}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {opportunity.theme && (
                    <Badge variant="secondary">{opportunity.theme}</Badge>
                  )}
                  {opportunity.affectedSegment && (
                    <Badge variant="outline">{opportunity.affectedSegment}</Badge>
                  )}
                  <Badge variant="outline" className="capitalize">{opportunity.state}</Badge>
                </div>

                <div className="space-y-1 rounded-xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground">RICE score</p>
                  <p className="text-2xl font-semibold tabular-nums text-foreground">
                    {opportunity.scoreStatus === "unscored"
                      ? "Unscored"
                      : (opportunity.latestScore?.effectiveScore ?? "—")}
                  </p>
                  {opportunity.latestScore?.isOverride && (
                    <p className="text-xs text-status-warning-ink-strong">
                      Overridden — {opportunity.latestScore.overrideReason}
                    </p>
                  )}
                </div>

                {canWrite && (
                  <OpportunityPaneActions
                    allowedActions={opportunity.allowedActions}
                    onAccept={handleOpenAccept}
                    onDecline={handleOpenDecline}
                    onScore={handleOpenScore}
                    onOverride={handleOpenOverride}
                  />
                )}
              </div>
            )}

            {!isLoading && opportunity && activeTab === "trace" && (
              trace ? (
                <OpportunityTrace managedProductId={managedProductId} trace={trace} />
              ) : (
                <p className="text-sm text-muted-foreground">Loading trace…</p>
              )
            )}
          </div>
        </SheetContent>
      </Sheet>

      {opportunity && (
        <>
          <OpportunityAcceptDialog
            open={acceptOpen}
            onOpenChange={setAcceptOpen}
            opportunityTitle={opportunity.title}
            expectedVersion={opportunity.version}
            managedProductId={managedProductId}
            isSubmitting={acceptMutation.isPending}
            onAccept={handleAccept}
          />
          <OpportunityOverrideDialog
            open={overrideOpen}
            onOpenChange={setOverrideOpen}
            expectedScoreVersion={opportunity.latestScore?.scoreVersion ?? 0}
            isSubmitting={overrideMutation.isPending}
            onOverride={handleOverride}
          />
          <OpportunityScoreDialog
            open={scoreOpen}
            onOpenChange={setScoreOpen}
            expectedScoreVersion={opportunity.latestScore?.scoreVersion ?? 0}
            isSubmitting={scoreMutation.isPending}
            onScore={handleScore}
          />
          <OpportunityDeclineDialog
            open={declineOpen}
            onOpenChange={setDeclineOpen}
            isSubmitting={declineMutation.isPending}
            onDecline={handleDecline}
          />
        </>
      )}
    </>
  );
}

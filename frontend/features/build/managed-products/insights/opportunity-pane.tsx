"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { CheckCircle2, GitBranch, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { OpportunityOverrideDialog } from "./opportunity-override-dialog";
import type { AcceptOpportunityInput } from "@/hooks/api/build/product-discovery-mutations";
import type { OverrideFormValues } from "./opportunity-rice-schema";

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
  const [activeTab, setActiveTab] = useState<"details" | "trace">("details");

  const { data: opportunity, isLoading } = useOpportunity(
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
  const _scoreMutation = useScoreOpportunity(managedProductId);

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

  const handleDecline = useCallback(() => {
    if (!opportunityId || !opportunity) return;
    declineMutation.mutate(
      { opportunityId, note: "", expectedVersion: opportunity.version },
      {
        onSuccess: () => {
          toast.success("Opportunity declined.");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [opportunityId, opportunity, declineMutation]);

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
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                className={`text-sm px-3 py-1 rounded-md transition-colors ${activeTab === "details" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={handleTabDetails}
                aria-pressed={activeTab === "details"}
              >
                Details
              </button>
              <button
                type="button"
                className={`text-sm px-3 py-1 rounded-md transition-colors ${activeTab === "trace" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
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

            {!isLoading && opportunity && activeTab === "details" && (
              <div className="space-y-4">
                {opportunity.problem && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Problem</p>
                    <p className="text-sm text-foreground">{opportunity.problem}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {opportunity.theme && (
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                      {opportunity.theme}
                    </span>
                  )}
                  {opportunity.affectedSegment && (
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                      {opportunity.affectedSegment}
                    </span>
                  )}
                  <span className="rounded-full border border-border px-2.5 py-1 text-xs capitalize text-muted-foreground">
                    {opportunity.state}
                  </span>
                </div>

                <div className="rounded-xl border border-border p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">RICE score</p>
                  <p className="text-lg font-bold font-mono tabular-nums text-foreground">
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
                  <div className="flex flex-wrap gap-2">
                    {opportunity.allowedActions.includes("accept") && (
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => setAcceptOpen(true)}
                        data-testid="accept-opportunity-btn"
                      >
                        <CheckCircle2 className="size-3.5 mr-1" aria-hidden />
                        Accept
                      </Button>
                    )}
                    {opportunity.allowedActions.includes("decline") && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDecline}
                        data-testid="decline-opportunity-btn"
                      >
                        <XCircle className="size-3.5 mr-1" aria-hidden />
                        Decline
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setOverrideOpen(true)}
                      data-testid="override-score-btn"
                    >
                      <GitBranch className="size-3.5 mr-1" aria-hidden />
                      Override score
                    </Button>
                  </div>
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
        </>
      )}
    </>
  );
}

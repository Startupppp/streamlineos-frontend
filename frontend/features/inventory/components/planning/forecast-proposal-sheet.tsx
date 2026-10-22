"use client";

import { memo } from "react";
import { AppSheet, ErrorState, NoPermissionState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { useForecastReorderProposal } from "@/hooks/api/inventory/planning";
import type {
  BatchableProposal,
  ProposalOverrideInput,
} from "@/hooks/api/inventory/replenishment-planning";
import { DemandBaselineNote } from "./demand-baseline-note";
import { ForecastProposalDetail } from "./forecast-proposal-detail";
import { ReorderProposalPanel } from "./reorder-proposal-panel";
import { formatQuantity } from "./forecast-format";

const ProposalSkeleton = memo(function ProposalSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 rounded-xl" />
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-12 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-md" />
      <Skeleton className="h-24 rounded-md" />
    </div>
  );
});

interface QuantityRowProps {
  label: string;
  value: string;
  note?: string;
  emphasis?: boolean;
}

function QuantityRow({ label, value, note, emphasis }: QuantityRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-dense font-medium">{label}</p>
        {note ? <p className="text-micro text-muted-foreground">{note}</p> : null}
      </div>
      <span
        className={
          emphasis
            ? "font-mono text-sm font-semibold tabular-nums text-primary"
            : "font-mono text-sm tabular-nums text-muted-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}

interface ForecastProposalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: BatchableProposal | null;
  override: ProposalOverrideInput | null;
}

export const ForecastProposalSheet = memo(function ForecastProposalSheet({
  open,
  onOpenChange,
  proposal,
  override,
}: ForecastProposalSheetProps) {
  const canManage = useCan("inventory:replenishment:manage");
  const productVariantId = proposal?.productVariantId ?? null;
  const proposalQuery = useForecastReorderProposal(productVariantId, { enabled: open });

  function handleClose(): void {
    onOpenChange(false);
  }

  function handleRetry(): void {
    void proposalQuery.refetch();
  }

  const footer = (
    <Button variant="outline" className="w-full" onClick={handleClose}>
      Close
    </Button>
  );

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Reorder proposal"
      description={
        proposal ? `${proposal.productName} · ${proposal.variantSku}` : "No proposal selected"
      }
      footer={footer}
      className="sm:max-w-xl"
    >
      {!canManage ? (
        <NoPermissionState
          permission="inventory:replenishment:manage"
          title="Reorder proposals are restricted"
          description="The forecast engine's proposals need replenishment access. Nothing is hidden here — you simply cannot read it."
        />
      ) : proposal === null ? null : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
            <QuantityRow
              label="Engine quantity"
              value={formatQuantity(proposal.suggestedQuantity)}
              note="Re-derived from the recorded reorder point against today's position, then put through the supplier's minimum and pack size."
              emphasis={override === null}
            />
            {override !== null ? (
              <>
                <div className="border-t border-border/60" />
                <QuantityRow
                  label="Override"
                  value={formatQuantity(override.quantity)}
                  note={override.reason}
                  emphasis
                />
                <Badge
                  variant="outline"
                  className="mt-1 h-5 px-2 py-0.5 text-micro border-primary/40 text-primary"
                >
                  Recorded against the purchase order when it is raised
                </Badge>
              </>
            ) : null}
            {proposal.blockedReason !== null ? (
              <p className="mt-2 text-dense leading-relaxed text-muted-foreground">
                {proposal.blockedReason}
              </p>
            ) : null}
          </div>

          {proposalQuery.isLoading ? (
            <ProposalSkeleton />
          ) : proposalQuery.isError ? (
            <ErrorState
              compact
              title="Could not read the working"
              description={getErrorMessage(proposalQuery.error)}
              onRetry={handleRetry}
            />
          ) : proposalQuery.data ? (
            <>
              <ForecastProposalDetail proposal={proposalQuery.data} />
              <DemandBaselineNote productVariantId={productVariantId} />
            </>
          ) : null}

          
          <ReorderProposalPanel
            variantId={proposal.productVariantId}
            variantName={proposal.productName}
            warehouseId={proposal.warehouseId ?? undefined}
          />
        </div>
      )}
    </AppSheet>
  );
});

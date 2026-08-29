"use client";

import { memo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AppSheet, ErrorState, NoPermissionState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useForecastReorderProposal,
  useGeneratePO,
  type ReorderProposal,
} from "@/hooks/api/inventory/planning";
import { DemandBaselineNote } from "./demand-baseline-note";
import { ForecastProposalDetail } from "./forecast-proposal-detail";
import { formatQuantity } from "./forecast-format";

function blockedReason(
  proposal: ReorderProposal | undefined,
  canCreatePo: boolean,
  vendorId: number | null,
): string | null {
  if (!canCreatePo) return "Creating a purchase order needs inventory:purchase-orders:create.";
  if (!proposal) return null;
  if (proposal.suggestedQuantity === null)
    return "The engine proposed no quantity, so there is nothing to order from it. Resolve the caveats or raise the order by hand.";
  if (vendorId === null)
    return "No vendor is assigned to this variant, so the draft PO has nobody to go to.";
  return null;
}

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

interface ForecastProposalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productVariantId: number | null;
  productName: string;
  variantSku: string;
  vendorId: number | null;
  warehouseId: number | null;
}

export const ForecastProposalSheet = memo(function ForecastProposalSheet({
  open,
  onOpenChange,
  productVariantId,
  productName,
  variantSku,
  vendorId,
  warehouseId,
}: ForecastProposalSheetProps) {
  const canManage = useCan("inventory:replenishment:manage");
  const canCreatePo = useCan("inventory:purchase-orders:create");
  const proposalQuery = useForecastReorderProposal(productVariantId, { enabled: open });
  const generatePo = useGeneratePO();

  const proposal = proposalQuery.data;
  const blocked = blockedReason(proposal, canCreatePo, vendorId);

  function handleClose(): void {
    onOpenChange(false);
  }

  function handleRetry(): void {
    void proposalQuery.refetch();
  }

  function handleCreateDraftPo(): void {
    if (!proposal || proposal.suggestedQuantity === null || vendorId === null) return;
    generatePo.mutate(
      {
        vendorId,
        ...(warehouseId !== null ? { warehouseId } : {}),
        suggestions: [
          {
            productVariantId: proposal.productVariantId,
            // The server re-derives the quantity from the live proposal and
            // ignores whatever is sent here (backend INV-309), so the lossy
            // hop from the exact decimal string to a JSON number decides
            // nothing. It is sent only because the endpoint's schema still
            // requires the field.
            suggestedQty: Number(proposal.suggestedQuantity),
          },
        ],
      },
      {
        onSuccess: (result) => {
          toast.success("Draft PO created", {
            description: (
              <span>
                PO {result.poNumber} raised for {productName}.{" "}
                <Link href="/inventory/purchase-orders" className="underline">
                  View purchase orders
                </Link>
              </span>
            ),
          });
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  const footer = canManage ? (
    <div className="grid w-full grid-cols-2 gap-2">
      <Button variant="outline" onClick={handleClose}>
        Close
      </Button>
      <LoadingButton
        isPending={generatePo.isPending}
        loadingText="Creating…"
        disabled={blocked !== null}
        onClick={handleCreateDraftPo}
      >
        {proposal === undefined
          ? "Create draft PO"
          : proposal.suggestedQuantity === null
            ? "No quantity to order"
            : `Order ${formatQuantity(proposal.suggestedQuantity)}`}
      </LoadingButton>
    </div>
  ) : undefined;

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Reorder proposal"
      description={`${productName} · ${variantSku}`}
      footer={footer}
      className="sm:max-w-xl"
    >
      {!canManage ? (
        <NoPermissionState
          permission="inventory:replenishment:manage"
          title="Reorder proposals are restricted"
          description="The forecast engine's proposals need replenishment access. Nothing is hidden here — you simply cannot read it."
        />
      ) : proposalQuery.isLoading ? (
        <ProposalSkeleton />
      ) : proposalQuery.isError ? (
        <ErrorState
          compact
          title="Could not read the proposal"
          description={getErrorMessage(proposalQuery.error)}
          onRetry={handleRetry}
        />
      ) : proposal ? (
        <div className="space-y-4">
          <ForecastProposalDetail proposal={proposal} />
          <DemandBaselineNote productVariantId={productVariantId} />
          {blocked ? (
            <p className="text-dense leading-relaxed text-muted-foreground">{blocked}</p>
          ) : null}
        </div>
      ) : null}
    </AppSheet>
  );
});

"use client";

import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatQuantity } from "@/features/inventory/components/planning/forecast-format";
import type {
  PoBatchPreview,
  SupplierSiteBatch,
} from "@/hooks/api/inventory/replenishment-planning";
import { toneChipClass } from "./transfer-evidence-panel";

interface BatchCardProps {
  batch: SupplierSiteBatch;
  canCreate: boolean;
  isPending: boolean;
  onCreate: (batch: SupplierSiteBatch) => void;
}

function BatchCard({ batch, canCreate, isPending, onCreate }: BatchCardProps) {
  function handleCreate(): void {
    onCreate(batch);
  }

  return (
    <div className={cn(CONTENT_PANEL_SOLID, "p-4")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{batch.vendorName}</h3>
          <p className="mt-0.5 text-micro text-muted-foreground">
            {batch.warehouseName ?? "Organisation-wide"} · {batch.currency} ·{" "}
            {batch.lines.length} line{batch.lines.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatQuantity(batch.totalValue)}
          </span>
          {canCreate && (
            <LoadingButton size="sm" isPending={isPending} onClick={handleCreate}>
              Create draft PO
            </LoadingButton>
          )}
        </div>
      </div>

      {batch.requiresApproval && (
        <Badge
          variant="outline"
          className={cn("mt-3 h-5 px-2 py-0.5 text-micro", toneChipClass("warning"))}
        >
          {batch.approvalReason ?? "Needs approval before it can be sent"}
        </Badge>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr className="border-b border-border/70 text-left">
              <th className="pb-2 text-micro font-medium text-muted-foreground">Item</th>
              <th className="pb-2 text-right text-micro font-medium text-muted-foreground">Engine</th>
              <th className="pb-2 text-right text-micro font-medium text-muted-foreground">Ordering</th>
              <th className="pb-2 text-right text-micro font-medium text-muted-foreground">Unit cost</th>
              <th className="pb-2 text-right text-micro font-medium text-muted-foreground">Line value</th>
            </tr>
          </thead>
          <tbody>
            {batch.lines.map((line) => (
              <tr key={line.productVariantId} className="border-b border-border/60 last:border-0">
                <td className="py-2 text-dense">
                  <span className="flex flex-wrap items-center gap-1.5">
                    {line.productName}
                    {line.override !== null && (
                      <Badge
                        variant="outline"
                        className="h-4 px-1.5 py-0 text-micro border-primary/40 text-primary"
                      >
                        Override
                      </Badge>
                    )}
                  </span>
                  {line.reasons.map((reason) => (
                    <span key={reason} className="block text-micro text-muted-foreground">
                      {reason}
                    </span>
                  ))}
                </td>
                {/* C2. The engine's own number stays visible beside the one that
                    will be ordered — struck through when a person changed it, so
                    the two are never read as the same figure. */}
                <td
                  className={cn(
                    "py-2 text-right font-mono text-dense tabular-nums text-muted-foreground",
                    line.override !== null && "line-through",
                  )}
                >
                  {formatQuantity(line.engineOrdered)}
                </td>
                <td
                  className={cn(
                    "py-2 text-right font-mono text-dense font-semibold tabular-nums",
                    line.override !== null && "text-primary",
                  )}
                >
                  {formatQuantity(line.ordered)}
                </td>
                <td className="py-2 text-right font-mono text-dense tabular-nums">
                  {formatQuantity(line.unitCost)}
                </td>
                <td className="py-2 text-right font-mono text-dense tabular-nums">
                  {formatQuantity(line.lineValue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface PoBatchPreviewPanelProps {
  preview: PoBatchPreview | undefined;
  isLoading: boolean;
  canCreate: boolean;
  pendingVendorId: number | null;
  onCreate: (batch: SupplierSiteBatch) => void;
}

/**
 * C6 — what would be created, before anything is.
 *
 * One card per (supplier, site, currency) group, which is one purchase order:
 * merging two sites onto one order sends every unit to whichever sorted first,
 * and merging two currencies produces a total in neither. The refusals are shown
 * beside the batches rather than filtered out — a proposal that vanishes with no
 * explanation reads as a bug, and the reason is what tells a buyer whether to go
 * and fix the supplier record.
 */
export function PoBatchPreviewPanel({
  preview,
  isLoading,
  canCreate,
  pendingVendorId,
  onCreate,
}: PoBatchPreviewPanelProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }
  if (!preview) return null;

  return (
    <div className="flex flex-col gap-3">
      {preview.batches.length > 1 && (
        <Badge
          variant="outline"
          className={cn("w-fit px-2 py-0.5 text-micro", toneChipClass("info"))}
        >
          This selection is {preview.batches.length} separate orders. Create them one at a
          time — a single order cannot span two suppliers, sites or currencies.
        </Badge>
      )}

      {preview.batches.map((batch) => (
        <BatchCard
          key={`${batch.vendorId}-${batch.warehouseId ?? "org"}-${batch.currency}`}
          batch={batch}
          canCreate={canCreate}
          isPending={pendingVendorId === batch.vendorId}
          onCreate={onCreate}
        />
      ))}

      {preview.skipped.length > 0 && (
        <div className={cn(CONTENT_PANEL_SOLID, "p-4")}>
          <h3 className="text-sm font-semibold">Left out of the batch</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {preview.skipped.map((entry) => (
              <li key={entry.proposalId} className="text-dense text-muted-foreground">
                {entry.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

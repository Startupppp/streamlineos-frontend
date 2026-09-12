"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import type {
  BatchableProposal,
  ProposalOverrideInput,
} from "@/hooks/api/inventory/replenishment-planning";
import { formatQuantity } from "./forecast-format";
import type { OverridableProposal } from "./proposal-override-dialog";

/**
 * C2 — the columns that keep the engine's number and a person's apart.
 *
 * Split out of `replenishment-client.tsx` for size (root §7), but the shape is
 * the point rather than the file count: **Engine quantity** and **Ordering** are
 * two columns, not one that changes meaning. An overridden row shows the
 * engine's figure struck through beside the number that will actually be
 * bought, so a reader is never left guessing which of the two they are looking
 * at — which is what a single "Quantity" column did before this unit.
 */
function statusBadge(row: BatchableProposal, isOverridden: boolean) {
  if (isOverridden) {
    return (
      <Badge variant="outline" className="h-4 px-1.5 py-0 text-micro border-primary/40 text-primary">
        Override
      </Badge>
    );
  }
  if (row.duplicateOfPoNumber !== null) {
    return (
      <Badge variant="outline" className="h-4 px-1.5 py-0 text-micro">
        On {row.duplicateOfPoNumber}
      </Badge>
    );
  }
  if (row.blockedReason !== null) {
    return (
      <Badge variant="outline" className="h-4 px-1.5 py-0 text-micro text-muted-foreground">
        Engine holds
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="h-4 px-1.5 py-0 text-micro">
      Ready
    </Badge>
  );
}

interface RowActionsProps {
  row: BatchableProposal;
  isOverridden: boolean;
  canOverride: boolean;
  onOpenProposal: (row: BatchableProposal) => void;
  onOverride: (row: BatchableProposal) => void;
  onClearOverride: (proposalId: number) => void;
}

function RowActions({
  row,
  isOverridden,
  canOverride,
  onOpenProposal,
  onOverride,
  onClearOverride,
}: RowActionsProps) {
  function handleProposal(): void {
    onOpenProposal(row);
  }

  function handleOverride(): void {
    onOverride(row);
  }

  function handleClear(): void {
    onClearOverride(row.proposalId);
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="sm" className="h-7 px-2 text-micro" onClick={handleProposal}>
        Evidence
      </Button>
      {canOverride ? (
        <Button
          variant={isOverridden ? "secondary" : "outline"}
          size="sm"
          className="h-7 px-2 text-micro"
          onClick={handleOverride}
        >
          {isOverridden ? "Edit override" : "Override"}
        </Button>
      ) : null}
      {isOverridden ? (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-micro" onClick={handleClear}>
          Clear
        </Button>
      ) : null}
    </div>
  );
}

interface ColumnOptions {
  overrides: ReadonlyMap<number, ProposalOverrideInput>;
  canOverride: boolean;
  onOpenProposal: (row: BatchableProposal) => void;
  onOverride: (row: BatchableProposal) => void;
  onClearOverride: (proposalId: number) => void;
}

export function buildProposalColumns(options: ColumnOptions): DataTableColumn<BatchableProposal>[] {
  return [
    {
      key: "product",
      header: "Item",
      cell: (row) => (
        <div>
          <TruncatedText text={row.productName} className="text-dense font-medium" />
          <p className="font-mono text-dense text-muted-foreground">{row.variantSku}</p>
        </div>
      ),
    },
    {
      key: "vendor",
      header: "Supplier",
      cell: (row) => (
        <div>
          <TruncatedText text={row.vendorName ?? "No supplier set"} className="text-dense" />
          <p className="text-micro text-muted-foreground">
            {row.warehouseName ?? "Organisation"} · {row.currency ?? "—"}
          </p>
        </div>
      ),
    },
    {
      key: "reorderPoint",
      header: "Reorder point",
      className: "font-mono tabular-nums text-dense text-right text-muted-foreground",
      headerClassName: "text-right",
      cell: (row) => (row.reorderPoint === null ? "—" : formatQuantity(row.reorderPoint)),
    },
    {
      key: "engineQuantity",
      header: "Engine quantity",
      className: "font-mono tabular-nums text-dense text-right",
      headerClassName: "text-right",
      cell: (row) => (
        <span
          className={cn(
            options.overrides.has(row.proposalId) && "text-muted-foreground line-through",
          )}
        >
          {formatQuantity(row.suggestedQuantity)}
        </span>
      ),
    },
    {
      key: "orderingQuantity",
      header: "Ordering",
      className: "font-mono tabular-nums text-dense text-right font-semibold",
      headerClassName: "text-right",
      cell: (row) => {
        const override = options.overrides.get(row.proposalId);
        if (!override) return formatQuantity(row.suggestedQuantity);
        return <span className="text-primary">{formatQuantity(override.quantity)}</span>;
      },
    },
    {
      key: "source",
      header: "Source",
      className: "w-28",
      cell: (row) => statusBadge(row, options.overrides.has(row.proposalId)),
    },
    {
      key: "actions",
      header: "",
      className: "w-48",
      cell: (row) => (
        <RowActions
          row={row}
          isOverridden={options.overrides.has(row.proposalId)}
          canOverride={options.canOverride}
          onOpenProposal={options.onOpenProposal}
          onOverride={options.onOverride}
          onClearOverride={options.onClearOverride}
        />
      ),
    },
  ];
}

export function toOverridable(row: BatchableProposal): OverridableProposal {
  return {
    proposalId: row.proposalId,
    productName: row.productName,
    variantSku: row.variantSku,
    engineQuantity: row.suggestedQuantity,
  };
}


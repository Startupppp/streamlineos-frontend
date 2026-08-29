import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Money } from "@/features/accounting/shared";
import type { AssetListItem, AssetStatus } from "@/types/accounting/assets";

interface AssetTableProps {
  items: AssetListItem[];
  isLoading: boolean;
  onRowClick: (row: AssetListItem) => void;
  emptyState: ReactNode;
}

const ASSET_STATUS_CLASSES: Record<AssetStatus, string> = {
  DRAFT: "bg-primary/5 text-foreground border-primary/20",
  ACTIVE:
    "bg-status-success-surface text-status-success-ink border-status-success-rule",
  FULLY_DEPRECIATED: "bg-muted text-foreground border-border",
  DISPOSED:
    "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};

const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  FULLY_DEPRECIATED: "Fully Depreciated",
  DISPOSED: "Disposed",
};

function AssetStatusBadge({ status }: { status: AssetStatus }) {
  return (
    <Badge
      variant="outline"
      className={`text-micro h-4 px-1.5 py-0 ${ASSET_STATUS_CLASSES[status]}`}
    >
      {ASSET_STATUS_LABELS[status]}
    </Badge>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function getAssetRowKey(row: AssetListItem): number {
  return row.asset.id;
}

const ASSET_COLUMNS: DataTableColumn<AssetListItem>[] = [
  {
    key: "assetNumber",
    header: "Asset #",
    cell: (row) => (
      <span className="font-mono text-xs">{row.asset.assetNumber}</span>
    ),
  },
  {
    key: "name",
    header: "Name",
    cell: (row) => (
      <Link
        href={`/accounting/assets/${row.asset.id}`}
        className="font-medium text-foreground hover:text-primary hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {row.asset.name}
      </Link>
    ),
  },
  {
    key: "category",
    header: "Category",
    cell: (row) => (
      <span className="text-muted-foreground">{row.categoryName ?? "—"}</span>
    ),
  },
  {
    key: "acquired",
    header: "Acquired",
    cell: (row) => (
      <span className="text-muted-foreground">
        {formatDate(row.asset.acquisitionDate)}
      </span>
    ),
  },
  {
    key: "cost",
    header: "Cost",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => <Money value={Number.parseFloat(row.asset.acquisitionCost)} />,
  },
  {
    key: "accumDepr",
    header: "Accum. Depr.",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => (
      <Money value={Number.parseFloat(row.asset.accumulatedDepreciation)} />
    ),
  },
  {
    key: "bookValue",
    header: "Book Value",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => {
      const bookValue = Math.max(
        0,
        Number.parseFloat(row.asset.acquisitionCost) -
          Number.parseFloat(row.asset.accumulatedDepreciation),
      );
      return <Money value={bookValue} />;
    },
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <AssetStatusBadge status={row.asset.status} />,
  },
];

export function AssetTable({
  items,
  isLoading,
  onRowClick,
  emptyState,
}: AssetTableProps) {
  return (
    <DataTable<AssetListItem>
      className="flex-1 min-h-0"
      data={items}
      columns={ASSET_COLUMNS}
      getRowKey={getAssetRowKey}
      onRowClick={onRowClick}
      isLoading={isLoading}
      minWidth="820px"
      emptyState={emptyState}
    />
  );
}

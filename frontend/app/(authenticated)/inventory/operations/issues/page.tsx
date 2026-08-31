"use client";

import { useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { useStockTransactions } from "@/hooks/api/inventory/stock";
import type { StockTransaction } from "@/hooks/api/inventory/stock";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { formatShortDate } from "@/lib/date-utils";

const TYPE_BADGE: Record<string, string> = {
  SALE: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  ADJUSTMENT_OUT: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  TRANSFER_OUT: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  RETURN_OUT: "bg-muted text-muted-foreground border-border",
};

/** The key `GET /inventory/stock/transactions` carries. */
const ISSUES_READ_KEY = "inventory:stock:read";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_BADGE[type] ?? "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("h-4 text-micro px-1.5 py-0", cls)}>
      {type.replace(/_/g, " ")}
    </Badge>
  );
}

const columns: DataTableColumn<StockTransaction>[] = [
  {
    key: "createdAt",
    header: "Date",
    cell: (tx) => (
      <span className="font-mono tabular-nums text-dense">{formatShortDate(tx.createdAt) || "—"}</span>
    ),
    sortable: true,
    sortValue: (tx) => tx.createdAt,
  },
  {
    key: "product",
    header: "Product",
    cell: (tx) =>
      tx.productVariant?.product?.name ?? tx.productVariant?.name ?? "—",
  },
  {
    key: "sku",
    header: "SKU",
    cell: (tx) => (
      <span className="font-mono text-dense text-muted-foreground">
        {tx.productVariant?.sku ?? tx.productVariant?.product?.sku ?? "—"}
      </span>
    ),
    className: "hidden md:table-cell",
    headerClassName: "hidden md:table-cell",
  },
  {
    key: "location",
    header: "Location",
    cell: (tx) => tx.location?.name ?? "—",
    className: "hidden md:table-cell",
    headerClassName: "hidden md:table-cell",
  },
  {
    key: "quantityChange",
    header: "Qty",
    cell: (tx) => (
      <span className={cn("font-mono tabular-nums", tx.quantityChange < 0 ? "text-status-danger-ink" : "text-status-success-ink")}>
        {tx.quantityChange > 0 ? "+" : ""}{tx.quantityChange}
      </span>
    ),
    className: "text-right",
    headerClassName: "text-right",
  },
  {
    key: "referenceId",
    header: "Reference",
    cell: (tx) => (
      <span className="font-mono text-dense text-muted-foreground">
        {tx.referenceId ? `${tx.referenceType ?? ""} ${tx.referenceId}`.trim() : "—"}
      </span>
    ),
    className: "hidden lg:table-cell",
    headerClassName: "hidden lg:table-cell",
  },
  {
    key: "transactionType",
    header: "Type",
    cell: (tx) => <TypeBadge type={tx.transactionType} />,
  },
];

export default function IssuesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const fromDate = searchParams.get("fromDate") ?? "";
  const toDate = searchParams.get("toDate") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  function updateParams(updates: Record<string, string>): void {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === "" || (key === "page" && value === "1")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  }

  function handleFromDateChange(value: string): void {
    updateParams({ fromDate: value, page: "1" });
  }

  function handleToDateChange(value: string): void {
    updateParams({ toDate: value, page: "1" });
  }

  function handlePageChange(nextPage: number): void {
    updateParams({ page: String(nextPage) });
  }

  function handleRetry(): void {
    void query.refetch();
  }

  /*
   * G8 — the ledger read is gated inside its hook, so without this branch a
   * reader who lacks the key was told there are no outbound issues rather than
   * that they may not see them. Declared below the other hooks so hook order
   * never depends on a permission.
   */
  const canView = useCan(ISSUES_READ_KEY);

  const query = useStockTransactions({
    transactionType: "SALE",
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    page,
    limit: 50,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 1;

  const filterBar = (
    <div className="flex w-full min-w-0 items-center gap-2">
      <DatePicker value={fromDate ?? ""} onChange={handleFromDateChange} placeholder="Pick a date" className="text-xs w-36" />
      <DatePicker value={toDate ?? ""} onChange={handleToDateChange} placeholder="Pick a date" className="text-xs w-36" />
    </div>
  );

  return (
    <PageWrapper
      title="Issues"
      subtitle="Outbound stock transactions — sales, transfers, and adjustments."
      filters={filterBar}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
      {!canView ? (
        <NoPermissionState className="flex-1" permission={ISSUES_READ_KEY} />
      ) : (
      <DataTable
        data={items}
        columns={columns}
        className="flex-1 min-h-0"
        getRowKey={(tx) => tx.id}
        isLoading={query.isLoading}
        emptyState={
          query.error ? (
            <ErrorState description={getErrorMessage(query.error)} onRetry={handleRetry} compact />
          ) : (
            <InventoryEmptyState
              title="No outbound issues"
              description="Sale and outbound stock transactions will appear here."
              compact
            />
          )
        }
        pagination={
          totalPages > 1
            ? { mode: "server", page, pageSize: 50, total, onPageChange: handlePageChange }
            : undefined
        }
        minWidth="640px"
      />
      )}
      </div>
    </PageWrapper>
  );
}

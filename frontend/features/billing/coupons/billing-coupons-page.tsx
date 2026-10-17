"use client";

import { useMemo } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useBillingCoupons } from "@/hooks/api/billing/coupons";
import type { BillingCoupon } from "@/hooks/api/billing/billing-growth-schema";
import { formatAmountInCurrency } from "@/lib/format-utils";
import { formatShortDate } from "@/lib/date-utils";

const HEADERS = ["Code", "Discount", "Plans", "Uses", "Redeemed here", "Expires", "Status"];

function rowKey(row: BillingCoupon): number {
  return row.id;
}

function isExpired(row: BillingCoupon): boolean {
  return row.expiresAt !== null && new Date(row.expiresAt).getTime() < Date.now();
}

const COLUMNS: DataTableColumn<BillingCoupon>[] = [
  {
    key: "code",
    header: "Code",
    cell: (row) => (
      <div className="flex min-w-0 flex-col">
        <span className="font-mono text-sm font-medium">{row.code}</span>
        <span className="text-xs text-muted-foreground">{row.orgId === null ? "Platform promotion" : "Your organisation"}</span>
      </div>
    ),
  },
  {
    key: "discount",
    header: "Discount",
    className: "font-mono tabular-nums",
    cell: (row) => (row.type === "PERCENTAGE" ? `${row.value}%` : formatAmountInCurrency(row.value, "INR")),
  },
  { key: "plans", header: "Plans", cell: (row) => (row.applicablePlans?.length ? row.applicablePlans.join(", ") : "All plans") },
  {
    key: "uses",
    header: "Uses",
    className: "font-mono tabular-nums",
    cell: (row) => (row.maxUses === null ? `${row.usedCount}` : `${row.usedCount} / ${row.maxUses}`),
  },
  { key: "redeemed", header: "Redeemed here", className: "font-mono tabular-nums", cell: (row) => row.redemptions.length },
  { key: "expires", header: "Expires", className: "tabular-nums", cell: (row) => (row.expiresAt ? formatShortDate(row.expiresAt) : "Never") },
  {
    key: "status",
    header: "Status",
    cell: (row) =>
      !row.isActive ? (
        <SemanticBadge tone="neutral" label="Inactive" />
      ) : isExpired(row) ? (
        <SemanticBadge tone="warning" label="Expired" />
      ) : (
        <SemanticBadge tone="success" label="Active" />
      ),
  },
];

/** Coupons this organisation can redeem at checkout, and how often it already has. */
export function BillingCouponsPage() {
  const query = useBillingCoupons();
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const pageState = usePageState({
    permission: "billing:coupons:manage",
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isEmpty: query.isSuccess && rows.length === 0,
  });

  function handleRetry() {
    void query.refetch();
  }

  const emptyState = (
    <EmptyState
      illustrationPreset="documents"
      title="No coupons available"
      description="Promotions you can apply at checkout appear here."
      className="flex-1 min-h-[40vh]"
    />
  );

  return (
    <PageWrapper title="Coupons" subtitle="Promotions available to your organisation at checkout." contentClassName="flex min-h-0 flex-1 flex-col">
      <PageState
        resolution={pageState}
        loading={<DataTableSkeleton headers={HEADERS} rows={8} />}
        empty={emptyState}
        onRetry={handleRetry}
        className="flex-1"
      >
        <DataTable
          data={rows}
          columns={COLUMNS}
          getRowKey={rowKey}
          emptyState={emptyState}
          minWidth="820px"
          className="flex-1 min-h-0"
          pagination={{ pageSize: 25 }}
        />
      </PageState>
    </PageWrapper>
  );
}

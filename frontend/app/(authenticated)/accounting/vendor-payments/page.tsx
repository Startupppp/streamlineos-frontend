"use client";

import { useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { FinanceStatusBadge, Money } from "@/features/accounting/shared";
import { usePurchaseBills, useVendorsOutstanding } from "@/hooks/api/accounting";
import type { PurchaseBillSummary } from "@/types/accounting";
import { VendorPaymentAllocationDialog } from "@/features/accounting/purchases/vendor-payment-allocation-dialog";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function VendorPaymentsPage() {
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);

  const paidQuery = usePurchaseBills({ status: "PAID", page: 1, pageSize: 50 });
  const partialQuery = usePurchaseBills({ status: "PARTIALLY_PAID", page: 1, pageSize: 50 });
  const vendorsQuery = useVendorsOutstanding({ pageSize: 100 });

  const allItems: PurchaseBillSummary[] = [
    ...(paidQuery.data?.items ?? []),
    ...(partialQuery.data?.items ?? []),
  ];

  const filteredItems =
    vendorFilter === "all"
      ? allItems
      : allItems.filter((b) => String(b.vendorId) === vendorFilter);

  const vendors = vendorsQuery.data?.items ?? [];
  const isLoading = paidQuery.isLoading || partialQuery.isLoading;
  const queryError = paidQuery.error ?? partialQuery.error;

  function handleRetry(): void {
    void paidQuery.refetch();
    void partialQuery.refetch();
  }

  function handleOpenAllocationDialog(): void {
    setAllocationDialogOpen(true);
  }

  function handleVendorFilterChange(value: string): void {
    setVendorFilter(value);
  }

  function handleAllocationDialogChange(open: boolean): void {
    setAllocationDialogOpen(open);
  }

  const columns: DataTableColumn<PurchaseBillSummary>[] = [
    {
      key: "billNumber",
      header: "Bill #",
      cell: (row) => (
        <Link
          href={`/accounting/purchase-bills/${row.id}`}
          className="font-mono text-xs hover:underline text-foreground"
        >
          {row.billNumber}
        </Link>
      ),
    },
    {
      key: "vendor",
      header: "Vendor",
      cell: (row) => <span className="text-sm">{row.vendorName ?? "—"}</span>,
    },
    {
      key: "billDate",
      header: "Bill date",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.billDate)}</span>
      ),
    },
    {
      key: "total",
      header: "Total",
      className: "text-right",
      headerClassName: "text-right",
      cell: (row) => <Money value={Number(row.total)} />,
    },
    {
      key: "amountPaid",
      header: "Paid",
      className: "text-right",
      headerClassName: "text-right",
      cell: (row) => <Money value={Number(row.amountPaid)} className="text-emerald-700" />,
    },
    {
      key: "outstanding",
      header: "Outstanding",
      className: "text-right",
      headerClassName: "text-right",
      cell: (row) => {
        const outstanding = Number(row.total) - Number(row.amountPaid);
        return (
          <Money
            value={outstanding}
            className={outstanding > 0.005 ? "text-amber-600" : undefined}
          />
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <FinanceStatusBadge status={row.status} />,
    },
  ];

  return (
    <PageWrapper
      title="Vendor Payments"
      subtitle="Payment history for vendor bills."
      actions={
        <Button size="sm" variant="outline" onClick={handleOpenAllocationDialog}>
          Record Allocation
        </Button>
      }
      filters={
        <Select value={vendorFilter} onValueChange={handleVendorFilterChange}>
          <SelectTrigger className={`w-[180px] ${FILTER_SELECT_TRIGGER}`}>
            <SelectValue placeholder="All vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vendors</SelectItem>
            {vendors.map((v) => (
              <SelectItem key={v.vendorId} value={String(v.vendorId)}>
                {v.vendorName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {queryError && (
        <ErrorState
          title="Failed to load vendor payments"
          description={getErrorMessage(queryError)}
          onRetry={handleRetry}
        />
      )}
      <DataTable
        data={filteredItems}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        className="flex-1 min-h-0"
        emptyState={
          <EmptyState
            illustrationPreset="tasks"
            title="No payments found"
            description="Paid and partially paid bills will appear here."
          />
        }
        minWidth="640px"
      />

      <VendorPaymentAllocationDialog
        open={allocationDialogOpen}
        onOpenChange={handleAllocationDialogChange}
      />
    </PageWrapper>
  );
}

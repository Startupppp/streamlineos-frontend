"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useCan } from "@/hooks/api/access";
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
import { formatShortDate } from "@/lib/date-utils";
import { FinanceStatusBadge, Money } from "@/features/accounting/shared";
import { usePurchaseBills, useVendorsOutstanding } from "@/hooks/api/accounting";
import type { PurchaseBillSummary } from "@/types/accounting";
import { VendorPaymentAllocationDialog } from "@/features/accounting/purchases/vendor-payment-allocation-dialog";

const PAGE_SIZE = 25;

export default function VendorPaymentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const canManage = useCan("accounting:payables:manage");
  const vendorFilter = searchParams.get("vendor") ?? "all";
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);

  const vendorsQuery = useVendorsOutstanding({ limit: 100 });

  const [paidCursors, setPaidCursors] = useState<(string | null)[]>([null]);
  const [partialCursors, setPartialCursors] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState(0);

  useEffect(() => {
    setPaidCursors([null]);
    setPartialCursors([null]);
    setCursorIndex(0);
  }, [vendorFilter]);

  const currentPaidCursor = paidCursors[cursorIndex] ?? null;
  const currentPartialCursor = partialCursors[cursorIndex] ?? null;

  const vendorId = vendorFilter === "all" ? undefined : Number(vendorFilter);

  const paidQuery = usePurchaseBills({
    status: "PAID",
    limit: PAGE_SIZE,
    cursor: currentPaidCursor ?? undefined,
    vendorId,
  });
  const partialQuery = usePurchaseBills({
    status: "PARTIALLY_PAID",
    limit: PAGE_SIZE,
    cursor: currentPartialCursor ?? undefined,
    vendorId,
  });

  useEffect(() => {
    if (!paidQuery.data) return;
    const nextCursor = paidQuery.data.pagination.nextCursor;
    setPaidCursors((prev) => {
      if (prev[cursorIndex + 1] !== undefined) return prev;
      const next = [...prev];
      next[cursorIndex + 1] = nextCursor;
      return next;
    });
  }, [paidQuery.data, cursorIndex]);

  useEffect(() => {
    if (!partialQuery.data) return;
    const nextCursor = partialQuery.data.pagination.nextCursor;
    setPartialCursors((prev) => {
      if (prev[cursorIndex + 1] !== undefined) return prev;
      const next = [...prev];
      next[cursorIndex + 1] = nextCursor;
      return next;
    });
  }, [partialQuery.data, cursorIndex]);

  const paidItems = paidQuery.data?.data ?? [];
  const partialItems = partialQuery.data?.data ?? [];
  const allItems: PurchaseBillSummary[] = [...paidItems, ...partialItems];

  const vendors = vendorsQuery.data?.data ?? [];
  const isLoading = paidQuery.isLoading || partialQuery.isLoading;
  const queryError = paidQuery.error ?? partialQuery.error;

  const paidHasMore = paidQuery.data?.pagination?.hasMore ?? false;
  const partialHasMore = partialQuery.data?.pagination?.hasMore ?? false;
  const hasMore = paidHasMore || partialHasMore;
  const currentPage = cursorIndex + 1;
  const syntheticTotal = hasMore
    ? currentPage * PAGE_SIZE * 2 + 1
    : (currentPage - 1) * PAGE_SIZE * 2 + allItems.length;

  function handleRetry(): void {
    void paidQuery.refetch();
    void partialQuery.refetch();
  }

  function handleOpenAllocationDialog(): void {
    setAllocationDialogOpen(true);
  }

  function handleVendorFilterChange(value: string): void {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") params.delete("vendor");
      else params.set("vendor", value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function handleAllocationDialogChange(open: boolean): void {
    setAllocationDialogOpen(open);
  }

  function handlePageChange(page: number): void {
    const targetIndex = page - 1;
    if (targetIndex < 0) return;
    const hasPaidCursor = targetIndex < paidCursors.length && paidCursors[targetIndex] !== undefined;
    const hasPartialCursor = targetIndex < partialCursors.length && partialCursors[targetIndex] !== undefined;
    if (hasPaidCursor && hasPartialCursor) {
      setCursorIndex(targetIndex);
    }
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
        <span className="text-sm text-muted-foreground">{formatShortDate(row.billDate)}</span>
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
      cell: (row) => <Money value={Number(row.amountPaid)} className="text-status-success-ink" />,
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
            className={outstanding > 0.005 ? "text-status-warning-ink" : undefined}
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
        canManage ? (
          <Button size="sm" variant="outline" onClick={handleOpenAllocationDialog}>
            Record Allocation
          </Button>
        ) : undefined
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
      <div className="flex flex-1 min-h-0 flex-col">
        {queryError ? (
          <ErrorState
            title="Failed to load vendor payments"
            description={getErrorMessage(queryError)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            data={allItems}
            columns={columns}
            getRowKey={(row) => row.id}
            isLoading={isLoading}
            className="flex-1 min-h-0"
            pagination={{
              mode: "server",
              page: currentPage,
              pageSize: PAGE_SIZE * 2,
              total: syntheticTotal,
              onPageChange: handlePageChange,
            }}
            emptyState={
              <EmptyState
                illustrationPreset="tasks"
                title="No payments found"
                description="Paid and partially paid bills will appear here."
              />
            }
            minWidth="640px"
          />
        )}
      </div>

      <VendorPaymentAllocationDialog
        open={allocationDialogOpen}
        onOpenChange={handleAllocationDialogChange}
      />
    </PageWrapper>
  );
}

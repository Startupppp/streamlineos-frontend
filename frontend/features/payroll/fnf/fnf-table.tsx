"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { useFnfSettlements } from "@/hooks/api/payroll/fnf";
import { formatMoney } from "@/features/payroll/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { FnfStatusBadge } from "./fnf-status-badge";
import { FnfDetailSheet } from "./fnf-detail-sheet";
import type { FnfSettlement, FnfStatus } from "@/types/payroll";
import { TruncatedText } from "@/components/ui/truncated-text";

const STATUS_OPTIONS: { value: FnfStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "HR_REVIEW", label: "HR Review" },
  { value: "FINANCE_REVIEW", label: "Finance Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "PAID", label: "Paid" },
];

const SENTINEL = "all";

const columns: DataTableColumn<FnfSettlement>[] = [
  {
    key: "employee",
    header: "Employee",
    cell: (row) => (
      <div className="flex flex-col gap-0.5 min-w-0">
        <TruncatedText text={row.userName} className="text-dense font-medium" />
        <TruncatedText text={row.userEmail} className="text-micro text-muted-foreground" />
      </div>
    ),
  },
  {
    key: "netPayable",
    header: "Net Payable",
    className: "text-right",
    headerClassName: "text-right",
    cell: (row) => (
      <span className="font-mono tabular-nums text-right text-dense">
        {formatMoney(row.netPayable)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <FnfStatusBadge status={row.status} />,
  },
  {
    key: "date",
    header: "Date",
    cell: (row) => {
      const dateStr = row.statementPublishedAt ?? null;
      if (!dateStr) return <span className="text-dense text-muted-foreground">—</span>;
      return (
        <span className="text-dense text-muted-foreground">
          {formatShortDate(dateStr)}
        </span>
      );
    },
  },
];

export function FnfTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusFilter = searchParams.get("status") ?? SENTINEL;
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading, isError, error, refetch } = useFnfSettlements();

  const filtered =
    data && statusFilter !== SENTINEL
      ? data.filter((s) => s.status === statusFilter)
      : (data ?? []);

  const filtersActive = statusFilter !== SENTINEL;

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleClearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    router.replace(`?${params.toString()}`);
  }, [router, searchParams]);

  function handleStatusChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === SENTINEL) {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    router.replace(`?${params.toString()}`);
  }

  function handleRowClick(row: FnfSettlement) {
    setSelectedId(row.id);
  }

  function handleSheetClose() {
    setSelectedId(null);
  }

  return (
    <>
      <div className={`${FILTER_TOOLBAR_ROW} mb-3`}>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-44`}>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SENTINEL}>All statuses</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load settlements"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
      <DataTable
        className="flex-1 min-h-0"
        data={filtered}
        columns={columns}
        getRowKey={(row) => row.id}
        onRowClick={handleRowClick}
        isLoading={isLoading}
        minWidth="600px"
        pagination={{ pageSize: 20 }}
        mobileCard={(row) => (
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{row.userName}</p>
                <p className="text-dense text-muted-foreground truncate">{row.userEmail}</p>
              </div>
              <FnfStatusBadge status={row.status} />
            </div>
            <p className="font-mono tabular-nums text-sm font-medium">
              {formatMoney(row.netPayable)}
            </p>
          </div>
        )}
        emptyState={
          <EmptyState
            illustration={<EmptyExpensesIllustration />}
            title="No settlements yet"
            description={
              filtersActive
                ? undefined
                : "Full & Final settlements will appear here once initiated"
            }
            filtersActive={filtersActive}
            onClearFilters={handleClearFilters}
          />
        }
      />
      )}

      <FnfDetailSheet settlementId={selectedId} onClose={handleSheetClose} />
    </>
  );
}

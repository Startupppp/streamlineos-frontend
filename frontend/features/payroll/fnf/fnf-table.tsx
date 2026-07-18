"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
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
        <TruncatedText text={row.userName} className="text-[11px] font-medium" />
        <TruncatedText text={row.userEmail} className="text-[10px] text-muted-foreground" />
      </div>
    ),
  },
  {
    key: "netPayable",
    header: "Net Payable",
    className: "text-right",
    headerClassName: "text-right",
    cell: (row) => (
      <span className="font-mono tabular-nums text-right text-[11px]">
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
      if (!dateStr) return <span className="text-[11px] text-muted-foreground">—</span>;
      return (
        <span className="text-[11px] text-muted-foreground">
          {new Date(dateStr).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
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

  const { data, isLoading } = useFnfSettlements();

  const filtered =
    data && statusFilter !== SENTINEL
      ? data.filter((s) => s.status === statusFilter)
      : (data ?? []);

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

      <DataTable
        className="flex-1 min-h-0"
        data={filtered}
        columns={columns}
        getRowKey={(row) => row.id}
        onRowClick={handleRowClick}
        isLoading={isLoading}
        minWidth="600px"
        pagination={{ pageSize: 20 }}
        emptyState={
          <EmptyState
            illustration={<EmptyExpensesIllustration />}
            title="No settlements found"
            description="Full & Final settlements will appear here once initiated"
          />
        }
      />

      <FnfDetailSheet settlementId={selectedId} onClose={handleSheetClose} />
    </>
  );
}

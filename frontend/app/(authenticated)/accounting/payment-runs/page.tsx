"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { FinanceStatusBadge, Money } from "@/features/accounting/shared";
import type { FinanceStatus } from "@/features/accounting/shared";
import { PaymentRunFormSheet } from "@/features/accounting/purchases/payment-run-form-sheet";
import { usePaymentRuns } from "@/hooks/api/accounting/ap";
import type { PaymentRunSummary, PaymentRunStatus } from "@/hooks/api/accounting/ap";
import { formatShortDate } from "@/lib/date-utils";

type RunStatusFilter = "all" | PaymentRunStatus;

const STATUS_OPTIONS: Array<{ value: RunStatusFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "APPROVED", label: "Approved" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const RUN_STATUS_FILTER_VALUES: ReadonlyArray<string> = ["all", "DRAFT", "APPROVED", "COMPLETED", "CANCELLED"];

function isRunStatusFilter(v: string): v is RunStatusFilter {
  return RUN_STATUS_FILTER_VALUES.includes(v);
}

function RunStatusDisplay({ status }: { status: PaymentRunStatus }) {
  if (status === "COMPLETED") {
    return (
      <Badge
        variant="outline"
        className="text-micro px-1.5 py-0 h-4 bg-status-success-surface text-status-success-ink border-status-success-rule"
      >
        Completed
      </Badge>
    );
  }
  const mapped: FinanceStatus =
    status === "DRAFT" ? "DRAFT" : status === "APPROVED" ? "APPROVED" : "CANCELLED";
  return <FinanceStatusBadge status={mapped} />;
}

const COLUMNS: DataTableColumn<PaymentRunSummary>[] = [
  {
    key: "name",
    header: "Name",
    cell: (run) => (
      <span className="font-medium text-sm text-foreground">{run.name}</span>
    ),
  },
  {
    key: "scheduledDate",
    header: "Scheduled",
    cell: (run) => (
      <span className="text-sm text-muted-foreground tabular-nums">
        {formatShortDate(run.scheduledDate) || "—"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (run) => <RunStatusDisplay status={run.status} />,
  },
  {
    key: "totalAmount",
    header: "Total",
    className: "text-right",
    headerClassName: "text-right",
    cell: (run) => <Money value={Number(run.totalAmount)} />,
  },
  {
    key: "createdAt",
    header: "Created",
    cell: (run) => (
      <span className="text-sm text-muted-foreground tabular-nums">
        {formatShortDate(run.createdAt) || "—"}
      </span>
    ),
  },
];

export default function PaymentRunsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<RunStatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const query = usePaymentRuns({
    page: 1,
    pageSize: 50,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const items = query.data?.items ?? [];

  function handleRetry(): void {
    void query.refetch();
  }

  function handleNewClick(): void {
    setCreateOpen(true);
  }

  function handleStatusFilterChange(value: string): void {
    if (isRunStatusFilter(value)) setStatusFilter(value);
  }

  function handleRowClick(run: PaymentRunSummary): void {
    router.push(`/accounting/payment-runs/${run.id}`);
  }

  function handleCreateOpenChange(open: boolean): void {
    setCreateOpen(open);
  }

  return (
    <PageWrapper
      title="Payment Runs"
      subtitle="Batch vendor payment processing."
      actions={
        <LoadingButton size="sm" onClick={handleNewClick} isPending={false}>
          <Plus className="size-4 mr-1" />
          New run
        </LoadingButton>
      }
      filters={
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className={`w-[160px] ${FILTER_SELECT_TRIGGER}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {query.error ? (
          <ErrorState
            title="Failed to load payment runs"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            className="flex-1 min-h-0"
            data={items}
            columns={COLUMNS}
            getRowKey={(run) => run.id}
            onRowClick={handleRowClick}
            isLoading={query.isLoading}
            emptyState={
              <EmptyState
                illustrationPreset="tasks"
                title="No payment runs"
                description="Create a payment run to batch-process vendor payments."
                action={{ label: "New run", onClick: handleNewClick }}
              />
            }
          />
        )}
      </div>

      <PaymentRunFormSheet open={createOpen} onOpenChange={handleCreateOpenChange} />
    </PageWrapper>
  );
}

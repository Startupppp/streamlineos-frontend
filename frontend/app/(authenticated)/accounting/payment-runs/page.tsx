"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
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

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function RunStatusDisplay({ status }: { status: PaymentRunStatus }) {
  if (status === "COMPLETED") {
    return (
      <Badge
        variant="outline"
        className="text-[9px] px-1.5 py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
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
        {formatDate(run.scheduledDate)}
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
        {formatDate(run.createdAt)}
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
        <Button size="sm" onClick={handleNewClick}>
          <Plus className="size-4 mr-1" />
          New run
        </Button>
      }
      filters={
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
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

      <PaymentRunFormSheet open={createOpen} onOpenChange={handleCreateOpenChange} />
    </PageWrapper>
  );
}

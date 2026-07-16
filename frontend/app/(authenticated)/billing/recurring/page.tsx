"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Repeat, IndianRupee, CalendarClock, RefreshCw } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTimeIllustration } from "@/components/illustrations";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useRecurringInvoices,
  useRunRecurringInvoices,
  type RecurringInvoice,
} from "@/hooks/api/invoice";
import { formatCurrencyFull } from "@/lib/format-utils";

const MONTHLY_FACTOR: Record<string, number> = {
  daily: 30,
  day: 30,
  weekly: 52 / 12,
  week: 52 / 12,
  biweekly: 26 / 12,
  fortnightly: 26 / 12,
  monthly: 1,
  month: 1,
  quarterly: 1 / 3,
  quarter: 1 / 3,
  halfyearly: 1 / 6,
  "half-yearly": 1 / 6,
  semiannually: 1 / 6,
  yearly: 1 / 12,
  annually: 1 / 12,
  year: 1 / 12,
};

function intervalLabel(interval: string | null): string {
  if (!interval) return "Monthly";
  const trimmed = interval.trim();
  if (!trimmed) return "Monthly";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function monthlyValue(invoice: RecurringInvoice): number {
  const factor =
    MONTHLY_FACTOR[
      (invoice.recurringInterval ?? "monthly").trim().toLowerCase()
    ] ?? 1;
  return Number(invoice.total) * factor;
}

const RECURRING_COLUMNS: DataTableColumn<RecurringInvoice>[] = [
  {
    key: "invoiceNumber",
    header: "Invoice #",
    cell: (invoice): ReactNode => (
      <Link
        href={`/billing/invoices/${invoice.id}`}
        className="text-primary hover:underline"
      >
        {invoice.invoiceNumber}
      </Link>
    ),
  },
  {
    key: "clientName",
    header: "Customer",
    cell: (invoice): ReactNode => (
      <span className="text-sm">{invoice.clientName ?? "—"}</span>
    ),
  },
  {
    key: "total",
    header: "Amount",
    headerClassName: "text-right",
    className: "text-right font-mono text-sm tabular-nums",
    cell: (invoice): ReactNode =>
      formatCurrencyFull(invoice.total, invoice.currency),
  },
  {
    key: "recurringInterval",
    header: "Frequency",
    cell: (invoice): ReactNode => intervalLabel(invoice.recurringInterval),
  },
  {
    key: "nextRecurringDate",
    header: "Next date",
    cell: (invoice): ReactNode =>
      invoice.nextRecurringDate ? (
        <Badge variant={invoice.overdue ? "destructive" : "secondary"}>
          {format(new Date(invoice.nextRecurringDate), "MMM d, yyyy")}
          {invoice.overdue ? " · Due" : ""}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "status",
    header: "Status",
    cell: (invoice): ReactNode => (
      <Badge variant="outline">{invoice.status}</Badge>
    ),
  },
];

function getRecurringRowKey(invoice: RecurringInvoice): string | number {
  return invoice.id;
}

export default function RecurringInvoicesPage() {
  const query = useRecurringInvoices();
  const runMutation = useRunRecurringInvoices();
  const recurring = useMemo(() => query.data ?? [], [query.data]);

  const dueCount = useMemo(
    () => recurring.filter((inv) => inv.overdue).length,
    [recurring],
  );
  const monthlyTotal = useMemo(
    () => recurring.reduce((sum, inv) => sum + monthlyValue(inv), 0),
    [recurring],
  );

  function handleRetry() {
    void query.refetch();
  }

  const handleGenerate = useCallback(() => {
    runMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.generated === 0) {
          toast.info("No recurring invoices are due right now");
        } else {
          toast.success(
            `Generated ${result.generated} invoice${result.generated === 1 ? "" : "s"}`,
          );
        }
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [runMutation]);

  const generateButton = (
    <LoadingButton
      size="sm"
      onClick={handleGenerate}
      isPending={runMutation.isPending}
      disabled={runMutation.isPending || query.isLoading}
    >
      <RefreshCw className="h-4 w-4" />
      Generate due now
    </LoadingButton>
  );

  return (
    <PageWrapper
      title="Recurring Invoices"
      subtitle="Automatically clone invoices on a schedule and track upcoming runs."
      actions={generateButton}
    >
      {query.isLoading ? (
        <LoadingState variant="table" rows={10} />
      ) : query.error ? (
        <ErrorState description={getErrorMessage(query.error)} onRetry={handleRetry} />
      ) : recurring.length === 0 ? (
        <div className="flex flex-1">
          <EmptyState
            className="flex-1"
            illustration={<EmptyTimeIllustration />}
            title="No recurring invoices"
            description="Mark an invoice as recurring with an interval and a next date to schedule automatic generation."
            action={{ label: "Go to invoices", href: "/billing/invoices" }}
          />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <StatCardGrid cols={3}>
            <StatCard
              label="Active recurring"
              value={recurring.length}
              icon={Repeat}
              hint="Invoices on a schedule"
            />
            <StatCard
              label="Due now"
              value={dueCount}
              icon={CalendarClock}
              tone="amber"
              hint="Ready to generate"
            />
            <StatCard
              label="Monthly value"
              value={formatCurrencyFull(monthlyTotal)}
              icon={IndianRupee}
              tone="emerald"
              hint="Estimated recurring revenue"
            />
          </StatCardGrid>

          <div className="flex flex-1 min-h-0 flex-col rounded-lg border border-border overflow-hidden">
            <DataTable
              data={recurring}
              columns={RECURRING_COLUMNS}
              getRowKey={getRecurringRowKey}
              className="flex-1 min-h-0 border-0 rounded-none"
            />
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

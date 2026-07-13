"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Repeat,
  IndianRupee,
  CalendarClock,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTimeIllustration } from "@/components/illustrations";
import { toast } from "sonner";
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
      onError: (error) => toast.error(error.message),
    });
  }, [runMutation]);

  const generateButton = (
    <Button
      size="sm"
      onClick={handleGenerate}
      disabled={runMutation.isPending || query.isLoading}
    >
      {runMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      Generate due now
    </Button>
  );

  return (
    <PageWrapper
      eyebrow="Billing"
      title="Recurring Invoices"
      subtitle="Automatically clone invoices on a schedule and track upcoming runs."
      actions={generateButton}
    >
      {query.isLoading ? (
        <LoadingState variant="page" />
      ) : query.error ? (
        <ErrorState description={query.error.message} onRetry={handleRetry} />
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
        <div className="flex flex-1 min-h-0 flex-col space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active recurring
                </CardTitle>
                <Repeat className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recurring.length}</div>
                <p className="text-xs text-muted-foreground">
                  Invoices on a schedule
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Due now</CardTitle>
                <CalendarClock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {dueCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ready to generate
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Monthly value
                </CardTitle>
                <IndianRupee className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrencyFull(monthlyTotal)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Estimated recurring revenue
                </p>
              </CardContent>
            </Card>
          </div>

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

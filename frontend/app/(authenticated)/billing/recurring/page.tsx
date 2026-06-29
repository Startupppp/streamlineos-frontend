"use client";

import { useCallback, useMemo } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
        <div className="flex-1 min-h-[60vh] flex">
          <EmptyState
            className="flex-1"
            illustration={<EmptyTimeIllustration />}
            title="No recurring invoices"
            description="Mark an invoice as recurring with an interval and a next date to schedule automatic generation."
            action={{ label: "Go to invoices", href: "/billing/invoices" }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active recurring
                </CardTitle>
                <Repeat className="h-4 w-4 text-blue-500" />
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

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurring.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/billing/invoices/${invoice.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{invoice.clientName ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrencyFull(invoice.total, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      {intervalLabel(invoice.recurringInterval)}
                    </TableCell>
                    <TableCell>
                      {invoice.nextRecurringDate ? (
                        <Badge
                          variant={
                            invoice.overdue ? "destructive" : "secondary"
                          }
                        >
                          {format(
                            new Date(invoice.nextRecurringDate),
                            "MMM d, yyyy",
                          )}
                          {invoice.overdue ? " · Due" : ""}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{invoice.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </PageWrapper>
  );
}

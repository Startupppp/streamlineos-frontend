"use client";

import Link from "next/link";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { format, isPast } from "date-fns";
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { useInvoiceStats, useInvoices } from "@/lib/api/hooks/invoice";
import type { InvoiceStatus } from "@/types/invoice";

const STATUS_BADGE: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  SENT: { label: "Sent", variant: "default" },
  PAID: { label: "Paid", variant: "outline" },
  OVERDUE: { label: "Overdue", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "secondary" },
};

function fmt(amount: string | number) {
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function BillingPage() {
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useInvoiceStats();
  const { data: recentData, isLoading: recentLoading } = useInvoices({ limit: 5 });
  const { data: overdueData } = useInvoices({ status: "OVERDUE", limit: 5 });

  const recentInvoices = recentData?.items ?? [];
  const overdueInvoices = overdueData?.items ?? [];

  return (
    <PageWrapper
      title="Billing & Finance"
      subtitle="Track invoices, payments, and revenue"
      actions={
        <Link href="/billing/invoices/new">
          <Button size="sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Invoice
          </Button>
        </Link>
      }
    >
      <div className="space-y-4">

        {statsError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-medium">Failed to load billing stats</p>
            <Button variant="outline" size="sm" onClick={() => refetchStats()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {statsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card px-4 py-4 space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-7 w-28" />
                  </div>
                ))
              ) : (
                <>
                  <StatCard
                    label="Total Invoiced"
                    value={fmt(stats ? (stats.totalOutstanding + stats.totalPaid) : 0)}
                    icon={FileText}
                    color="blue"
                  />
                  <StatCard
                    label="Received (Paid)"
                    value={fmt(stats?.totalPaid ?? 0)}
                    icon={CheckCircle2}
                    color="green"
                  />
                  <StatCard
                    label="Outstanding"
                    value={fmt(stats?.totalOutstanding ?? 0)}
                    icon={Clock}
                    color="amber"
                  />
                  <StatCard
                    label="Overdue"
                    value={`${stats?.overdue ?? 0} invoices`}
                    icon={AlertCircle}
                    color="red"
                  />
                </>
              )}
            </div>

            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {statsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card px-3.5 py-2.5 space-y-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-7 w-8" />
                  </div>
                ))
              ) : (
                (["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"] as InvoiceStatus[]).map((s) => {
                  const badge = STATUS_BADGE[s];
                  const count = stats?.[s.toLowerCase() as keyof typeof stats] as number ?? 0;
                  return (
                    <Link key={s} href={`/billing/invoices?status=${s}`}>
                      <div className="rounded-lg border border-border bg-card px-3.5 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer">
                        <p className="text-xs text-muted-foreground mb-1 truncate">{badge.label}</p>
                        <p className="text-xl font-bold tabular-nums">{count}</p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </>
        )}

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-border">
            <p className="text-sm font-semibold">Recent Invoices</p>
            <Link href="/billing/invoices">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          {recentLoading ? (
            <TableSkeleton rows={5} />
          ) : (
            <InvoiceTable invoices={recentInvoices} />
          )}
        </div>

        {overdueInvoices.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-card overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-destructive/30 bg-destructive/5">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm font-semibold text-destructive">Overdue Invoices</p>
              </div>
              <Link href="/billing/invoices?status=OVERDUE">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  View all <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <InvoiceTable invoices={overdueInvoices} />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 px-4 py-3 items-center">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16 ml-auto" />
              <Skeleton className="h-7 w-12 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InvoiceTable({
  invoices,
}: {
  invoices: Array<{
    id: number;
    invoiceNumber: string;
    status: InvoiceStatus;
    total: string;
    dueDate: string | null;
    client: { id: number; name: string } | null;
    createdAt: Date;
  }>;
}) {
  if (!invoices.length) {
    return (
      <EmptyState
        className="border-0 bg-transparent py-10"
        illustration={
          <EmptyDocumentsIllustration className="h-28 w-28 opacity-95" />
        }
        title="No invoices found"
        description="Create your first invoice to start tracking revenue."
        action={{ label: "New Invoice", href: "/billing/invoices/new" }}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
    <Table className="min-w-[640px]">
      <TableHeader>
        <TableRow>
          <TableHead>Invoice #</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => {
          const badge = STATUS_BADGE[inv.status];
          const overdue =
            inv.status !== "PAID" &&
            inv.status !== "CANCELLED" &&
            inv.dueDate &&
            isPast(new Date(inv.dueDate));
          return (
            <TableRow key={inv.id}>
              <TableCell className="font-mono text-xs font-medium">
                {inv.invoiceNumber}
              </TableCell>
              <TableCell className="text-sm">
                {inv.client?.name ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                <Badge variant={badge.variant} className="text-[11px]">
                  {badge.label}
                </Badge>
              </TableCell>
              <TableCell className={`text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {inv.dueDate ? format(new Date(inv.dueDate), "dd MMM yyyy") : "—"}
              </TableCell>
              <TableCell className="text-right font-medium text-sm">
                {fmt(inv.total)}
              </TableCell>
              <TableCell>
                <Link href={`/billing/invoices/${inv.id}`}>
                  <Button variant="ghost" size="sm" className="text-xs">
                    View
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </div>
  );
}

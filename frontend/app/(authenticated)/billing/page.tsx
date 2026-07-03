"use client";

import Link from "next/link";
import { useMemo } from "react";
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
  CreditCard,
} from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
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
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useInvoiceStats, useInvoices } from "@/hooks/api/invoice";
import { useSubscription } from "@/hooks/api/subscription";
import type { InvoiceStatus } from "@/types/invoice";

const PLAN_LABELS: Record<string, string> = {
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

const SUB_STATUS_BADGE: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  TRIAL: { label: "Trial", variant: "secondary" },
  ACTIVE: { label: "Active", variant: "default" },
  PAST_DUE: { label: "Past Due", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
  EXPIRED: { label: "Expired", variant: "outline" },
};

const STATUS_BADGE: Record<
  InvoiceStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  ISSUED: { label: "Issued", variant: "default" },
  PAID: { label: "Paid", variant: "outline" },
  FAILED: { label: "Failed", variant: "destructive" },
  VOIDED: { label: "Voided", variant: "secondary" },
};

function fmt(amount: string | number) {
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function BillingPage() {
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useInvoiceStats();
  const { data: recentData, isLoading: recentLoading } = useInvoices({
    limit: 5,
  });
  const { data: overdueData } = useInvoices({ status: "FAILED", limit: 5 });
  const { data: subData } = useSubscription();

  const now = useMemo(() => Date.now(), []);

  function handleRetryStats() {
    void refetchStats();
  }

  const recentInvoices = recentData?.items ?? [];
  const overdueInvoices = overdueData?.items ?? [];

  const sub = subData?.subscription;
  const subStatusInfo = sub ? SUB_STATUS_BADGE[sub.status] : null;
  const trialDaysRemaining =
    sub?.status === "TRIAL" && sub.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(sub.trialEndsAt).getTime() - now) / 86_400_000,
          ),
        )
      : null;

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
        {sub && (
          <div className="flex items-center gap-3 rounded-lg bg-blue-500/5 border border-blue-200 px-4 py-3">
            <CreditCard className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {PLAN_LABELS[sub.plan] ?? sub.plan} Plan
              </p>
              {sub.status === "TRIAL" && trialDaysRemaining !== null && (
                <p className="text-xs text-amber-600 mt-0.5">
                  Trial ends in{" "}
                  {trialDaysRemaining === 0
                    ? "today"
                    : `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""}`}
                  {sub.trialEndsAt && (
                    <>
                      {" "}
                      ·{" "}
                      {new Date(sub.trialEndsAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </>
                  )}
                </p>
              )}
              {sub.status === "ACTIVE" && sub.currentPeriodEnd && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Renews{" "}
                  {new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {subStatusInfo && (
                <Badge variant={subStatusInfo.variant} className="text-xs">
                  {subStatusInfo.label}
                </Badge>
              )}
              <Link href="/settings/subscription">
                <Button variant="outline" size="sm" className="text-xs">
                  Manage
                </Button>
              </Link>
            </div>
          </div>
        )}

        {statsError ? (
          <ErrorState
            compact
            title="Failed to load billing stats"
            description="Could not load billing statistics."
            onRetry={handleRetryStats}
          />
        ) : (
          <StatCardGrid cols={5}>
            <StatCard
              label="Total Invoiced"
              value={fmt(stats ? stats.totalOutstanding + stats.totalPaid : 0)}
              icon={FileText}
              tone="blue"
              isLoading={statsLoading}
            />
            <StatCard
              label="Received (Paid)"
              value={fmt(stats?.totalPaid ?? 0)}
              icon={CheckCircle2}
              tone="emerald"
              isLoading={statsLoading}
            />
            <StatCard
              label="Outstanding"
              value={fmt(stats?.totalOutstanding ?? 0)}
              icon={Clock}
              tone="amber"
              isLoading={statsLoading}
            />
            <StatCard
              label="Issued"
              value={stats?.issued ?? 0}
              icon={CreditCard}
              tone="default"
              href="/billing/invoices?status=ISSUED"
              isLoading={statsLoading}
            />
            <StatCard
              label="Failed"
              value={stats?.failed ?? 0}
              icon={AlertCircle}
              tone="red"
              href="/billing/invoices?status=FAILED"
              isLoading={statsLoading}
            />
          </StatCardGrid>
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
                <p className="text-sm font-semibold text-destructive">
                  Failed Invoices
                </p>
              </div>
              <Link href="/billing/invoices?status=FAILED">
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
            <div
              key={i}
              className="grid grid-cols-6 gap-4 px-4 py-3 items-center"
            >
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
          <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Invoice #</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Client</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Status</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Due Date</TableHead>
            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Amount</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => {
            const badge = STATUS_BADGE[inv.status];
            const overdue =
              inv.status !== "PAID" &&
              inv.status !== "VOIDED" &&
              inv.dueDate &&
              isPast(new Date(inv.dueDate));
            return (
              <TableRow key={inv.id} className="border-b border-border/50 hover:bg-muted/30">
                <TableCell className="font-mono text-xs font-medium">
                  {inv.invoiceNumber}
                </TableCell>
                <TableCell className="text-sm">
                  {inv.client?.name ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={badge.variant} className="text-[11px]">
                    {badge.label}
                  </Badge>
                </TableCell>
                <TableCell
                  className={`text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
                >
                  {inv.dueDate
                    ? format(new Date(inv.dueDate), "dd MMM yyyy")
                    : "—"}
                </TableCell>
                <TableCell className="text-right font-mono font-medium text-sm px-3 py-2">
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

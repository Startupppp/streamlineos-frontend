"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
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
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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

  const [now] = useState(() => Date.now());

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
          <div className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
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
          <InvoiceTable invoices={recentInvoices} isLoading={recentLoading} />
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

type InvoiceRow = {
  id: number;
  invoiceNumber: string;
  status: InvoiceStatus;
  total: string;
  dueDate: string | null;
  client: { id: number; name: string } | null;
  createdAt: Date;
};

const INVOICE_COLUMNS: DataTableColumn<InvoiceRow>[] = [
  {
    key: "invoiceNumber",
    header: "Invoice #",
    className: "font-mono text-xs font-medium",
    cell: (inv): ReactNode => inv.invoiceNumber,
  },
  {
    key: "client",
    header: "Client",
    className: "text-sm",
    cell: (inv): ReactNode =>
      inv.client?.name ?? (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "status",
    header: "Status",
    cell: (inv): ReactNode => {
      const badge = STATUS_BADGE[inv.status];
      return (
        <Badge variant={badge.variant} className="text-[11px]">
          {badge.label}
        </Badge>
      );
    },
  },
  {
    key: "dueDate",
    header: "Due Date",
    cell: (inv): ReactNode => {
      const overdue =
        inv.status !== "PAID" &&
        inv.status !== "VOIDED" &&
        inv.dueDate &&
        isPast(new Date(inv.dueDate));
      return (
        <span
          className={`text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
        >
          {inv.dueDate ? format(new Date(inv.dueDate), "dd MMM yyyy") : "—"}
        </span>
      );
    },
  },
  {
    key: "total",
    header: "Amount",
    headerClassName: "text-right",
    className: "text-right font-mono font-medium text-sm",
    cell: (inv): ReactNode => fmt(inv.total),
  },
  {
    key: "actions",
    header: "",
    cell: (inv): ReactNode => (
      <Link href={`/billing/invoices/${inv.id}`}>
        <Button variant="ghost" size="sm" className="text-xs">
          View
        </Button>
      </Link>
    ),
  },
];

const INVOICE_EMPTY_STATE = (
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

function getInvoiceRowKey(inv: InvoiceRow): string | number {
  return inv.id;
}

function InvoiceTable({
  invoices,
  isLoading,
}: {
  invoices: InvoiceRow[];
  isLoading?: boolean;
}) {
  return (
    <DataTable
      data={invoices}
      columns={INVOICE_COLUMNS}
      getRowKey={getInvoiceRowKey}
      isLoading={isLoading}
      emptyState={INVOICE_EMPTY_STATE}
      className="border-0 rounded-none"
    />
  );
}

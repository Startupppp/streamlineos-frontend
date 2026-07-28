"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Clock, DollarSign, AlertTriangle, Hash, FileDown, Receipt } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { useCan } from "@/hooks/api/access";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useBillingUninvoiced } from "@/hooks/api/timesheets-core/billing";
import { BillingExportDialog } from "./billing-export-dialog";
import { InvoiceDraftDialog } from "./invoice-draft-dialog";
import { formatMoney } from "./lib/format-money";
import type { BillingGroup } from "@/features/timesheets/types";

const now = new Date();
const DEFAULT_START = format(startOfMonth(now), "yyyy-MM-dd");
const DEFAULT_END = format(endOfMonth(now), "yyyy-MM-dd");

const BILLING_COLUMNS: DataTableColumn<BillingGroup>[] = [
  {
    key: "project",
    header: "Project",
    cell: (row) => <TruncatedText text={row.projectName} className="font-medium text-[11px]" />,
    className: "min-w-[160px]",
  },
  {
    key: "hours",
    header: "Hours",
    cell: (row) => (
      <span className="font-mono tabular-nums text-right block">{row.totalHours.toFixed(1)}</span>
    ),
    sortable: true,
    sortValue: (r) => r.totalHours,
    className: "text-right",
    headerClassName: "text-right",
  },
  {
    key: "rate",
    header: "Bill Rate",
    cell: (row) => (
      <span className="font-mono tabular-nums text-right block">
        {row.totalHours > 0 && row.billableAmount > 0
          ? formatMoney(row.billableAmount / row.totalHours, row.currency)
          : "—"}
      </span>
    ),
    className: "text-right",
    headerClassName: "text-right",
  },
  {
    key: "amount",
    header: "Amount",
    cell: (row) => (
      <span className="font-mono tabular-nums text-right block font-semibold">
        {formatMoney(row.billableAmount, row.currency)}
      </span>
    ),
    sortable: true,
    sortValue: (r) => r.billableAmount,
    className: "text-right",
    headerClassName: "text-right",
  },
  {
    key: "entries",
    header: "Entries",
    cell: (row) => (
      <span className="font-mono tabular-nums text-right block">{row.entryCount}</span>
    ),
    className: "text-right",
    headerClassName: "text-right",
  },
  {
    key: "status",
    header: "Status",
    cell: (row) =>
      row.missingRate ? (
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[10px] dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
          Missing rate
        </Badge>
      ) : (
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
          Ready
        </Badge>
      ),
  },
];

export function BillingView() {
  const canView = useCan("timesheets:billing:view");
  const canExport = useCan("timesheets:billing:export");
  const canInvoice = useCan("timesheets:billing:invoice");
  const shouldReduceMotion = useReducedMotion();

  const router = useRouter();
  const searchParams = useSearchParams();
  const startDate = searchParams.get("startDate") ?? DEFAULT_START;
  const endDate = searchParams.get("endDate") ?? DEFAULT_END;
  const projectIdParam = searchParams.get("projectId");
  const projectIdRaw = projectIdParam ? parseInt(projectIdParam, 10) : null;
  const parsedProjectId = projectIdRaw !== null && !isNaN(projectIdRaw) ? projectIdRaw : null;

  const [exportOpen, setExportOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useBillingUninvoiced(
    { startDate, endDate, projectId: parsedProjectId ?? undefined },
    canView,
  );

  const groups = data?.groups ?? [];
  const totals = data?.totals;

  const projectOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const g of data?.groups ?? []) {
      if (g.projectId !== null) seen.set(g.projectId, g.projectName);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [data?.groups]);

  const hasMissingRates = groups.some((g) => g.missingRate);
  const missingRateCount = groups.filter((g) => g.missingRate).length;
  const totalEntries = groups.reduce((sum, g) => sum + g.entryCount, 0);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null) params.delete(k);
        else params.set(k, v);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleDateRangeChange = useCallback(
    (range: { from: string; to: string }) =>
      updateParams({ startDate: range.from || null, endDate: range.to || null }),
    [updateParams],
  );

  const handleProjectChange = useCallback(
    (value: string) => updateParams({ projectId: value === "ALL" ? null : value }),
    [updateParams],
  );

  const handleExportOpen = useCallback(() => setExportOpen(true), []);
  const handleInvoiceOpen = useCallback(() => setInvoiceOpen(true), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const totalsAmountLabel = totals
    ? totals.mixed
      ? totals.byCurrency.map((c) => formatMoney(c.amount, c.currency)).join(" + ")
      : formatMoney(totals.amount ?? 0, totals.currency ?? "USD")
    : formatMoney(0, "USD");

  const convertedLabel =
    totals?.mixed && totals.converted
      ? `≈ ${formatMoney(totals.converted.convertedTotal, totals.converted.baseCurrency)}`
      : null;

  const subtitle = totals
    ? `${totals.hours.toFixed(1)} h · ${totalsAmountLabel}${convertedLabel ? ` (${convertedLabel})` : ""}`
    : undefined;

  const motionProps = shouldReduceMotion
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22, ease: "easeOut" as const } };

  const emptyState = (
    <EmptyState
      illustration={<EmptyReportIllustration className="h-32 w-32" />}
      title="No uninvoiced billable hours"
      description="All billable hours for this period have been invoiced."
    />
  );

  if (!canView) {
    return (
      <PageWrapper title="Billing Queue">
        <EmptyState
          illustration={<EmptyReportIllustration className="h-32 w-32" />}
          title="Access restricted"
          description="You don't have permission to view billing data."
        />
      </PageWrapper>
    );
  }

  const pageActions = (
    <div className="flex items-center gap-2">
      {canExport && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleExportOpen}
          disabled={groups.length === 0 || isLoading}
        >
          <FileDown className="h-3.5 w-3.5" />
          Export
        </Button>
      )}
      {canInvoice && (
        <Button
          size="sm"
          className="gap-1.5"
          onClick={handleInvoiceOpen}
          disabled={groups.length === 0 || isLoading}
        >
          <Receipt className="h-3.5 w-3.5" />
          Create invoice draft
        </Button>
      )}
    </div>
  );

  const pageFilters = (
    <>
      <DateRangePicker from={startDate} to={endDate} onChange={handleDateRangeChange} />
      <Select
        value={parsedProjectId !== null ? String(parsedProjectId) : "ALL"}
        onValueChange={handleProjectChange}
      >
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[160px]")} aria-label="Filter by project">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="ALL">All projects</SelectItem>
          {projectOptions.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <PageWrapper
      title="Billing Queue"
      subtitle={subtitle}
      actions={pageActions}
      filters={pageFilters}
    >
      <motion.div {...motionProps} className="flex flex-1 min-h-0 flex-col space-y-4">
        <StatCardGrid cols={4}>
          <StatCard
            label="Uninvoiced Hours"
            value={isLoading ? "-" : (totals?.hours ?? 0).toFixed(1)}
            icon={Clock}
            tone="blue"
            isLoading={isLoading}
          />
          <StatCard
            label="Uninvoiced Amount"
            value={isLoading ? "-" : totalsAmountLabel}
            icon={DollarSign}
            tone="emerald"
            isLoading={isLoading}
          />
          <StatCard
            label="Missing Rates"
            value={isLoading ? "-" : missingRateCount}
            icon={AlertTriangle}
            tone={missingRateCount > 0 ? "amber" : "default"}
            hint={missingRateCount > 0 ? "Set in Settings → Rates" : undefined}
            isLoading={isLoading}
          />
          <StatCard
            label="Entries"
            value={isLoading ? "-" : totalEntries}
            icon={Hash}
            tone="default"
            isLoading={isLoading}
          />
        </StatCardGrid>

        {hasMissingRates && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Some projects are missing bill rates.{" "}
              <Link href="/timesheets/settings?tab=rates" className="underline font-medium">
                Set rates in Settings → Rates
              </Link>{" "}
              to include them in exports.
            </span>
          </div>
        )}

        {isError ? (
          <ErrorState
            title="Couldn't load billing data"
            description="Something went wrong loading uninvoiced hours for this period."
            onRetry={handleRetry}
            className="flex-1 min-h-[40dvh]"
          />
        ) : (
          <DataTable
            data={groups}
            columns={BILLING_COLUMNS}
            getRowKey={(r) => r.projectId ?? r.projectName}
            isLoading={isLoading}
            emptyState={emptyState}
            minWidth="700px"
          />
        )}
      </motion.div>

      {exportOpen && (
        <BillingExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          startDate={startDate}
          endDate={endDate}
          groups={groups}
          projectId={parsedProjectId}
        />
      )}

      {invoiceOpen && (
        <InvoiceDraftDialog
          open={invoiceOpen}
          onOpenChange={setInvoiceOpen}
          startDate={startDate}
          endDate={endDate}
          projectId={parsedProjectId}
          groups={groups}
        />
      )}
    </PageWrapper>
  );
}

export function BillingPageSkeleton() {
  return (
    <PageWrapper
      title="Billing Queue"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      }
      filters={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-48 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      }
    >
      <div className="space-y-4">
        <StatCardGridSkeleton cols={4} />
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-3 py-2 flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 flex-1" />
              ))}
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-2 px-3 py-2 border-b last:border-0">
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-3 flex-1" />
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

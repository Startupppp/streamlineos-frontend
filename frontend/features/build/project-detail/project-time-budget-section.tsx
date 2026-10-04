"use client";

import { useState } from "react";
import { Clock, TrendingUp, AlertCircle, CheckCircle, Hourglass } from "lucide-react";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { PageState } from "@/components/shared/page-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PmSection, PmPanel } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { usePageState } from "@/hooks/api/use-page-state";
import { useProjectTimeBudget } from "@/hooks/api/build/reports";

const RANGE_OPTIONS = [
  { value: "this_month", label: "This month" },
  { value: "last_30", label: "Last 30 days" },
  { value: "this_quarter", label: "This quarter" },
] as const;

type RangeKey = (typeof RANGE_OPTIONS)[number]["value"];

function toDateRange(key: RangeKey): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const to = fmt(now);
  if (key === "last_30") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from: fmt(from), to };
  }
  if (key === "this_quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const from = new Date(now.getFullYear(), q * 3, 1);
    return { from: fmt(from), to };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: fmt(from), to };
}

const RECONCILE_TONE: Record<
  string,
  { label: string; icon: typeof CheckCircle; color: string }
> = {
  unstarted: { label: "Unstarted", icon: Hourglass, color: "text-muted-foreground" },
  gl_pending: { label: "GL pending", icon: AlertCircle, color: "text-yellow-500" },
  matched: { label: "Matched", icon: CheckCircle, color: "text-emerald-500" },
  unmatched: { label: "Unmatched", icon: AlertCircle, color: "text-status-danger-ink" },
  currency_mismatch: { label: "Currency mismatch", icon: AlertCircle, color: "text-yellow-500" },
};

interface ProjectTimeBudgetSectionProps {
  projectId: number;
}

export function ProjectTimeBudgetSection({ projectId }: ProjectTimeBudgetSectionProps) {
  const [rangeKey, setRangeKey] = useState<RangeKey>("this_month");
  const range = toDateRange(rangeKey);
  const {
    data,
    isLoading,
    isError,
    error,
  } = useProjectTimeBudget(projectId, range.from, range.to);

  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
    isEmpty: !data,
  });

  const reconcile = data ? (RECONCILE_TONE[data.reconciliationStatus] ?? RECONCILE_TONE.unstarted) : null;
  const ReconIcon = reconcile?.icon ?? Hourglass;

  const varianceMajor = data?.varianceMinor !== null && data?.varianceMinor !== undefined
    ? data.varianceMinor / 100
    : null;

  const primaryCostEntry = data?.costEntries?.[0] ?? null;
  const totalCostMinor = data?.costEntries?.reduce((s, e) => s + e.costMinor, 0) ?? 0;
  const primaryCurrency = primaryCostEntry?.currency ?? data?.glFunctionalCurrency ?? null;
  const allRateSources = [...new Set(data?.costEntries?.flatMap((e) => e.rateSources) ?? [])];

  return (
    <PmSection index={3}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={cn("text-sm font-medium", TEXT_ONE_LINE)}>
          Time &amp; Cost Analytics
        </h3>
        <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
          <SelectTrigger className="h-7 w-36 text-xs" aria-label="Select date range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PageState
        resolution={pageState}
        loading={<StatCardGridSkeleton cols={3} />}
        empty={
          <div className="py-4 text-center text-xs text-muted-foreground">
            No timesheet or cost data for this period.
          </div>
        }
      >
        <StatCardGrid cols={3}>
          <StatCard
            label="Logged Hours"
            value={`${data?.loggedHours?.toFixed(1) ?? "—"} hrs`}
            icon={Clock}
            hint={`${data?.billableHours?.toFixed(1) ?? 0} billable · ${data?.nonBillableHours?.toFixed(1) ?? 0} non-billable`}
            tone="default"
          />
          <StatCard
            label="Timesheet Cost"
            value={
              totalCostMinor > 0
                ? `${primaryCurrency ?? ""} ${(totalCostMinor / 100).toFixed(2)}`
                : "—"
            }
            icon={TrendingUp}
            hint={
              allRateSources.length > 0
                ? `Rate: ${allRateSources.join(", ")}`
                : "No rated entries"
            }
            tone="default"
          />
          <StatCard
            label="GL Expense"
            value={
              data?.glExpenseDebitMinor !== undefined && data.glExpenseDebitMinor > 0
                ? `${data.glFunctionalCurrency ?? ""} ${(data.glExpenseDebitMinor / 100).toFixed(2)}`
                : "—"
            }
            icon={TrendingUp}
            hint={
              varianceMajor !== null
                ? `Variance: ${data?.budgetCurrency ?? ""} ${Math.abs(varianceMajor).toFixed(2)} ${varianceMajor >= 0 ? "under" : "over"}`
                : "No estimate set"
            }
            tone={
              varianceMajor !== null && varianceMajor < 0 ? "red" : "default"
            }
          />
        </StatCardGrid>

        {reconcile && (
          <PmPanel className="mt-3 p-3 flex items-center gap-2">
            <ReconIcon className={cn("h-4 w-4 shrink-0", reconcile.color)} />
            <span className="text-xs text-muted-foreground">
              Reconciliation:
            </span>
            <Badge variant="outline" className="text-xs">
              {reconcile.label}
            </Badge>
            {data?.estimateBudgetMinor !== null && data?.estimateBudgetMinor !== undefined && (
              <span className="ml-auto text-xs text-muted-foreground">
                Estimate: {data.budgetCurrency ?? ""} {(data.estimateBudgetMinor / 100).toFixed(2)}
              </span>
            )}
          </PmPanel>
        )}
      </PageState>
    </PmSection>
  );
}

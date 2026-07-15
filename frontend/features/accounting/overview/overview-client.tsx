"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DatePicker } from "@/components/ui/date-picker";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyChartIllustration } from "@/components/illustrations";
import { useAccountingOverview } from "@/hooks/api/accounting/overview";
import {
  FiTrendingUpIcon,
  FiTrendingDownIcon,
  FiRefreshCcwIcon,
  FiCircleCheckIcon,
  FiWalletIcon,
  FiPiggyBankIcon,
} from "@/features/accounting/shared";
import { TrendingUp, TrendingDown, AlertCircle, Landmark } from "lucide-react";
import { RevenueTrendChart } from "./revenue-trend-chart";
import { BankAccountsList } from "./bank-accounts-list";
import { ActionCard } from "./action-card";
import { OverviewSkeleton } from "./overview-skeleton";
import { InsightsStrip } from "./insights-strip";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatINRCompact } from "@/lib/format-utils";

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

function fmtInr(s: string): string {
  return formatINRCompact(Number(s) || 0);
}

function fmtInrFull(s: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(s) || 0);
}

const STAGGER = {
  container: { animate: { transition: { staggerChildren: 0.08 } } },
  item: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" as const } },
  },
};

export function OverviewClient() {
  const defaults = currentMonthRange();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);

  const { data, isLoading, error, refetch } = useAccountingOverview({ from, to });

  function handleFromChange(v: string): void {
    setFrom(v);
  }

  function handleToChange(v: string): void {
    setTo(v);
  }

  function handleRetry(): void {
    void refetch();
  }

  const isEmptyOrg =
    !isLoading &&
    !error &&
    data !== undefined &&
    Number(data.cashBalance) === 0 &&
    data.bankAccounts.length === 0 &&
    data.monthlyTrend.every((m) => Number(m.revenue) === 0 && Number(m.expenses) === 0);

  const netProfitNum = data ? Number(data.netProfit) : 0;

  return (
    <PageWrapper
      title="Finance Overview"
      subtitle="Real-time cash, revenue, and liquidity metrics."
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="ov-from" className="text-[11px] font-medium text-muted-foreground leading-none">
              From
            </label>
            <DatePicker
              id="ov-from"
              value={from}
              onChange={handleFromChange}
              placeholder="Start date"
              className="w-[140px] text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="ov-to" className="text-[11px] font-medium text-muted-foreground leading-none">
              To
            </label>
            <DatePicker
              id="ov-to"
              value={to}
              onChange={handleToChange}
              placeholder="End date"
              className="w-[140px] text-sm"
            />
          </div>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex flex-1 min-h-0 flex-col"><OverviewSkeleton /></div>
      ) : error ? (
        <ErrorState
          title="Failed to load finance overview"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : isEmptyOrg ? (
        <EmptyState
          illustration={<EmptyChartIllustration />}
          title="No financial data yet"
          description="Set up your chart of accounts and connect a bank account to start tracking finances."
          action={{ label: "Set up accounts", href: "/accounting/coa" }}
          secondaryAction={{ label: "Banking settings", href: "/accounting/settings" }}
        />
      ) : (
        <motion.div
          className="flex flex-1 min-h-0 flex-col space-y-4"
          variants={STAGGER.container}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={STAGGER.item}>
            <StatCardGrid cols={4}>
              <StatCard
                label="Cash Balance"
                value={data ? fmtInr(data.cashBalance) : "—"}
                icon={Landmark}
                tone="blue"
                hint={data ? `${data.bankAccounts.length} account${data.bankAccounts.length !== 1 ? "s" : ""}` : undefined}
                href="/accounting/banking"
              />
              <StatCard
                label="Revenue"
                value={data ? fmtInr(data.revenueThisMonth) : "—"}
                icon={TrendingUp}
                tone="emerald"
                href="/accounting/invoices"
              />
              <StatCard
                label="Expenses"
                value={data ? fmtInr(data.expensesThisMonth) : "—"}
                icon={TrendingDown}
                tone="amber"
                href="/accounting/purchase-bills"
              />
              <StatCard
                label="Net Profit"
                value={data ? fmtInr(data.netProfit) : "—"}
                icon={netProfitNum >= 0 ? TrendingUp : AlertCircle}
                tone={netProfitNum >= 0 ? "emerald" : "red"}
                delta={
                  data
                    ? {
                        value: netProfitNum >= 0 ? "Profit" : "Loss",
                        direction: netProfitNum >= 0 ? "up" : "down",
                      }
                    : undefined
                }
                href="/accounting/profit-loss"
              />
            </StatCardGrid>
          </motion.div>

          <motion.div variants={STAGGER.item}>
            <InsightsStrip from={from} to={to} />
          </motion.div>

          <motion.div variants={STAGGER.item}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <ActionCard
                title="AR Overdue"
                value={data ? `${data.arOverdue.count} inv` : "—"}
                description={data ? `${fmtInrFull(data.arOverdue.amount)} overdue` : ""}
                href="/accounting/invoices?status=OVERDUE"
                Icon={FiTrendingUpIcon}
                tone="red"
              />
              <ActionCard
                title="AP Due (7d)"
                value={data ? `${data.apDueNext7.count} bills` : "—"}
                description={data ? `${fmtInrFull(data.apDueNext7.amount)} due` : ""}
                href="/accounting/purchase-bills"
                Icon={FiTrendingDownIcon}
                tone="amber"
              />
              <ActionCard
                title="Tax Payable"
                value={data ? fmtInrFull(data.taxPayable) : "—"}
                description="Estimated GST liability"
                href="/accounting/taxes"
                Icon={FiWalletIcon}
                tone="default"
              />
              <ActionCard
                title="Cash Runway"
                value={data?.runwayMonths != null ? `${data.runwayMonths}mo` : "N/A"}
                description={data ? `Burn: ${fmtInrFull(data.burnRate)}/mo` : ""}
                href="/accounting/reports/burn-rate"
                Icon={FiPiggyBankIcon}
                tone="default"
              />
            </div>
          </motion.div>

          <motion.div variants={STAGGER.item}>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
              {data && data.monthlyTrend.length > 0 ? (
                <RevenueTrendChart data={data.monthlyTrend} />
              ) : (
                <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-center min-h-[280px]">
                  <EmptyState
                    illustration={<EmptyChartIllustration />}
                    title="No trend data"
                    description="Revenue and expense data will appear after journal entries are posted."
                    compact
                  />
                </div>
              )}

              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-foreground">Bank Accounts</p>
                    <Link href="/accounting/banking" className="text-xs text-primary hover:underline">
                      View all
                    </Link>
                  </div>
                  <BankAccountsList accounts={data?.bankAccounts ?? []} />
                </div>

                <ActionCard
                  title="Reconciliation Gaps"
                  value={data?.reconciliationGaps ?? 0}
                  description="Unmatched transactions needing review"
                  href="/accounting/banking/reconciliation"
                  Icon={FiRefreshCcwIcon}
                  tone={data && data.reconciliationGaps > 0 ? "amber" : "default"}
                />
                <ActionCard
                  title="Open Approvals"
                  value={data?.openApprovals ?? 0}
                  description="Pending accounting approval requests"
                  href="/accounting/approvals"
                  Icon={FiCircleCheckIcon}
                  tone={data && data.openApprovals > 0 ? "amber" : "default"}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </PageWrapper>
  );
}

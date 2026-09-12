"use client";

import { startOfMonth } from "date-fns";
import { Banknote, Receipt, TrendingUp, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import { useAccountingBook } from "@/hooks/api/accounting/ledger";
import {
  useAgingReport,
  useCashFlowReport,
  useProfitLossReport,
  useTrialBalanceReport,
} from "@/hooks/api/accounting/reports";
import { formatMinorMoneyCompact } from "@/lib/accounting/money";
import { formatDateOnly, getTodayString } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { ReconciliationBanner } from "@/features/accounting/reports";
import { HubQuickLinks } from "./hub-quick-links";

export function AccountingHubClient() {
  const canRead = useCan("accounting:read");
  const canReadReports = useCan("accounting:reports:read");

  const today = getTodayString();
  const monthStart = formatDateOnly(startOfMonth(new Date()));

  const book = useAccountingBook();
  const enabled = !!book.data && !book.isError;

  const cashFlow = useCashFlowReport(
    { from: monthStart, to: today },
    { enabled: enabled && canReadReports },
  );
  const profitLoss = useProfitLossReport(
    { from: monthStart, to: today },
    { enabled: enabled && canReadReports },
  );
  const receivable = useAgingReport(
    { side: "ar", asOf: today },
    { enabled: enabled && canReadReports },
  );
  const payable = useAgingReport(
    { side: "ap", asOf: today },
    { enabled: enabled && canReadReports },
  );
  const trialBalance = useTrialBalanceReport(
    { asOf: today },
    { enabled: enabled && canReadReports },
  );

  const currency = book.data?.baseCurrency ?? "";
  const statsLoading =
    cashFlow.isLoading || profitLoss.isLoading || receivable.isLoading || payable.isLoading;
  const statsError =
    cashFlow.isError || profitLoss.isError || receivable.isError || payable.isError;

  function handleRetry() {
    cashFlow.refetch();
    profitLoss.refetch();
    receivable.refetch();
    payable.refetch();
    trialBalance.refetch();
  }

  return (
    <PageWrapper
      title="Accounting"
      subtitle="Where the money is, who owes what, and whether this month made a profit."
      variant="display"
    >
      {!canRead ? (
        <NoPermissionState permission="accounting:read" />
      ) : book.isLoading ? (
        <StatCardGridSkeleton cols={4} />
      ) : !enabled ? (
        <EmptyState
          className="min-h-[60vh] flex-1"
          title="Accounting is not switched on yet"
          description="Pick your country and we will open your first financial year and seed a chart of accounts that suits it. It takes about a minute."
          action={{ label: "Set up accounting", href: "/accounting/setup" }}
        />
      ) : (
        <div className="flex min-h-0 w-full flex-1 flex-col gap-4 pb-4">
          {!canReadReports ? null : statsError ? (
            <ErrorState
              compact
              title="Couldn't load your figures"
              description={getErrorMessage(
                cashFlow.error ?? profitLoss.error ?? receivable.error ?? payable.error,
              )}
              onRetry={handleRetry}
            />
          ) : statsLoading ? (
            <StatCardGridSkeleton cols={4} />
          ) : (
            <StatCardGrid className="shrink-0">
              <StatCard
                label="Cash in the bank"
                value={formatMinorMoneyCompact(cashFlow.data?.closingCashMinor ?? 0, currency)}
                icon={Banknote}
                tone="emerald"
                href="/accounting/cash-flow"
              />
              <StatCard
                label="What customers owe us"
                value={formatMinorMoneyCompact(receivable.data?.totalOpenMinor ?? 0, currency)}
                icon={Users}
                tone="blue"
                href="/accounting/reports/aging?side=ar"
              />
              <StatCard
                label="What we owe"
                value={formatMinorMoneyCompact(payable.data?.totalOpenMinor ?? 0, currency)}
                icon={Receipt}
                tone="amber"
                href="/accounting/reports/aging?side=ap"
              />
              <StatCard
                label="Profit so far this month"
                value={formatMinorMoneyCompact(profitLoss.data?.netProfitMinor ?? 0, currency)}
                icon={TrendingUp}
                tone={(profitLoss.data?.netProfitMinor ?? 0) >= 0 ? "emerald" : "red"}
                href="/accounting/profit-loss"
              />
            </StatCardGrid>
          )}

          {trialBalance.data && !trialBalance.data.balanced ? (
            <ReconciliationBanner
              ok={false}
              differenceMinor={trialBalance.data.differenceMinor}
              currency={trialBalance.data.currency}
              okTitle=""
              failTitle="Your books do not balance right now"
              failDescription="Total debits and total credits disagree, which means every report on this page is currently unreliable. Open the trial balance to see which accounts are involved."
            />
          ) : null}

          <HubQuickLinks />
        </div>
      )}
    </PageWrapper>
  );
}

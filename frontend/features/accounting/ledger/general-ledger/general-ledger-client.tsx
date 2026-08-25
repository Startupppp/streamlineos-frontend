"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startOfMonth } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import { usePostableAccounts } from "@/hooks/api/accounting/ledger";
import {
  useAccountLedgerWindow,
  useTrialBalanceReport,
} from "@/hooks/api/accounting/reports";
import { balanceDirection, formatMoney } from "@/lib/accounting/money";
import { formatDateOnly, getTodayString } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";

export function GeneralLedgerClient() {
  const canRead = useCan("accounting:general-ledger:read");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const accountId = searchParams.get("accountId") ?? "";
  const from = searchParams.get("from") ?? formatDateOnly(startOfMonth(new Date()));
  const to = searchParams.get("to") ?? getTodayString();

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const accounts = usePostableAccounts();
  const window = useAccountLedgerWindow(accountId, { from, to }, { enabled: !!accountId });
  const trialBalance = useTrialBalanceReport(
    { asOf: to, includeZeroActivity: true },
    { enabled: !!accountId },
  );

  const accountOptions = useMemo(
    () =>
      (accounts.data ?? []).map((account) => ({
        value: account.id,
        label: `${account.code} · ${account.name}`,
        sublabel: account.isCash ? "Bank or cash" : undefined,
      })),
    [accounts.data],
  );

  const account = (accounts.data ?? []).find((row) => row.id === accountId);
  const closingLine = trialBalance.data?.lines.find((line) => line.accountId === accountId);
  const currency = trialBalance.data?.currency ?? "";
  const isError = window.isError || trialBalance.isError;
  const isLoading = !!accountId && (window.isLoading || trialBalance.isLoading);

  function handleRetry() {
    window.refetch();
    trialBalance.refetch();
  }

  return (
    <PageWrapper
      title="Account ledger"
      subtitle="Pick an account to see where it stood at the start of a window and where it stands now."
      backHref="/accounting/coa"
      backLabel="Back to the chart of accounts"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <div className="min-w-0 flex-1 lg:max-w-md">
            <Combobox
              options={accountOptions}
              value={accountId}
              onChange={(value) => setParam("accountId", value)}
              placeholder="Pick an account"
              searchPlaceholder="Search accounts…"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-label font-medium text-muted-foreground">From</span>
            <DatePicker
              value={from}
              onChange={(value) => setParam("from", value)}
              className="w-[11rem]"
            />
            <span className="text-label font-medium text-muted-foreground">to</span>
            <DatePicker
              value={to}
              onChange={(value) => setParam("to", value)}
              className="w-[11rem]"
            />
          </div>
        </div>
      }
    >
      {!canRead ? (
        <NoPermissionState permission="accounting:general-ledger:read" />
      ) : isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load this account"
          description={getErrorMessage(window.error ?? trialBalance.error)}
          onRetry={handleRetry}
        />
      ) : !accountId ? (
        <EmptyState
          className="min-h-[50vh] flex-1"
          title="Pick an account"
          description="Choose an account above, or arrive here by clicking a line on any report."
        />
      ) : isLoading ? (
        <StatCardGridSkeleton cols={4} />
      ) : (
        <div className="flex min-h-0 w-full flex-1 flex-col gap-3">
          <StatCardGrid className="shrink-0">
            <StatCard
              label={`Balance on ${from}`}
              value={formatMoney(
                Math.abs(window.data?.opening.balanceMinor ?? 0),
                currency,
              )}
              hint={
                balanceDirection(window.data?.opening.balanceMinor ?? 0) === "debit"
                  ? "Debit balance"
                  : "Credit balance"
              }
            />
            <StatCard
              label={`Debits up to ${to}`}
              value={formatMoney(closingLine?.movementDebitMinor ?? 0, currency)}
            />
            <StatCard
              label={`Credits up to ${to}`}
              value={formatMoney(closingLine?.movementCreditMinor ?? 0, currency)}
            />
            <StatCard
              label={`Balance on ${to}`}
              value={formatMoney(
                (closingLine?.debitMinor ?? 0) > 0
                  ? (closingLine?.debitMinor ?? 0)
                  : (closingLine?.creditMinor ?? 0),
                currency,
              )}
              hint={(closingLine?.debitMinor ?? 0) > 0 ? "Debit balance" : "Credit balance"}
            />
          </StatCardGrid>

          <Card className="py-0">
            <CardContent className="space-y-2 p-4">
              <p className="text-sm font-semibold">
                {account ? `${account.code} · ${account.name}` : "Account"}
              </p>
              <p className="text-label text-muted-foreground">
                Entry-by-entry detail for a single account is not served by the API yet. To see
                the postings behind these figures, open the journal an entry belongs to from the
                document that created it.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </PageWrapper>
  );
}

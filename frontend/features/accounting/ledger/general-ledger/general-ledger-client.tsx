"use client";

import { useMemo, useCallback } from "react";
import { startOfMonth } from "date-fns";
import { Combobox } from "@/components/ui/combobox";
import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ErrorState, PageState } from "@/components/shared";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { usePageState } from "@/hooks/api/use-page-state";
import { useAccountLedger, usePostableAccounts } from "@/hooks/api/accounting/ledger";
import { balanceDirection, formatMinorMoney } from "@/lib/accounting/money";
import { formatDateOnly, getTodayString } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useListUrlState } from "../../sales/use-list-url-state";
import { buildLedgerColumns } from "./general-ledger-columns";

const LEDGER_READ = "accounting:general-ledger:read";

export function GeneralLedgerClient() {
  const url = useListUrlState();

  const accountId = url.get("accountId");
  const from = url.get("from") || formatDateOnly(startOfMonth(new Date()));
  const to = url.get("to") || getTodayString();

  const accounts = usePostableAccounts();
  const ledger = useAccountLedger(
    accountId,
    { from, to, page: url.page, pageSize: url.pageSize },
    { enabled: !!accountId },
  );

  const pageState = usePageState({
    permission: LEDGER_READ,
    isLoading: accounts.isLoading,
    isError: accounts.isError,
    error: accounts.error,
  });
  const handleRetry = useCallback(() => { void accounts.refetch(); }, [accounts]);

  const accountOptions = useMemo(
    () =>
      (accounts.data ?? []).map((account) => ({
        value: account.id,
        label: `${account.code} · ${account.name}`,
        sublabel: account.isCash ? "Bank or cash" : undefined,
      })),
    [accounts.data],
  );

  const currency = ledger.data?.currency ?? "";
  const entries = ledger.data?.entries ?? [];
  const openingMinor = ledger.data?.opening.balanceMinor ?? 0;
  const closingMinor = ledger.data?.closingBalanceMinor ?? 0;

  const columns = buildLedgerColumns(currency);

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper title="Account ledger">
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Account ledger"
      subtitle={
        ledger.data
          ? `${ledger.data.code} · ${ledger.data.name}`
          : "Pick an account to see every posting behind its balance."
      }
      backHref="/accounting/coa"
      backLabel="Back to the chart of accounts"
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <div className="min-w-0 flex-1 lg:max-w-md">
            <Combobox
              options={accountOptions}
              value={accountId}
              onChange={(value) => url.setParams({ accountId: value || undefined })}
              placeholder="Pick an account"
              searchPlaceholder="Search accounts…"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-label font-medium text-muted-foreground">From</span>
            <DatePicker
              value={from}
              onChange={(value) => url.setParams({ from: value || undefined })}
              className="w-[11rem]"
            />
            <span className="text-label font-medium text-muted-foreground">to</span>
            <DatePicker
              value={to}
              onChange={(value) => url.setParams({ to: value || undefined })}
              className="w-[11rem]"
            />
          </div>
        </div>
      }
    >
      {!accountId ? (
        <EmptyState
          className="min-h-[50vh] flex-1"
          illustrationPreset="report"
          title="Pick an account"
          description="Choose an account above, or arrive here by clicking a line on any report."
        />
      ) : ledger.isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load this account"
          description={getErrorMessage(ledger.error)}
          onRetry={() => void ledger.refetch()}
        />
      ) : (
        <>
          <StatCardGrid cols={4} className="mb-2">
            <StatCard
              label={`Brought forward to ${from}`}
              value={formatMinorMoney(Math.abs(openingMinor), currency)}
              hint={balanceDirection(openingMinor) === "debit" ? "Debit balance" : "Credit balance"}
              isLoading={ledger.isPending}
            />
            <StatCard
              label="Debits in this window"
              value={formatMinorMoney(ledger.data?.periodDebitMinor ?? 0, currency)}
              isLoading={ledger.isPending}
            />
            <StatCard
              label="Credits in this window"
              value={formatMinorMoney(ledger.data?.periodCreditMinor ?? 0, currency)}
              isLoading={ledger.isPending}
            />
            <StatCard
              label={`Balance on ${to}`}
              value={formatMinorMoney(Math.abs(closingMinor), currency)}
              hint={balanceDirection(closingMinor) === "debit" ? "Debit balance" : "Credit balance"}
              tone="blue"
              isLoading={ledger.isPending}
            />
          </StatCardGrid>

          <DataTable
            data={entries}
            columns={columns}
            getRowKey={(row) => row.lineId}
            isLoading={ledger.isLoading}
            minWidth="1000px"
            className="flex-1 min-h-0"
            emptyState={
              <EmptyState
                className="border-0 bg-transparent min-h-[40vh]"
                illustrationPreset="report"
                title="Nothing posted in this window"
                description="Widen the dates, or pick another account."
              />
            }
            pagination={{
              mode: "server",
              page: url.page,
              pageSize: url.pageSize,
              total: ledger.data?.total ?? 0,
              onPageChange: url.setPage,
              onPageSizeChange: url.setPageSize,
              pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
            }}
          />
        </>
      )}
    </PageWrapper>
  );
}

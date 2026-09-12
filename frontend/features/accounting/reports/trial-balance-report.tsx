"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { useCan } from "@/hooks/api/access";
import { useTrialBalanceReport } from "@/hooks/api/accounting/reports";
import { formatMinorMoney } from "@/lib/accounting/money";
import type { TrialBalanceLine } from "@/types/accounting-reports";
import { AsOfControls } from "./report-date-controls";
import { ExportReportButton } from "./export-report-button";
import { ReportSwitch } from "./report-switch";
import { ReconciliationBanner } from "./reconciliation-banner";
import { ReportShell } from "./report-shell";
import { useReportControls } from "./use-report-controls";

export function TrialBalanceReport() {
  const canView = useCan("accounting:reports:read");
  const controls = useReportControls();
  const includeZeroActivity = controls.includeZeroActivity;

  const params = { asOf: controls.asOf, labelMode: controls.labelMode, includeZeroActivity };
  const { data, isLoading, isError, error, refetch } = useTrialBalanceReport(params);

  const currency = data?.currency ?? "";

  const columns: DataTableColumn<TrialBalanceLine>[] = [
    {
      key: "account",
      header: data?.columns.account ?? "Account",
      cell: (row) => (
        <Link
          href={`/accounting/general-ledger?accountId=${row.accountId}&to=${controls.asOf}`}
          className="flex min-w-0 flex-col text-status-info-ink hover:underline"
        >
          <span className="truncate">
            <span className="mr-2 font-mono text-dense">{row.code}</span>
            {row.name}
          </span>
        </Link>
      ),
    },
    {
      key: "type",
      header: "Kind",
      cell: (row) => (
        <span className="text-muted-foreground">{row.accountTypeLabel}</span>
      ),
    },
    {
      key: "debit",
      header: data?.columns.debit ?? "Debit",
      className: "text-right font-mono tabular-nums whitespace-nowrap",
      headerClassName: "text-right",
      cell: (row) =>
        row.debitMinor === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          formatMinorMoney(row.debitMinor, currency)
        ),
    },
    {
      key: "credit",
      header: data?.columns.credit ?? "Credit",
      className: "text-right font-mono tabular-nums whitespace-nowrap",
      headerClassName: "text-right",
      cell: (row) =>
        row.creditMinor === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          formatMinorMoney(row.creditMinor, currency)
        ),
    },
  ];

  return (
    <ReportShell
      title={data?.title ?? "Trial balance"}
      subtitle="Every account with a closing balance, checked against itself."
      backHref="/accounting"
      canView={canView}
      permission="accounting:reports:read"
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={refetch}
      skeletonColumns={4}
      fill
      filters={
        <AsOfControls
          asOf={controls.asOf}
          onAsOfChange={controls.setAsOf}
          labelMode={controls.labelMode}
          onLabelModeChange={controls.setLabelMode}
          extra={
            <ReportSwitch
              label="Show accounts with no activity"
              checked={includeZeroActivity}
              onCheckedChange={controls.setIncludeZeroActivity}
            />
          }
        />
      }
      actions={
        <ExportReportButton
          report="trial-balance"
          params={params}
          filename={`trial-balance-${controls.asOf}.csv`}
          disabled={!data}
        />
      }
    >
      {data ? (
        <>
          <ReconciliationBanner
            ok={data.balanced}
            differenceMinor={data.differenceMinor}
            currency={data.currency}
            okTitle="Debits and credits match. Your books balance."
            failTitle="These books do not balance"
            failDescription="Total debits and total credits are not equal, so at least one figure on this report is wrong. Do not file or share it until this is resolved."
          />
          <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
            <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
              <DataTable
                data={data.lines}
                columns={columns}
                getRowKey={(row) => row.accountId}
                className="min-h-0 flex-1"
                minWidth="760px"
                pagination={{ pageSize: 50 }}
                emptyState={
                  <EmptyState
                    className="min-h-[40vh] flex-1 border-0 bg-transparent"
                    title="Nothing has been posted yet"
                    description="Once journals, invoices or bills are posted, every account that moved will appear here."
                    action={{ label: "Post a journal entry", href: "/accounting/journal" }}
                  />
                }
                footer={
                  <div className="flex items-center justify-end gap-6 font-mono text-label font-semibold tabular-nums text-foreground">
                    <span>
                      {data.columns.debit}: {formatMinorMoney(data.totalDebitMinor, data.currency)}
                    </span>
                    <span>
                      {data.columns.credit}: {formatMinorMoney(data.totalCreditMinor, data.currency)}
                    </span>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </ReportShell>
  );
}

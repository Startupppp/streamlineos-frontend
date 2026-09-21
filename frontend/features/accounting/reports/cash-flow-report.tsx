"use client";

import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useCashFlowReport } from "@/hooks/api/accounting/reports";
import { formatMinorMoney } from "@/lib/accounting/money";
import type { CashFlowReport as CashFlowReportData } from "@/types/accounting-reports";
import { ExportReportButton } from "./export-report-button";
import { RangeControls } from "./report-date-controls";
import { ReportNotes } from "./report-notes";
import { ReportShell } from "./report-shell";
import { StatementTable, type StatementRow } from "./statement-table";
import { useReportControls } from "./use-report-controls";

function buildRows(report: CashFlowReportData): StatementRow[] {
  const rows: StatementRow[] = [];

  for (const section of report.sections) {
    rows.push({
      id: `section-${section.key}`,
      kind: "section",
      label: section.label,
      code: null,
      accountId: null,
      amountMinor: null,
      priorAmountMinor: null,
      varianceMinor: null,
    });

    for (const line of section.lines) {
      rows.push({
        id: `${section.key}-${line.key}`,
        kind: "line",
        label: line.label,
        code: null,
        accountId: null,
        amountMinor: line.amountMinor,
        priorAmountMinor: null,
        varianceMinor: null,
        hint:
          line.accountCodes.length > 0
            ? `From accounts ${line.accountCodes.join(", ")}`
            : undefined,
      });
    }

    rows.push({
      id: `total-${section.key}`,
      kind: "total",
      label: `Total ${section.label.toLowerCase()}`,
      code: null,
      accountId: null,
      amountMinor: section.totalMinor,
      priorAmountMinor: null,
      varianceMinor: null,
    });
  }

  rows.push({
    id: "closing-cash",
    kind: "grand",
    label: "Cash at the end of the period",
    code: null,
    accountId: null,
    amountMinor: report.closingCashMinor,
    priorAmountMinor: null,
    varianceMinor: null,
  });

  return rows;
}

export function CashFlowReport() {
  const controls = useReportControls();

  const params = { from: controls.from, to: controls.to, labelMode: controls.labelMode };
  const { data, isLoading, isError, error, refetch } = useCashFlowReport(params);

  return (
    <ReportShell
      title={data?.title ?? "Cash flow"}
      subtitle="Where the money in the bank came from and where it went."
      backHref="/accounting"
      permission="accounting:reports:read"
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={refetch}
      skeletonColumns={2}
      filters={
        <RangeControls
          from={controls.from}
          to={controls.to}
          onFromChange={controls.setFrom}
          onToChange={controls.setTo}
          labelMode={controls.labelMode}
          onLabelModeChange={controls.setLabelMode}
        />
      }
      actions={
        <ExportReportButton
          report="cash-flow"
          params={params}
          filename={`cash-flow-${controls.from}-to-${controls.to}.csv`}
          disabled={!data}
        />
      }
    >
      {data ? (
        <>
          {!data.reconciles ? (
            <div
              role="alert"
              className="shrink-0 rounded-xl border border-status-danger-rule bg-status-danger-surface p-4"
            >
              <p className="text-sm font-semibold text-status-danger-ink">
                This statement does not tie back to the bank balances
              </p>
              <p className="mt-1 text-label text-foreground/80">
                Cash at the start plus the movement below should equal cash at the end. It does
                not, which means this statement is currently understating or overstating the
                movement in your bank and cash accounts.
              </p>
              <p className="mt-1 font-mono text-label font-semibold tabular-nums text-foreground">
                Out by {formatMinorMoney(
                  Math.abs(data.reconciliationDifferenceMinor),
                  data.currency,
                )}
              </p>
            </div>
          ) : null}

          <StatCardGrid className="shrink-0">
            <StatCard
              label="Cash at the start"
              value={formatMinorMoney(data.openingCashMinor, data.currency)}
            />
            <StatCard
              label="Change in cash"
              value={formatMinorMoney(data.netMovementMinor, data.currency)}
              tone={data.netMovementMinor >= 0 ? "emerald" : "red"}
            />
            <StatCard
              label="Cash from running the business"
              value={formatMinorMoney(data.operatingCashMinor, data.currency)}
            />
            <StatCard
              label="Cash at the end"
              value={formatMinorMoney(data.closingCashMinor, data.currency)}
            />
          </StatCardGrid>

          <StatementTable
            rows={buildRows(data)}
            currency={data.currency}
            accountHeader="Line"
            amountHeader={`${data.from} to ${data.to}`}
          />

          <ReportNotes
            title="What this statement cannot tell you"
            notes={data.limitations}
          />
        </>
      ) : null}
    </ReportShell>
  );
}

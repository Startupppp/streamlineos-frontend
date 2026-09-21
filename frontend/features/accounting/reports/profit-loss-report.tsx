"use client";

import { useProfitLossReport } from "@/hooks/api/accounting/reports";
import { formatMinorMoney } from "@/lib/accounting/money";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { ProfitLossReport as ProfitLossReportData, ProfitLossSection } from "@/types/accounting-reports";
import { ExportReportButton } from "./export-report-button";
import { RangeControls } from "./report-date-controls";
import { ReportNotes } from "./report-notes";
import { ReportShell } from "./report-shell";
import { ReportSwitch } from "./report-switch";
import { StatementTable, type StatementRow } from "./statement-table";
import { useReportControls } from "./use-report-controls";

function sectionRows(section: ProfitLossSection): StatementRow[] {
  const rows: StatementRow[] = [
    {
      id: `section-${section.key}`,
      kind: "section",
      label: section.label,
      code: null,
      accountId: null,
      amountMinor: null,
      priorAmountMinor: null,
      varianceMinor: null,
    },
  ];

  for (const line of section.lines) {
    rows.push({
      id: `${section.key}-${line.accountId}`,
      kind: "line",
      label: line.name,
      code: line.code,
      accountId: line.accountId,
      amountMinor: line.amountMinor,
      priorAmountMinor: line.priorAmountMinor,
      varianceMinor: line.varianceMinor,
    });
  }

  rows.push({
    id: `total-${section.key}`,
    kind: "total",
    label: `Total ${section.label.toLowerCase()}`,
    code: null,
    accountId: null,
    amountMinor: section.totalMinor,
    priorAmountMinor: section.priorTotalMinor,
    varianceMinor: null,
  });

  return rows;
}

function buildRows(report: ProfitLossReportData): StatementRow[] {
  return [
    ...sectionRows(report.income),
    ...sectionRows(report.expense),
    {
      id: "net-profit",
      kind: "grand",
      label: report.netProfitLabel,
      code: null,
      accountId: null,
      amountMinor: report.netProfitMinor,
      priorAmountMinor: report.priorNetProfitMinor,
      varianceMinor: null,
    },
  ];
}

export function ProfitLossReport() {
  const controls = useReportControls();

  const params = {
    from: controls.from,
    to: controls.to,
    labelMode: controls.labelMode,
    comparative: controls.comparative,
  };
  const { data, isLoading, isError, error, refetch } = useProfitLossReport(params);
  const tone = statusToneClasses(
    data && data.netProfitMinor >= 0 ? "success" : "danger",
  );

  return (
    <ReportShell
      title={data?.title ?? "Profit and loss"}
      subtitle="What came in, what went out, and what is left."
      backHref="/accounting"
      permission="accounting:reports:read"
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={refetch}
      skeletonColumns={4}
      filters={
        <RangeControls
          from={controls.from}
          to={controls.to}
          onFromChange={controls.setFrom}
          onToChange={controls.setTo}
          labelMode={controls.labelMode}
          onLabelModeChange={controls.setLabelMode}
          extra={
            <ReportSwitch
              label="Compare with the period before"
              checked={controls.comparative}
              onCheckedChange={controls.setComparative}
            />
          }
        />
      }
      actions={
        <ExportReportButton
          report="pnl"
          params={params}
          filename={`profit-and-loss-${controls.from}-to-${controls.to}.csv`}
          disabled={!data}
        />
      }
    >
      {data ? (
        <>
          <div
            className={cn(
              "flex shrink-0 flex-wrap items-baseline justify-between gap-2 rounded-xl border p-4",
              tone.surface,
              tone.rule,
            )}
          >
            <div>
              <p className={cn("text-sm font-semibold", tone.ink)}>{data.netProfitLabel}</p>
              <p className="text-label text-muted-foreground">
                {data.from} to {data.to} · {data.fiscalYear.name}
              </p>
            </div>
            <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">
              {formatMinorMoney(data.netProfitMinor, data.currency)}
            </p>
          </div>

          <StatementTable
            rows={buildRows(data)}
            currency={data.currency}
            accountHeader={data.columns.account}
            amountHeader={data.columns.thisPeriod}
            priorHeader={data.comparative ? data.columns.lastPeriod : undefined}
            varianceHeader={data.comparative ? data.columns.change : undefined}
            drillHref={(accountId) =>
              `/accounting/general-ledger?accountId=${accountId}&from=${data.from}&to=${data.to}`
            }
            minWidth={data.comparative ? "900px" : "720px"}
          />

          <ReportNotes title="What to know about this report" notes={data.notes} />
        </>
      ) : null}
    </ReportShell>
  );
}

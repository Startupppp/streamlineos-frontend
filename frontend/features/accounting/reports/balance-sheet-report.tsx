"use client";

import { useCan } from "@/hooks/api/access";
import { useBalanceSheetReport } from "@/hooks/api/accounting/reports";
import type {
  BalanceSheetReport as BalanceSheetReportData,
  BalanceSheetSection,
} from "@/types/accounting-reports";
import { AsOfControls } from "./report-date-controls";
import { ExportReportButton } from "./export-report-button";
import { ReconciliationBanner } from "./reconciliation-banner";
import { ReportNotes } from "./report-notes";
import { ReportShell } from "./report-shell";
import { StatementTable, type StatementRow } from "./statement-table";
import { useReportControls } from "./use-report-controls";

function sectionRows(section: BalanceSheetSection): StatementRow[] {
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

  section.lines.forEach((line, index) => {
    rows.push({
      id: `${section.key}-${line.accountId ?? line.tag ?? index}`,
      kind: "line",
      label: line.name,
      code: line.code,
      accountId: line.accountId,
      amountMinor: line.amountMinor,
      priorAmountMinor: null,
      varianceMinor: null,
      hint: line.computed
        ? "Worked out from the ledger — there is no account behind this line"
        : line.isContra
          ? "Reduces the line above rather than adding to it"
          : undefined,
    });
  });

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

  return rows;
}

function buildRows(report: BalanceSheetReportData): StatementRow[] {
  return [
    ...sectionRows(report.assets),
    ...sectionRows(report.liabilities),
    ...sectionRows(report.equity),
    {
      id: "liabilities-and-equity",
      kind: "grand",
      label: `${report.liabilities.label} + ${report.equity.label}`,
      code: null,
      accountId: null,
      amountMinor: report.liabilitiesAndEquityMinor,
      priorAmountMinor: null,
      varianceMinor: null,
    },
  ];
}

export function BalanceSheetReport() {
  const canView = useCan("accounting:reports:read");
  const controls = useReportControls();

  const params = { asOf: controls.asOf, labelMode: controls.labelMode };
  const { data, isLoading, isError, error, refetch } = useBalanceSheetReport(params);

  return (
    <ReportShell
      title={data?.title ?? "Balance sheet"}
      subtitle="Everything owned set against everything owed, on one date."
      backHref="/accounting"
      canView={canView}
      permission="accounting:reports:read"
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={refetch}
      skeletonColumns={2}
      filters={
        <AsOfControls
          asOf={controls.asOf}
          onAsOfChange={controls.setAsOf}
          labelMode={controls.labelMode}
          onLabelModeChange={controls.setLabelMode}
        />
      }
      actions={
        <ExportReportButton
          report="balance-sheet"
          params={params}
          filename={`balance-sheet-${controls.asOf}.csv`}
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
            okTitle="What you own matches what you owe plus the owners' share."
            failTitle="This balance sheet does not balance"
            failDescription="What the business owns does not equal what it owes plus the owners' share. One or more figures here disagree with the ledger, so do not file or share this statement yet."
          />

          <StatementTable
            rows={buildRows(data)}
            currency={data.currency}
            accountHeader="Line"
            amountHeader={`As of ${data.asOf}`}
            drillHref={(accountId) =>
              `/accounting/general-ledger?accountId=${accountId}&to=${data.asOf}`
            }
          />

          <ReportNotes title="What to know about this report" notes={data.notes} />
        </>
      ) : null}
    </ReportShell>
  );
}

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useTaxSummaryReport } from "@/hooks/api/accounting/reports";
import { formatBasisPoints, formatMinorMoney } from "@/lib/accounting/money";
import type { TaxSummaryRow } from "@/types/accounting/accounting-reports";
import { ExportReportButton } from "./export-report-button";
import { RangeControls } from "./report-date-controls";
import { ReportNotes } from "./report-notes";
import { ReportShell } from "./report-shell";
import { useReportControls } from "./use-report-controls";

export function TaxSummaryReport() {
  const controls = useReportControls();

  const params = {
    from: controls.from,
    to: controls.to,
    labelMode: controls.labelMode,
  };
  const { data, isLoading, isError, error, refetch } =
    useTaxSummaryReport(params);

  const columns: DataTableColumn<TaxSummaryRow>[] = [
    {
      key: "role",
      header: "Kind",
      cell: (row) => (
        <span className="truncate font-medium">{row.glRoleLabel}</span>
      ),
    },
    {
      key: "component",
      header: "Component",
      cell: (row) => <span className="truncate">{row.component}</span>,
    },
    {
      key: "jurisdiction",
      header: "Where",
      cell: (row) => (
        <span className="truncate text-muted-foreground">
          {row.jurisdiction}
        </span>
      ),
    },
    {
      key: "rate",
      header: "Rate",
      className: "text-right font-mono tabular-nums whitespace-nowrap",
      headerClassName: "text-right",
      cell: (row) => formatBasisPoints(row.rateBp),
    },
    {
      key: "taxable",
      header: "Amount taxed",
      className: "text-right font-mono tabular-nums whitespace-nowrap",
      headerClassName: "text-right",
      cell: (row) => formatMinorMoney(row.taxableMinor, row.currency),
    },
    {
      key: "tax",
      header: "Tax",
      className:
        "text-right font-mono font-semibold tabular-nums whitespace-nowrap",
      headerClassName: "text-right",
      cell: (row) => formatMinorMoney(row.taxMinor, row.currency),
    },
    {
      key: "documents",
      header: "Documents",
      className: "text-right font-mono tabular-nums",
      headerClassName: "text-right",
      cell: (row) => row.documentCount,
    },
  ];

  return (
    <ReportShell
      title={data?.title ?? "Tax collected and tax paid"}
      subtitle="Every tax line frozen onto invoices and bills in this period."
      backHref="/accounting"
      permission="accounting:reports:read"
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={refetch}
      skeletonColumns={7}
      fill
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
          report="tax-summary"
          params={params}
          filename={`tax-summary-${controls.from}-to-${controls.to}.csv`}
          disabled={!data}
        />
      }
    >
      {data ? (
        <>
          <StatCardGrid className="shrink-0">
            <StatCard
              label="Tax we charged customers"
              value={formatMinorMoney(
                data.totals.outputTaxMinor,
                data.totals.currency,
              )}
            />
            <StatCard
              label="Tax we paid and can claim back"
              value={formatMinorMoney(
                data.totals.recoverableInputTaxMinor,
                data.totals.currency,
              )}
            />
            <StatCard
              label="Tax we paid and cannot claim"
              value={formatMinorMoney(
                data.totals.blockedInputTaxMinor,
                data.totals.currency,
              )}
              tone="amber"
            />
            <StatCard
              label="Net tax payable"
              value={formatMinorMoney(
                data.totals.netPayableMinor,
                data.totals.currency,
              )}
              tone={data.totals.netPayableMinor > 0 ? "amber" : "emerald"}
            />
          </StatCardGrid>

          <ReportNotes
            title="What to know about this report"
            notes={data.notes}
          />

          <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
            <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
              <DataTable
                data={data.rows}
                columns={columns}
                getRowKey={(row) =>
                  `${row.glRole}-${row.component}-${row.jurisdiction}-${row.rateBp}-${row.currency}`
                }
                className="min-h-0 flex-1"
                minWidth="1000px"
                pagination={{ pageSize: 50 }}
                emptyState={
                  <EmptyState
                    className="min-h-[40vh] flex-1 border-0 bg-transparent"
                    title="No tax in this period"
                    description="Nothing with a tax line was invoiced or billed between these dates."
                  />
                }
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </ReportShell>
  );
}

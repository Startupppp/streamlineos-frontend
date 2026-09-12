"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/hooks/api/access";
import { useAgingReport } from "@/hooks/api/accounting/reports";
import { formatMinorMoney } from "@/lib/accounting/money";
import { AGING_BUCKET_KEYS, type AgingPartyRow } from "@/types/accounting-reports";
import { AsOfControls } from "./report-date-controls";
import { ExportReportButton } from "./export-report-button";
import { ReconciliationBanner } from "./reconciliation-banner";
import { ReportNotes } from "./report-notes";
import { ReportShell } from "./report-shell";
import { useReportControls } from "./use-report-controls";

export function AgingReport() {
  const canView = useCan("accounting:reports:read");
  const controls = useReportControls();

  const params = {
    side: controls.side,
    asOf: controls.asOf,
    basis: controls.basis,
    labelMode: controls.labelMode,
  };
  const { data, isLoading, isError, error, refetch } = useAgingReport(params);
  const currency = data?.currency ?? "";

  function handleSideChange(next: string) {
    controls.setSide(next === "ap" ? "ap" : "ar");
  }

  const columns: DataTableColumn<AgingPartyRow>[] = [
    {
      key: "party",
      header: "Who",
      cell: (row) => <span className="truncate font-medium">{row.partyName}</span>,
    },
    ...AGING_BUCKET_KEYS.map<DataTableColumn<AgingPartyRow>>((bucket) => ({
      key: bucket,
      header: data?.bucketLabels[bucket] ?? bucket,
      className: "text-right font-mono tabular-nums whitespace-nowrap",
      headerClassName: "text-right",
      cell: (row) =>
        row.buckets[bucket] === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          formatMinorMoney(row.buckets[bucket], currency)
        ),
    })),
    {
      key: "total",
      header: "Total",
      className: "text-right font-mono font-semibold tabular-nums whitespace-nowrap",
      headerClassName: "text-right",
      cell: (row) => formatMinorMoney(row.totalMinor, currency),
    },
    {
      key: "oldest",
      header: "Oldest",
      className: "text-right font-mono tabular-nums whitespace-nowrap",
      headerClassName: "text-right",
      cell: (row) =>
        row.oldestAgeDays < 0 ? (
          <span className="text-muted-foreground">Not due yet</span>
        ) : (
          `${row.oldestAgeDays} days`
        ),
    },
  ];

  const isReceivable = controls.side === "ar";

  return (
    <ReportShell
      title={data?.title ?? (isReceivable ? "What customers owe us" : "What we owe suppliers")}
      subtitle="Open items grouped by how late they are."
      backHref="/accounting/reports"
      canView={canView}
      permission="accounting:reports:read"
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={refetch}
      skeletonColumns={7}
      fill
      filters={
        <AsOfControls
          asOf={controls.asOf}
          onAsOfChange={controls.setAsOf}
          labelMode={controls.labelMode}
          onLabelModeChange={controls.setLabelMode}
          extra={
            <Tabs value={controls.side} onValueChange={handleSideChange} className="shrink-0">
              <TabsList aria-label="Which side">
                <TabsTrigger value="ar">Customers owe us</TabsTrigger>
                <TabsTrigger value="ap">We owe suppliers</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />
      }
      actions={
        <ExportReportButton
          report="aging"
          params={params}
          filename={`aging-${controls.side}-${controls.asOf}.csv`}
          disabled={!data}
        />
      }
    >
      {data ? (
        <>
          <ReconciliationBanner
            ok={data.reconciles}
            differenceMinor={data.differenceMinor}
            currency={data.currency}
            okTitle="This list agrees with the ledger."
            failTitle="This list does not agree with the ledger"
            failDescription={`The open items below do not add up to the balance on control account ${data.controlAccountCode ?? "(not set)"}. One of the two is wrong, so do not chase or pay from this list until it is investigated.`}
            differenceLabel="Open items differ from the ledger by"
          />

          <ReportNotes title="What to know about this report" notes={data.notes} />

          <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
            <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
              <DataTable
                data={data.parties}
                columns={columns}
                getRowKey={(row) => row.partyId}
                className="min-h-0 flex-1"
                minWidth="900px"
                pagination={{ pageSize: 50 }}
                emptyState={
                  <EmptyState
                    className="min-h-[40vh] flex-1 border-0 bg-transparent"
                    title={isReceivable ? "Nobody owes you anything" : "You owe nobody anything"}
                    description="There are no open items on this date."
                  />
                }
                footer={
                  <div className="flex items-center justify-end gap-6 font-mono text-label font-semibold tabular-nums text-foreground">
                    <span>Total outstanding: {formatMinorMoney(data.totalOpenMinor, data.currency)}</span>
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

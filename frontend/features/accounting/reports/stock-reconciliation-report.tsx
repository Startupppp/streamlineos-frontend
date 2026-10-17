"use client";

import { useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RecordList } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useAccountingBook } from "@/hooks/api/accounting/ledger";
import { useStockGlReconciliation, useUnpostedMovements } from "@/hooks/api/accounting/reports";
import type {
  StockGlReconciliation,
  UnpostedMovementsReport,
} from "@/hooks/api/accounting/reconciliation-schema";
import { formatDateOnly } from "@/lib/date-utils";
import { formatMinorMoney } from "@/lib/accounting/money";
import { UNPOSTED_MOVEMENT_LAYOUT } from "@/lib/renderer/accounting/unposted-movement-layout";
import { RangeControls } from "./report-date-controls";
import { ReportNotes } from "./report-notes";
import { ReportShell } from "./report-shell";
import { useReportControls } from "./use-report-controls";

type UnpostedMovement = UnpostedMovementsReport["sample"][number];

const VERDICT: Readonly<
  Record<StockGlReconciliation["verdict"], { label: string; tone: "emerald" | "amber" | "red" }>
> = {
  balanced: { label: "Ledger and stock agree", tone: "emerald" },
  explained_by_unposted: { label: "Gap explained by unposted stock", tone: "amber" },
  unexplained: { label: "Gap nobody can explain yet", tone: "red" },
};

function movementKey(row: UnpostedMovement): string {
  return String(row.transactionId);
}

export function StockReconciliationReport() {
  const layout = useTenantLayout(UNPOSTED_MOVEMENT_LAYOUT);
  const controls = useReportControls();
  const range = { from: controls.from, to: controls.to };
  const accountant = controls.labelMode === "accountant";

  const bookQuery = useAccountingBook();
  const stockGl = useStockGlReconciliation(range);
  const unposted = useUnpostedMovements(range);
  const currency = bookQuery.data?.baseCurrency;

  const handleRetry = useCallback(() => {
    void stockGl.refetch();
    void unposted.refetch();
  }, [stockGl, unposted]);

  const cells = useMemo(
    () => ({
      postingDate: (row: UnpostedMovement) =>
        row.postingDate ? formatDateOnly(row.postingDate) : "No date",
      referenceType: (row: UnpostedMovement) => (
        <span className="truncate text-muted-foreground">
          {row.referenceType ?? "No source document"}
        </span>
      ),
      valueMinor: (row: UnpostedMovement) =>
        currency ? formatMinorMoney(row.valueMinor, currency) : row.valueMinor,
    }),
    [currency],
  );

  const gl = stockGl.data;
  const gap = unposted.data;
  const ready = gl !== undefined && gap !== undefined && currency !== undefined;
  const verdict = gl ? VERDICT[gl.verdict] : undefined;
  // The sample is drawn from every unposted movement, including the ones that never post by design.
  const sampledFrom = gap?.byReason.reduce((sum, row) => sum + row.movements, 0) ?? 0;
  const notes = useMemo(() => [...(gl?.notes ?? []), ...(gap?.notes ?? [])], [gl, gap]);

  return (
    <ReportShell
      title={accountant ? "Inventory to GL reconciliation" : "Does the ledger match the stock?"}
      subtitle="Stock movement value in this window against what reached the inventory accounts."
      backHref="/accounting/reports"
      permission="accounting:reports:read"
      isLoading={stockGl.isLoading || unposted.isLoading || bookQuery.isLoading}
      isError={stockGl.isError || unposted.isError}
      error={stockGl.error ?? unposted.error}
      onRetry={handleRetry}
      skeletonColumns={5}
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
    >
      {ready && !gl.enabled ? (
        <EmptyState
          className="flex-1"
          title="Accounting is not enabled"
          description="Turn on accounting before reconciling stock against the ledger."
        />
      ) : ready ? (
        <>
          <StatCardGrid className="shrink-0">
            <StatCard
              label={accountant ? "GL inventory movement" : "What the ledger says moved"}
              value={formatMinorMoney(gl.glMovementMinor, currency)}
            />
            <StatCard
              label={accountant ? "Posted stock movements" : "Stock moves that reached the ledger"}
              value={formatMinorMoney(gl.postedMovementValueMinor, currency)}
            />
            <StatCard
              label={accountant ? "Unposted movements" : "Stock moves the ledger never saw"}
              value={formatMinorMoney(gl.unpostedValueMinor, currency)}
              tone={gl.unpostedValueMinor === 0 ? "emerald" : "amber"}
            />
            <StatCard
              label={verdict?.label ?? "Difference"}
              value={formatMinorMoney(gl.bridgeDifferenceMinor, currency)}
              tone={verdict?.tone}
            />
          </StatCardGrid>

          <ReportNotes title="What to know about this report" notes={notes} />

          <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
            <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
              <RecordList
                layout={layout}
                rows={gap.sample}
                getRowKey={movementKey}
                cells={cells}
                className="min-h-0 flex-1"
                minWidth="900px"
                pagination={{ pageSize: 50 }}
                emptyState={
                  <EmptyState
                    className="min-h-[40vh] flex-1 border-0 bg-transparent"
                    title="Every stock movement reached the ledger"
                    description="Nothing moved in this window without a journal behind it."
                  />
                }
              />
            </CardContent>
          </Card>
          {gap.sample.length < sampledFrom ? (
            <p className="shrink-0 text-label text-muted-foreground">
              Showing the first {gap.sample.length} of {sampledFrom} unposted movements.
            </p>
          ) : null}
        </>
      ) : null}
    </ReportShell>
  );
}

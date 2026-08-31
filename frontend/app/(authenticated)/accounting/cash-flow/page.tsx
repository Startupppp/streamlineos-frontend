"use client";

import { useState, useCallback, useMemo, memo } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DatePicker } from "@/components/ui/date-picker";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useCashFlow, type CashFlowSection } from "@/hooks/api/accounting";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { formatMoney, type MoneyDisplay } from "@/lib/format-utils";
import { getErrorMessage } from "@/lib/get-error-message";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function financialYearStart(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-04-01`;
}

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

const CashFlowSummaryStrip = memo(function CashFlowSummaryStrip({
  openingCash,
  netChange,
  closingCash,
  display,
}: {
  openingCash: string;
  netChange: string;
  closingCash: string;
  display: MoneyDisplay;
}) {
  return (
    <StatCardGrid cols={3}>
      <StatCard label="Opening Cash" value={formatMoney(openingCash, display)} />
      <StatCard label="Net Change" value={formatMoney(netChange, display)} />
      <StatCard label="Closing Cash" value={formatMoney(closingCash, display)} featured />
    </StatCardGrid>
  );
});

type CashFlowItem = CashFlowSection["items"][number];

function makeCashFlowItemColumns(
  formatFn: (value: string) => string,
): DataTableColumn<CashFlowItem>[] {
  return [
    {
      key: "label",
      header: "Account",
      cell: (row) => <span className="text-sm text-foreground">{row.label}</span>,
    },
    {
      key: "amount",
      header: "Net Cash Flow",
      cell: (row) => (
        <span className="text-sm text-right tabular-nums font-mono block">
          {formatFn(row.amount)}
        </span>
      ),
      className: "w-[180px] text-right",
      headerClassName: "text-right",
      sortable: true,
      sortValue: (row) => parseFloat(row.amount),
    },
  ];
}

interface SectionCardProps {
  section: CashFlowSection;
  formatFn: (value: string) => string;
}

function SectionCard({ section, formatFn }: SectionCardProps) {
  const columns = useMemo(() => makeCashFlowItemColumns(formatFn), [formatFn]);
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-2.5 border-b bg-muted/40">
        <h3 className="text-sm font-semibold tracking-tight">
          {section.label}
        </h3>
      </div>
      <DataTable
        data={section.items}
        columns={columns}
        getRowKey={(item) => item.label}
        emptyState={
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            No cash movement in this category for the selected range.
          </div>
        }
        footer={
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Net {section.label}</span>
            <span className="tabular-nums font-mono">{formatFn(section.total)}</span>
          </div>
        }
        className="border-0 rounded-none"
      />
    </div>
  );
}

export default function CashFlowPage() {
  const [from, setFrom] = useState<string>(financialYearStart());
  const [to, setTo] = useState<string>(today());
  const display = useOrgDisplay();

  const query = useCashFlow({ from, to });
  const report = query.data;

  const formatFn = useCallback(
    (value: string) => formatMoney(value, display),
    [display],
  );

  function handleFromChange(value: string): void {
    setFrom(value);
  }

  function handleToChange(value: string): void {
    setTo(value);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  const hasActivity =
    report !== undefined &&
    (report.sections.some((section) => section.items.length > 0) ||
      parseFloat(report.openingCash) !== 0 ||
      parseFloat(report.closingCash) !== 0);

  return (
    <PageWrapper
      title="Cash Flow Statement"
      subtitle="Cash generated and used across operating, investing, and financing activities."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="cash-flow-from"
              className="text-dense font-medium text-muted-foreground leading-none"
            >
              From
            </label>
            <DatePicker id="cash-flow-from" value={from ?? ""} onChange={handleFromChange} placeholder="Pick a date" className="w-[160px]" />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="cash-flow-to"
              className="text-dense font-medium text-muted-foreground leading-none"
            >
              To
            </label>
            <DatePicker id="cash-flow-to" value={to ?? ""} onChange={handleToChange} placeholder="Pick a date" className="w-[160px]" />
          </div>
          {report && !report.reconciled && (
            <div className="ml-auto self-end text-xs text-status-warning-ink">
              Section totals differ from the net change in cash — review
              unbalanced entries.
            </div>
          )}
        </div>
      }
    >
      {query.isLoading ? (
          <div className="flex flex-1 min-h-0 flex-col">
            <LoadingState variant="table" rows={12} />
          </div>
        ) : query.error ? (
          <div className="flex flex-1 min-h-0 flex-col">
            <ErrorState
              title="Failed to load cash flow"
              description={getErrorMessage(query.error)}
              onRetry={handleRetry}
            />
          </div>
        ) : !report || !hasActivity ? (
          <div className="flex flex-1 min-h-0 flex-col">
            <EmptyState
              illustration={<EmptyExpensesIllustration />}
              title="No cash activity for this range"
              description="Pick a different date range or post entries that move cash or bank balances."
            />
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 flex-col space-y-4">
            <CashFlowSummaryStrip
              openingCash={report.openingCash}
              netChange={report.netChange}
              closingCash={report.closingCash}
              display={display}
            />

            <div className="space-y-4">
              {report.sections.map((section) => (
                <SectionCard key={section.key} section={section} formatFn={formatFn} />
              ))}
            </div>

            <div className="rounded-lg border border-border px-4 py-3 flex items-center justify-between gap-4 bg-muted/40">
              <span className="text-sm font-semibold text-foreground">
                Net change in cash
              </span>
              <span className="font-mono tabular-nums text-base font-semibold text-foreground">
                {formatFn(report.netChange)}
              </span>
            </div>
          </div>
        )}
    </PageWrapper>
  );
}

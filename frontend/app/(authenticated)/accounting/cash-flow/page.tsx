"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DatePicker } from "@/components/ui/date-picker";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { useCashFlow, type CashFlowSection } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatInr(value: string): string {
  return inrFormatter.format(parseFloat(value));
}

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

interface SummaryCardProps {
  label: string;
  value: string;
  emphasis?: boolean;
}

function SummaryCard({ label, value, emphasis = false }: SummaryCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-medium text-muted-foreground leading-none">
        {label}
      </p>
      <p
        className={
          emphasis
            ? "mt-1.5 font-mono tabular-nums text-base font-semibold text-foreground"
            : "mt-1.5 font-mono tabular-nums text-sm font-medium text-foreground"
        }
      >
        {formatInr(value)}
      </p>
    </div>
  );
}

type CashFlowItem = CashFlowSection["items"][number];

const cashFlowItemColumns: DataTableColumn<CashFlowItem>[] = [
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
        {formatInr(row.amount)}
      </span>
    ),
    className: "w-[180px] text-right",
    headerClassName: "text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.amount),
  },
];

interface SectionCardProps {
  section: CashFlowSection;
}

function SectionCard({ section }: SectionCardProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-2.5 border-b bg-muted/40">
        <h3 className="text-sm font-semibold tracking-tight">
          {section.label}
        </h3>
      </div>
      <DataTable
        data={section.items}
        columns={cashFlowItemColumns}
        getRowKey={(item) => item.label}
        emptyState={
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            No cash movement in this category for the selected range.
          </div>
        }
        footer={
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Net {section.label}</span>
            <span className="tabular-nums font-mono">{formatInr(section.total)}</span>
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

  const query = useCashFlow({ from, to });
  const report = query.data;

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
      eyebrow="Accounting · Reports"
      title="Cash Flow Statement"
      subtitle="Cash generated and used across operating, investing, and financing activities."
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="cash-flow-from"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              From
            </label>
            <DatePicker id="cash-flow-from" value={from ?? ""} onChange={handleFromChange} placeholder="Pick a date" className="w-[160px] h-8 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="cash-flow-to"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              To
            </label>
            <DatePicker id="cash-flow-to" value={to ?? ""} onChange={handleToChange} placeholder="Pick a date" className="w-[160px] h-8 text-sm" />
          </div>
          {report && !report.reconciled && (
            <div className="ml-auto self-end text-xs text-amber-600">
              Section totals differ from the net change in cash — review
              unbalanced entries.
            </div>
          )}
        </div>
      }
    >
      {query.isLoading ? (
          <LoadingState variant="table" rows={8} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load cash flow"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        ) : !report || !hasActivity ? (
          <EmptyState
            illustration={<EmptyExpensesIllustration />}
            title="No cash activity for this range"
            description="Pick a different date range or post entries that move cash or bank balances."
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <SummaryCard label="Opening Cash" value={report.openingCash} />
              <SummaryCard label="Net Change" value={report.netChange} />
              <SummaryCard
                label="Closing Cash"
                value={report.closingCash}
                emphasis
              />
            </div>

            <div className="space-y-4">
              {report.sections.map((section) => (
                <SectionCard key={section.key} section={section} />
              ))}
            </div>

            <div className="rounded-lg border border-border px-4 py-3 flex items-center justify-between gap-4 bg-muted/40">
              <span className="text-sm font-semibold text-foreground">
                Net change in cash
              </span>
              <span className="font-mono tabular-nums text-base font-semibold text-foreground">
                {formatInr(report.netChange)}
              </span>
            </div>
          </div>
        )}
    </PageWrapper>
  );
}

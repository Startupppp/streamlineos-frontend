"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { useSalesLeaderboard, useSalesRepComparison, type SalesRange } from "@/hooks/api/crm/sales";
import type { SalesRepComparison } from "@/hooks/api/crm/sales-schema";
import { formatMoneyCompact } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import { LABEL_CELL, NUM_CELL, ReportTable, SalesReportCard } from "./sales-report-card";

export function SalesLeaderboardReport({ range }: { range: SalesRange }) {
  const query = useSalesLeaderboard(range);
  const money = useOrgDisplay();
  const rows = query.data ?? [];
  return (
    <SalesReportCard
      title="Leaderboard"
      description="Revenue won per rep in this period."
      permission="sales:view"
      query={query}
      isEmpty={rows.length === 0}
      emptyText="No rep has closed a deal in this period."
    >
      <ReportTable headers={["Rep", "Won", "Deals", "Revenue", "Win rate"]}>
        {rows.map((row) => (
          <tr key={row.repId} className="border-b border-border/60 last:border-0">
            <td className={LABEL_CELL}>{row.name}</td>
            <td className={NUM_CELL}>{row.dealsWon}</td>
            <td className={NUM_CELL}>{row.totalDeals}</td>
            <td className={NUM_CELL}>{formatMoneyCompact(row.revenue, money)}</td>
            <td className={NUM_CELL}>{`${row.winRate}%`}</td>
          </tr>
        ))}
      </ReportTable>
    </SalesReportCard>
  );
}

const METRICS: { label: string; read: (rep: SalesRepComparison["rep1"]) => number; money?: boolean; suffix?: string }[] = [
  { label: "Deals won", read: (rep) => rep.dealsWon },
  { label: "Deals", read: (rep) => rep.totalDeals },
  { label: "Revenue", read: (rep) => rep.revenue, money: true },
  { label: "Average deal", read: (rep) => rep.avgDealSize, money: true },
  { label: "Win rate", read: (rep) => rep.winRate, suffix: "%" },
];

/** Two reps from the leaderboard, side by side over the same period. */
export function SalesRepComparisonReport({ range }: { range: SalesRange }) {
  const reps = useSalesLeaderboard(range);
  const [rep1, setRep1] = useState<number | null>(null);
  const [rep2, setRep2] = useState<number | null>(null);
  const query = useSalesRepComparison(rep1, rep2, range);
  const money = useOrgDisplay();
  const options = reps.data ?? [];

  function handleRep1(value: string) {
    setRep1(Number(value));
  }
  function handleRep2(value: string) {
    setRep2(Number(value));
  }
  function format(metric: (typeof METRICS)[number], rep: SalesRepComparison["rep1"]) {
    const value = metric.read(rep);
    return metric.money ? formatMoneyCompact(value, money) : `${value}${metric.suffix ?? ""}`;
  }

  const pickers = (
    <div className="flex flex-wrap gap-2">
      {[
        { label: "First rep", value: rep1, onChange: handleRep1 },
        { label: "Second rep", value: rep2, onChange: handleRep2 },
      ].map((picker) => (
        <Select key={picker.label} value={picker.value === null ? undefined : String(picker.value)} onValueChange={picker.onChange}>
          <SelectTrigger className={cn("w-fit min-w-36", FILTER_SELECT_TRIGGER)} aria-label={picker.label}>
            <SelectValue placeholder={picker.label} />
          </SelectTrigger>
          <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
            {options.map((rep) => (
              <SelectItem key={rep.repId} value={String(rep.repId)}>
                {rep.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );

  const picked = rep1 !== null && rep2 !== null && rep1 !== rep2;
  const comparison = query.data;

  return (
    <SalesReportCard
      title="Rep comparison"
      description="Pick two reps from the leaderboard."
      permission="sales:view"
      query={picked ? query : { ...query, isLoading: false, isError: false }}
      isEmpty={!picked || !comparison}
      emptyText={options.length < 2 ? "Comparison needs at least two reps with deals." : "Choose two different reps."}
      actions={options.length >= 2 ? pickers : null}
      className="md:col-span-2"
    >
      {comparison ? (
        <ReportTable headers={["", comparison.rep1.name, comparison.rep2.name]}>
          {METRICS.map((metric) => (
            <tr key={metric.label} className="border-b border-border/60 last:border-0">
              <td className={LABEL_CELL}>{metric.label}</td>
              <td className={NUM_CELL}>{format(metric, comparison.rep1)}</td>
              <td className={NUM_CELL}>{format(metric, comparison.rep2)}</td>
            </tr>
          ))}
        </ReportTable>
      ) : null}
    </SalesReportCard>
  );
}

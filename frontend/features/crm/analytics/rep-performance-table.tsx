"use client";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AnalyticsChartCard } from "./analytics-chart-card";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";

interface RepPerformanceTableProps {
  leaderboard: Array<{
    userId: string;
    name: string;
    leadsAssigned: number;
    leadsConverted: number;
    totalCalls: number;
    score: number;
  }> | undefined;
}

export function RepPerformanceTable({ leaderboard }: RepPerformanceTableProps) {
  const data = (leaderboard ?? []).map((l) => ({
    name: l.name, score: l.score, converted: l.leadsConverted, calls: l.totalCalls,
  }));

  return (
    <AnalyticsChartCard title="Rep Performance" data={data} filename="rep-performance">
      {(!leaderboard || leaderboard.length === 0) ? (
        <ChartEmptyState height={220} compact />
      ) : (
      <div className="max-h-[280px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <TableRow className="border-b-2 border-border hover:bg-transparent">
              <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Rep</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Leads</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Converted</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Calls</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard?.map((rep, i) => (
              <TableRow key={rep.userId} className="h-8 hover:bg-muted/30 transition-colors">
                <TableCell className="px-2 py-1 text-[11px] font-medium">
                  <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                  {rep.name}
                </TableCell>
                <TableCell className="px-2 py-1 text-[11px] text-right font-mono tabular-nums">{rep.leadsAssigned}</TableCell>
                <TableCell className="px-2 py-1 text-[11px] text-right font-mono tabular-nums text-emerald-600">{rep.leadsConverted}</TableCell>
                <TableCell className="px-2 py-1 text-[11px] text-right font-mono tabular-nums">{rep.totalCalls}</TableCell>
                <TableCell className="px-2 py-1 text-[11px] text-right font-mono tabular-nums font-semibold">{rep.score}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}
    </AnalyticsChartCard>
  );
}

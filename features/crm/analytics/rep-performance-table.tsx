"use client";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AnalyticsChartCard } from "./analytics-chart-card";

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
      <div className="max-h-[280px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Rep</TableHead>
              <TableHead className="text-xs text-right">Leads</TableHead>
              <TableHead className="text-xs text-right">Converted</TableHead>
              <TableHead className="text-xs text-right">Calls</TableHead>
              <TableHead className="text-xs text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard?.map((rep, i) => (
              <TableRow key={rep.userId}>
                <TableCell className="text-xs font-medium">
                  <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                  {rep.name}
                </TableCell>
                <TableCell className="text-xs text-right">{rep.leadsAssigned}</TableCell>
                <TableCell className="text-xs text-right text-emerald-400">{rep.leadsConverted}</TableCell>
                <TableCell className="text-xs text-right">{rep.totalCalls}</TableCell>
                <TableCell className="text-xs text-right font-semibold">{rep.score}</TableCell>
              </TableRow>
            ))}
            {(!leaderboard || leaderboard.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">No data</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AnalyticsChartCard>
  );
}

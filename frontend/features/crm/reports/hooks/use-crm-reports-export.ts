"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import type { LeadStats, SalesLeaderboardEntry } from "@/types/leads";
import type { DealStats } from "@/types/crm/deals";
import { PERIOD_OPTIONS, type Period, type LeadSourceReport } from "../lib/types";

interface ExportParams {
  stats: LeadStats | undefined;
  dealStats: DealStats | undefined;
  sourceReport: LeadSourceReport | undefined;
  leaderboard: SalesLeaderboardEntry[] | undefined;
  period: Period;
}

export function useCrmReportsExport({
  stats,
  dealStats,
  sourceReport,
  leaderboard,
  period,
}: ExportParams) {
  const handleExport = useCallback(async () => {
    toast.info("Generating export…");
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const periodLabel =
        PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period;

      if (stats) {
        const ws = wb.addWorksheet("Summary");
        ws.columns = [
          { header: "Metric", key: "metric", width: 32 },
          { header: "Value", key: "value", width: 28 },
        ];
        ws.getRow(1).font = { bold: true };
        ws.addRows([
          { metric: "Period", value: periodLabel },
          { metric: "Total Leads", value: stats.total },
          { metric: "Conversion Rate", value: `${stats.conversionRate}%` },
          {
            metric: "Total Potential Value",
            value: `₹${stats.totalPotentialValue.toLocaleString("en-IN")}`,
          },
          { metric: "Unassigned Leads", value: stats.unassigned },
          { metric: "New This Month", value: stats.thisMonth },
          ...(dealStats
            ? [
                { metric: "Active Deals", value: dealStats.active },
                {
                  metric: "Pipeline Value",
                  value: `₹${dealStats.pipelineValue.toLocaleString("en-IN")}`,
                },
                {
                  metric: "Won Revenue",
                  value: `₹${dealStats.wonValue.toLocaleString("en-IN")}`,
                },
              ]
            : []),
        ]);
      }

      if (sourceReport?.sources?.length) {
        const ws2 = wb.addWorksheet("Source Attribution");
        ws2.columns = [
          { header: "Source", key: "source", width: 20 },
          { header: "Leads", key: "count", width: 12 },
          { header: "Converted", key: "converted", width: 14 },
          { header: "Win Rate", key: "rate", width: 14 },
          { header: "Total Value", key: "value", width: 20 },
        ];
        ws2.getRow(1).font = { bold: true };
        ws2.addRows(
          sourceReport.sources.map((s) => ({
            source: s.source.replace(/_/g, " "),
            count: s.count,
            converted: s.converted,
            rate: `${s.conversionRate.toFixed(1)}%`,
            value: `₹${s.totalValue.toLocaleString("en-IN")}`,
          })),
        );
      }

      if (leaderboard?.length) {
        const ws3 = wb.addWorksheet("Team Leaderboard");
        ws3.columns = [
          { header: "Rank", key: "rank", width: 8 },
          { header: "Name", key: "name", width: 26 },
          { header: "Leads", key: "count", width: 14 },
        ];
        ws3.getRow(1).font = { bold: true };
        ws3.addRows(
          leaderboard.map((rep, i) => ({
            rank: i + 1,
            name: rep.name ?? "Unknown",
            count: rep.count,
          })),
        );
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `crm-report-${period}-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch {
      toast.error("Failed to export report");
    }
  }, [stats, dealStats, sourceReport, leaderboard, period]);

  return { handleExport };
}

"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DownloadIcon } from "@animateicons/react/lucide";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";
import type { GenerateReportResult } from "@/hooks/api";
import { ResultTable } from "./result-table";

interface ReportResultPanelProps {
  result: GenerateReportResult | null;
  isPending: boolean;
  isHr: boolean;
  onSchedule: () => void;
}

export function ReportResultPanel({ result, isPending, isHr, onSchedule }: ReportResultPanelProps) {
  const handleExportCsv = useCallback(async () => {
    if (!result) return;
    const Papa = (await import("papaparse")).default;
    const csv = Papa.unparse(result.rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.entity}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const handleExportXlsx = useCallback(async () => {
    if (!result) return;
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(result.entity);
      if (result.rows.length > 0) {
        ws.columns = Object.keys(result.rows[0]).map((key) => ({ header: key, key }));
        result.rows.forEach((row) => ws.addRow(row));
      }
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.entity}-report.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_e) {
      toast.error("Failed to export Excel file");
    }
  }, [result]);

  if (!result && !isPending) {
    return (
      <RecruitmentEmptyState
        illustration={<EmptyLeaderboardIllustration />}
        title="No report generated yet"
        description="Configure the report builder on the left and click Generate Report."
      />
    );
  }

  if (isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded" />
        ))}
      </div>
    );
  }

  if (!result) return null;

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4 flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm capitalize">
            {result.entity} Report
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {result.total} records
          </p>
        </div>
        <div className="flex gap-2">
          <AnimatedIconButton
            icon={DownloadIcon}
            iconSize={14}
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
          >
            CSV
          </AnimatedIconButton>
          <AnimatedIconButton
            icon={DownloadIcon}
            iconSize={14}
            size="sm"
            variant="outline"
            onClick={handleExportXlsx}
          >
            Excel
          </AnimatedIconButton>
          {isHr && (
            <Button size="sm" variant="outline" onClick={onSchedule}>
              Schedule
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ResultTable result={result} />
      </CardContent>
    </Card>
  );
}

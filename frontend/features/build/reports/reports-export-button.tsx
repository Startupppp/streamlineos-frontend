"use client";

import { useCallback } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/api/access";
import { useVelocityReport } from "@/hooks/api/build/reports";
import { exportToCsv } from "@/lib/export-csv";

interface ReportsExportButtonProps {
  projectId: number;
}

export function ReportsExportButton({ projectId }: ReportsExportButtonProps) {
  const canView = useCan("build:view");
  const { data } = useVelocityReport(projectId);

  const handleExport = useCallback(() => {
    if (!data?.length) return;
    exportToCsv(
      "velocity-report.csv",
      data.map((cycle) => ({
        cycle_name: cycle.name,
        start_date: cycle.startDate,
        end_date: cycle.endDate,
        committed_points: cycle.committedPoints,
        completed_points: cycle.completedPoints,
        committed_count: cycle.committedCount,
        completed_count: cycle.completedCount,
      })),
    );
  }, [data]);

  if (!canView) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={!data?.length}
    >
      <Download className="h-4 w-4" />
      Export velocity CSV
    </Button>
  );
}

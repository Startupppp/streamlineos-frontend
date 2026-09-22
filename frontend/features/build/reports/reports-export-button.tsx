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
      data.map((sprint) => ({
        sprint_name: sprint.name,
        start_date: sprint.startDate,
        end_date: sprint.endDate,
        committed_points: sprint.committedPoints,
        completed_points: sprint.completedPoints,
        committed_count: sprint.committedCount,
        completed_count: sprint.completedCount,
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

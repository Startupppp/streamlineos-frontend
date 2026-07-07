"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/export-csv";

interface ExportCsvButtonProps {
  filename: string;
  rows: Array<Record<string, unknown>>;
  disabled?: boolean;
}

export function ExportCsvButton({ filename, rows, disabled }: ExportCsvButtonProps) {
  function handleExport() {
    exportToCsv(filename, rows);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || rows.length === 0}
      onClick={handleExport}
    >
      <Download className="h-3.5 w-3.5 mr-1.5" />
      Export CSV
    </Button>
  );
}

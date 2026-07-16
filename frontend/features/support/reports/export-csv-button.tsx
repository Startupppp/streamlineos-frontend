"use client";

import { exportToCsv } from "@/lib/export-csv";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DownloadIcon } from "@animateicons/react/lucide";

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
    <AnimatedIconButton
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || rows.length === 0}
      onClick={handleExport}
      icon={DownloadIcon}
      iconClassName="mr-1.5"
    >
      Export CSV
    </AnimatedIconButton>
  );
}

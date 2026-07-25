"use client";

import { Download } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";

interface ExportCsvButtonProps {
  onExport: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ExportCsvButton({ onExport, isLoading, disabled }: ExportCsvButtonProps) {
  return (
    <LoadingButton
      variant="outline"
      size="sm"
      onClick={onExport}
      disabled={disabled}
      isPending={isLoading}
      className="gap-1.5 text-xs"
    >
      <Download className="h-3.5 w-3.5" />
      Export CSV
    </LoadingButton>
  );
}

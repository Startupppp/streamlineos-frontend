"use client";

import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportCsvButtonProps {
  onExport: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ExportCsvButton({ onExport, isLoading, disabled }: ExportCsvButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onExport}
      disabled={disabled ?? isLoading}
      className="h-8 gap-1.5 text-xs"
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      Export CSV
    </Button>
  );
}

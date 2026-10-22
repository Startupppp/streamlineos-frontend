"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { downloadGenealogyCsv, type GenealogyParams } from "@/hooks/api/inventory/genealogy";

const EXPORT_PERMISSION = "inventory:export";

interface GenealogyExportButtonProps {
  params: GenealogyParams;
}

export function GenealogyExportButton({ params }: GenealogyExportButtonProps) {
  const canExport = useCan(EXPORT_PERMISSION);
  const [isExporting, setIsExporting] = useState(false);

  function handleExport(): void {
    setIsExporting(true);
    void downloadGenealogyCsv(params)
      .catch((error: unknown) => toast.error(getErrorMessage(error)))
      .finally(() => setIsExporting(false));
  }

  if (!canExport) return null;

  return (
    <LoadingButton
      variant="outline"
      size="sm"
      isPending={isExporting}
      loadingText="Preparing…"
      onClick={handleExport}
    >
      Export CSV
    </LoadingButton>
  );
}

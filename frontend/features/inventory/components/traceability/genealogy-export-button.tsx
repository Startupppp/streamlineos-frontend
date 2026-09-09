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

/**
 * Taking the trace away.
 *
 * `GET /inventory/traceability/genealogy/export` had no caller, so a recall
 * chain could be read on screen and never handed to a regulator, an insurer or
 * anybody without a login — which for an audit trail is most of the way to not
 * having one.
 *
 * Gated on `inventory:export` rather than the `inventory:stock:read` the graph
 * itself asks for: that is the route's own key, and reading a chain is a weaker
 * right than carrying it out of the building.
 */
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

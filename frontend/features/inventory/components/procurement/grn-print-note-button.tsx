"use client";

import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDownloadGrnNote } from "@/hooks/api/inventory/labels";

export interface GrnPrintNoteButtonProps {
  grnId: number;
  grnNumber: string;
}

export function GrnPrintNoteButton({ grnId, grnNumber }: GrnPrintNoteButtonProps) {
  const download = useDownloadGrnNote();

  function handlePrint(): void {
    download.mutate(
      { grnId, grnNumber },
      { onError: (error) => toast.error(getErrorMessage(error)) },
    );
  }

  return (
    <LoadingButton
      type="button"
      variant="outline"
      size="sm"
      onClick={handlePrint}
      isPending={download.isPending}
      loadingText="Preparing…"
    >
      Print note
    </LoadingButton>
  );
}

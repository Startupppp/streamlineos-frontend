"use client";

import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDownloadGrnNote } from "@/hooks/api/inventory/labels";

export interface GrnPrintNoteButtonProps {
  grnId: number;
  grnNumber: string;
}

/**
 * G4 — the printed goods received note.
 *
 * A button rather than a link, and that is the whole point of this component
 * existing. `<a href="/inventory/labels/goods-receipts/42/pdf">` looks like the
 * obvious answer and cannot work: the API authenticates with a bearer token held
 * in memory, a browser navigation carries cookies only, and the route would 401.
 * What the user would see is a downloaded file that will not open — which reads
 * as a broken PDF rather than as a missing header, and is why this went wrong
 * once already.
 *
 * `useDownloadGrnNote` fetches with the token attached, checks the bytes really
 * are a PDF, and hands the blob to a one-shot object URL.
 *
 * Shown for any receipt at any status: counters want the sheet before they post,
 * and the document prints its own status so a pre-post copy cannot be mistaken
 * for a posted one.
 */
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

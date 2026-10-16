"use client";

import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import { useDownloadDocumentPdf, type DocumentPdfKind } from "@/hooks/api/accounting/documents";
import { getErrorMessage } from "@/lib/get-error-message";

const READ_KEY = {
  invoice: "accounting:receivables:read",
  "credit-note": "accounting:credit-notes:read",
  bill: "accounting:payables:read",
} as const;

interface DocumentPdfButtonProps {
  kind: DocumentPdfKind;
  documentId: string;
  /** Used when the server sends no Content-Disposition filename. */
  fallbackName: string;
}

/** Saves a posted document's PDF. Only posted documents have one, so callers hide it on drafts. */
export function DocumentPdfButton({ kind, documentId, fallbackName }: DocumentPdfButtonProps) {
  const canRead = useCan(READ_KEY[kind]);
  const download = useDownloadDocumentPdf(kind);

  if (!canRead) return null;

  function handleDownload(): void {
    download.mutate(
      { documentId, fallbackName },
      {
        onSuccess: ({ filename }) => toast.success(`Downloaded ${filename}`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <LoadingButton
      type="button"
      size="sm"
      variant="outline"
      className="flex-1 sm:flex-none"
      isPending={download.isPending}
      onClick={handleDownload}
    >
      Download PDF
    </LoadingButton>
  );
}

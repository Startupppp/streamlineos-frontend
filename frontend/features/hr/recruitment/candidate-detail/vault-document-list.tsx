"use client";

import { useState, useCallback } from "react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Trash2,
  ShieldCheck,
  ShieldX,
  Clock,
  AlertTriangle,
  CreditCard,
  FileCheck,
  Fingerprint,
  FileSignature,
  FileBadge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import {
  useCandidateVault,
  useDeleteVaultDocument,
} from "@/hooks/api/hr/recruitment";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

const DOCUMENT_TYPES = [
  { value: "AADHAR", label: "Aadhar Card" },
  { value: "PAN", label: "PAN Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "CERTIFICATE", label: "Certificate/Degree" },
  { value: "OFFER_LETTER", label: "Offer Letter" },
  { value: "OTHER", label: "Other" },
] as const;

function getDocTypeIcon(
  documentType: string | null | undefined,
): React.ComponentType<{ className?: string }> {
  switch (documentType) {
    case "AADHAR":
      return Fingerprint;
    case "PAN":
      return CreditCard;
    case "PASSPORT":
      return FileBadge;
    case "CERTIFICATE":
      return FileCheck;
    case "OFFER_LETTER":
      return FileSignature;
    default:
      return FileText;
  }
}

function getDocTypeBadgeClass(documentType: string | null | undefined): string {
  switch (documentType) {
    case "AADHAR":
      return "bg-status-warning-surface text-status-warning-ink border-status-warning-rule";
    case "PAN":
      return "bg-status-info-surface text-status-info-ink border-status-info-rule";
    case "PASSPORT":
      return "bg-status-info-surface text-status-info-ink border-status-info-rule";
    case "CERTIFICATE":
      return "bg-status-success-surface text-status-success-ink border-status-success-rule";
    case "OFFER_LETTER":
      return "bg-status-success-surface text-status-success-ink border-status-success-rule";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function AvScanBadge({
  result,
}: {
  result: "PENDING" | "CLEAN" | "INFECTED" | null;
}) {
  if (result === "CLEAN") {
    return (
      <span className="inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border bg-status-success-surface text-status-success-ink border-status-success-rule">
        <ShieldCheck className="h-2.5 w-2.5" aria-hidden="true" />
        Clean
      </span>
    );
  }
  if (result === "INFECTED") {
    return (
      <span className="inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border bg-status-danger-surface text-status-danger-ink border-status-danger-rule">
        <ShieldX className="h-2.5 w-2.5" aria-hidden="true" />
        Infected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
      <Clock
        className="h-2.5 w-2.5"
        style={{ animation: "spin 2s linear infinite" }}
        aria-hidden="true"
      />
      Scanning
    </span>
  );
}

interface DeleteDocButtonProps {
  docId: number;
  filename: string;
  onRequestDelete: (id: number) => void;
}

function DeleteDocButton({ docId, filename, onRequestDelete }: DeleteDocButtonProps) {
  function handleClick() { onRequestDelete(docId); }
  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-7 text-muted-foreground hover:text-destructive transition-colors duration-200"
      aria-label={`Delete ${filename}`}
      onClick={handleClick}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

interface VaultDocumentListProps {
  candidateId: number;
}

export function VaultDocumentList({ candidateId }: VaultDocumentListProps) {
  const { data: docs, isLoading } = useCandidateVault(candidateId);
  const deleteDoc = useDeleteVaultDocument(candidateId);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const handleRequestDelete = useCallback(
    (id: number) => setPendingDelete(id),
    [],
  );
  const handleCancelDelete = useCallback((open: boolean) => {
    if (!open) setPendingDelete(null);
  }, []);
  const handleConfirmDelete = useCallback(() => {
    if (pendingDelete === null) return;
    deleteDoc.mutate(pendingDelete, {
      onSuccess: () => {
        toast.success("Document deleted");
        setPendingDelete(null);
      },
      onError: (e) => {
        toast.error(getErrorMessage(e));
        setPendingDelete(null);
      },
    });
  }, [pendingDelete, deleteDoc]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!docs?.length) {
    return (
      <RecruitmentEmptyState
        illustration={<EmptyDocumentsIllustration />}
        title="No documents yet"
        description="Upload verification documents using the button above."
        compact
        className="border-0 bg-transparent shadow-none"
      />
    );
  }

  return (
    <>
      <div className="space-y-2">
        {docs.map((doc) => {
          const docTypeLabel =
            DOCUMENT_TYPES.find((t) => t.value === doc.documentType)?.label ??
            doc.documentType ??
            "Document";
          const DocIcon = getDocTypeIcon(doc.documentType);
          const docTypeBadge = getDocTypeBadgeClass(doc.documentType);

          return (
            <div
              key={doc.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors duration-200 hover:bg-muted/30",
                doc.avResult === "INFECTED" && "border-status-danger-rule",
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                    doc.avResult === "INFECTED"
                      ? "bg-status-danger-surface"
                      : "bg-muted",
                  )}
                >
                  <DocIcon
                    className={cn(
                      "h-3.5 w-3.5",
                      doc.avResult === "INFECTED"
                        ? "text-status-danger-ink"
                        : "text-muted-foreground",
                    )}
                    aria-hidden="true"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <TruncatedText text={doc.filename} className="text-xs font-semibold text-foreground" />
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span
                      className={cn(
                        "inline-flex items-center text-micro font-semibold px-1.5 py-0 rounded-full border",
                        docTypeBadge,
                      )}
                    >
                      {docTypeLabel}
                    </span>
                    <AvScanBadge result={doc.avResult} />
                    {doc.expiresAt &&
                      (() => {
                        const daysLeft = differenceInDays(
                          new Date(doc.expiresAt),
                          new Date(),
                        );
                        if (daysLeft < 0) {
                          return (
                            <span className="inline-flex items-center gap-1 text-micro font-semibold px-1.5 py-0 rounded-full border bg-status-danger-surface text-status-danger-ink border-status-danger-rule">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Expired
                            </span>
                          );
                        }
                        if (daysLeft <= 30) {
                          return (
                            <span className="inline-flex items-center gap-1 text-micro font-semibold px-1.5 py-0 rounded-full border bg-status-warning-surface text-status-warning-ink border-status-warning-rule">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              {daysLeft}d left
                            </span>
                          );
                        }
                        return null;
                      })()}
                    {doc.createdAt && (
                      <span className="text-micro text-muted-foreground tabular-nums">
                        {format(new Date(doc.createdAt), "d MMM yy")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {doc.avResult === "INFECTED" ? (
                  <span className="text-micro text-status-danger-ink flex items-center gap-1 font-semibold">
                    <AlertTriangle className="h-3 w-3" />
                    Blocked
                  </span>
                ) : (
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-muted transition-colors duration-200"
                    aria-label={`Download ${doc.filename}`}
                  >
                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
                <DeleteDocButton docId={doc.id} filename={doc.filename} onRequestDelete={handleRequestDelete} />
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmSheet
        open={pendingDelete !== null}
        onOpenChange={handleCancelDelete}
        title="Delete Document"
        description="This will permanently delete the document from the vault. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        isPending={deleteDoc.isPending}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

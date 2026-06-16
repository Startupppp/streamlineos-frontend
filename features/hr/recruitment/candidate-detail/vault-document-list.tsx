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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useCandidateVault,
  useDeleteVaultDocument,
} from "@/lib/api/hooks/hr/recruitment";
import { getErrorMessage } from "@/lib/get-error-message";

const DOCUMENT_TYPES = [
  { value: "AADHAR", label: "Aadhar Card" },
  { value: "PAN", label: "PAN Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "CERTIFICATE", label: "Certificate/Degree" },
  { value: "OFFER_LETTER", label: "Offer Letter" },
  { value: "OTHER", label: "Other" },
] as const;

function AvScanBadge({ result }: { result: "PENDING" | "CLEAN" | "INFECTED" | null }) {
  if (result === "CLEAN") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1"
      >
        <ShieldCheck className="h-2.5 w-2.5" />
        Clean
      </Badge>
    );
  }
  if (result === "INFECTED") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] bg-destructive/10 text-destructive border-destructive/20 gap-1"
      >
        <ShieldX className="h-2.5 w-2.5" />
        Infected
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] gap-1">
      <Clock className="h-2.5 w-2.5 animate-spin" style={{ animationDuration: "2s" }} />
      Scanning
    </Badge>
  );
}

interface VaultDocumentListProps {
  candidateId: number;
}

export function VaultDocumentList({ candidateId }: VaultDocumentListProps) {
  const { data: docs, isLoading } = useCandidateVault(candidateId);
  const deleteDoc = useDeleteVaultDocument(candidateId);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const handleRequestDelete = useCallback((id: number) => setPendingDelete(id), []);
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
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!docs?.length) {
    return (
      <div className="py-6 text-center">
        <FileText className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>
      </div>
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
          return (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{doc.filename}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {docTypeLabel}
                    </Badge>
                    <AvScanBadge result={doc.avResult} />
                    {doc.expiresAt &&
                      (() => {
                        const daysLeft = differenceInDays(
                          new Date(doc.expiresAt),
                          new Date(),
                        );
                        if (daysLeft < 0) {
                          return (
                            <Badge
                              variant="destructive"
                              className="text-[9px] px-1 py-0 gap-0.5"
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Expired
                            </Badge>
                          );
                        }
                        if (daysLeft <= 30) {
                          return (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 text-amber-600 border-amber-400 gap-0.5"
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Expires in {daysLeft}d
                            </Badge>
                          );
                        }
                        return null;
                      })()}
                    {doc.createdAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(doc.createdAt), "d MMM yy")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {doc.avResult !== "INFECTED" && (
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted transition-colors"
                    aria-label={`Download ${doc.filename}`}
                  >
                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
                {doc.avResult === "INFECTED" && (
                  <span className="text-[10px] text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Blocked
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  aria-label={`Delete ${doc.filename}`}
                  onClick={() => handleRequestDelete(doc.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={handleCancelDelete}
        title="Delete Document"
        description="This will permanently delete the document from the vault. This action cannot be undone."
        confirmLabel={deleteDoc.isPending ? "Deleting..." : "Delete"}
        destructive
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

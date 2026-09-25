"use client";

import {
  FileText,
  Trash2,
  ShieldCheck,
  ShieldX,
  Clock,
  CreditCard,
  FileCheck,
  Fingerprint,
  FileSignature,
  FileBadge,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * How one vault document is PRESENTED: its type vocabulary, the icon and badge
 * class each type gets, the antivirus verdict chip, and the delete affordance.
 *
 * `vault-document-list.tsx` owns the list itself — fetching, the delete
 * confirmation and the empty/loading states. This is the half that changes when
 * a new document type or scan verdict is added, and none of it touches the
 * candidate vault hooks.
 */

export const DOCUMENT_TYPES = [
  { value: "AADHAR", label: "Aadhar Card" },
  { value: "PAN", label: "PAN Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "CERTIFICATE", label: "Certificate/Degree" },
  { value: "OFFER_LETTER", label: "Offer Letter" },
  { value: "OTHER", label: "Other" },
] as const;

export function getDocTypeIcon(
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

export function getDocTypeBadgeClass(documentType: string | null | undefined): string {
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

export function AvScanBadge({
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

export function DeleteDocButton({ docId, filename, onRequestDelete }: DeleteDocButtonProps) {
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


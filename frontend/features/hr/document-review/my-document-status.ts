import type { StatusTone } from "@/lib/design-tokens";
import type { MyOnboardingDoc, MyOnboardingDocStatus } from "@/hooks/api/hr/documents";

export const MY_DOC_STATUS_LABELS: Record<MyOnboardingDocStatus, string> = {
  PENDING: "Pending",
  SUBMITTED: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RE_UPLOAD_REQUESTED: "Re-upload requested",
};

export const MY_DOC_STATUS_TONES: Record<MyOnboardingDocStatus, StatusTone> = {
  PENDING: "warning",
  SUBMITTED: "info",
  APPROVED: "success",
  REJECTED: "danger",
  RE_UPLOAD_REQUESTED: "warning",
};

export interface MyDocumentRowActions {
  canView: boolean;
  canDownload: boolean;
  canUpload: boolean;
  uploadLabel: string;
}

const UPLOAD_LABELS: Partial<Record<MyOnboardingDocStatus, string>> = {
  PENDING: "Upload",
  REJECTED: "Re-upload",
  RE_UPLOAD_REQUESTED: "Re-upload",
};

export function myDocumentRowActions(
  doc: MyOnboardingDoc,
  canUploadSelf: boolean,
): MyDocumentRowActions {
  const hasFile = doc.hasFile ?? doc.status !== "PENDING";
  const uploadLabel = UPLOAD_LABELS[doc.status];
  return {
    canView: hasFile,
    canDownload: hasFile,
    canUpload: canUploadSelf && uploadLabel !== undefined,
    uploadLabel: uploadLabel ?? "Upload",
  };
}

export function myDocumentRowHint(doc: MyOnboardingDoc): string {
  if (doc.remarks) return doc.remarks;
  if (doc.status === "RE_UPLOAD_REQUESTED")
    return "HR asked for a new copy of this document.";
  if (doc.status === "REJECTED") return "This submission was not accepted.";
  if (doc.status === "SUBMITTED") return "Submitted — waiting on HR review.";
  return doc.isMandatory ? "Required document" : "Optional document";
}

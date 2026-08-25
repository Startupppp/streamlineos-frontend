"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { UploadIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/date-utils";
import type { HrDocumentType } from "@/hooks/api/hr/document-types";
import { viewProtectedFile } from "@/hooks/common/use-file-url";

import { DocumentFileRow } from "./onboarding-document-file-row";
import {
  canUpload,
  docStatusBadgeClass,
  docStatusLabel,
  type DocStatus,
} from "./onboarding-doc-status";

export type DocumentType = HrDocumentType;

export interface OnboardingDoc {
  id: number;
  documentTypeId: number;
  documentTypeName: string;
  isMandatory: boolean;
  hasFile: boolean;
  fileName: string;
  fileSize: number | null;
  status: DocStatus;
  reviewedAt: string | null;
  reviewerName: string | null;
  remarks: string | null;
  version: number | null;
}

function docStatusIcon(status: DocStatus) {
  if (status === "APPROVED") return <CheckCircle2 className="h-4 w-4 text-status-success-ink" />;
  if (status === "SUBMITTED") return <Clock className="h-4 w-4 text-status-warning-ink" />;
  if (status === "REJECTED") return <AlertCircle className="h-4 w-4 text-status-danger-ink" />;
  if (status === "RE_UPLOAD_REQUESTED") return <RefreshCw className="h-4 w-4 text-status-warning-ink" />;
  return <Circle className="h-4 w-4 text-muted-foreground/40" />;
}

function useBlobPreviewUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return url;
}

export type DocumentChecklistRowProps = {
  docType: DocumentType;
  submission: OnboardingDoc | null;
  pendingFile: File | null;
  isWizard: boolean;
  onPickFile: (docType: DocumentType) => void;
  onRemovePending: (documentTypeId: number) => void;
  onOpenUpload: (docType: DocumentType, existing: OnboardingDoc | null) => void;
};

export function DocumentChecklistRow({
  docType,
  submission,
  pendingFile,
  isWizard,
  onPickFile,
  onRemovePending,
  onOpenUpload,
}: DocumentChecklistRowProps) {
  const isApproved = submission?.status === "APPROVED";
  const status = submission?.status ?? "PENDING";
  const showFileRow = Boolean(pendingFile) || Boolean(submission?.hasFile);
  const showUploadAction = canUpload(submission?.status) && !showFileRow;
  const blobUrl = useBlobPreviewUrl(isWizard && pendingFile ? pendingFile : null);

  const handleReplace = useCallback(() => {
    if (isWizard) {
      onPickFile(docType);
      return;
    }
    onOpenUpload(docType, submission);
  }, [docType, isWizard, onOpenUpload, onPickFile, submission]);

  const handleRemovePending = useCallback(() => {
    onRemovePending(docType.id);
  }, [docType.id, onRemovePending]);

  const handleUploadClick = useCallback(() => {
    if (isWizard) {
      onPickFile(docType);
      return;
    }
    onOpenUpload(docType, submission);
  }, [docType, isWizard, onOpenUpload, onPickFile, submission]);

  const handleViewSubmitted = useCallback(() => {
    if (!submission) return;
    void viewProtectedFile(`/hr/onboarding-docs/me/${submission.id}/file`);
  }, [submission]);

  const fileName = pendingFile?.name ?? submission?.fileName ?? "";
  const viewHref = pendingFile ? blobUrl : null;
  const canReplace = canUpload(submission?.status) && !isApproved;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 border-l-4 transition-colors duration-200",
        isWizard
          ? "bg-card/60"
          : "rounded-2xl bg-card/90 backdrop-blur-sm shadow-card",
        isApproved
          ? "border-l-emerald-500"
          : status === "SUBMITTED"
            ? "border-l-amber-400"
            : status === "REJECTED" || status === "RE_UPLOAD_REQUESTED"
              ? "border-l-rose-400"
              : "border-l-border",
      )}
    >
      <div className="px-2.5 py-2 sm:px-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 shrink-0">{docStatusIcon(status)}</div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <TruncatedText
                    text={docType.name}
                    lines={2}
                    className={cn(
                      "text-sm font-medium text-foreground",
                      isApproved && "text-muted-foreground line-through",
                    )}
                  />
                  {docType.isMandatory ? (
                    <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted px-1.5 py-px text-micro font-semibold text-muted-foreground">
                      Required
                    </span>
                  ) : null}
                  {submission ? (
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded-full border px-1.5 py-px text-micro font-semibold",
                        docStatusBadgeClass(submission.status),
                      )}
                    >
                      {docStatusLabel(submission.status)}
                    </span>
                  ) : null}
                </div>
              </div>

              {showUploadAction ? (
                <AnimatedIconButton
                  icon={UploadIcon}
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0 gap-1 px-2 text-xs duration-200 sm:px-2.5"
                  onClick={handleUploadClick}
                  aria-label={`Upload ${docType.name}`}
                >
                  <span className="hidden sm:inline">Upload</span>
                </AnimatedIconButton>
              ) : null}
            </div>

            {docType.description && !isApproved ? (
              <TruncatedText
                text={docType.description}
                lines={2}
                className="mt-0.5 text-xs text-muted-foreground"
              />
            ) : null}

            {showFileRow && fileName ? (
              <DocumentFileRow
                fileName={fileName}
                viewHref={viewHref}
                onView={!pendingFile && submission ? handleViewSubmitted : undefined}
                pending={Boolean(isWizard && pendingFile)}
                onReplace={canReplace ? handleReplace : undefined}
                onRemove={isWizard && pendingFile ? handleRemovePending : undefined}
              />
            ) : null}

            {submission?.reviewedAt && isApproved ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Approved{" "}
                {formatShortDate(submission.reviewedAt)}
                {submission.reviewerName ? ` by ${submission.reviewerName}` : ""}
              </p>
            ) : null}

            {submission?.status === "RE_UPLOAD_REQUESTED" && submission.remarks ? (
              <TruncatedText
                text={`Remarks: ${submission.remarks}`}
                lines={2}
                className="mt-0.5 text-xs text-status-warning-ink"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback } from "react";
import type { OnboardingChecklistDoc } from "@/hooks/api/hr/onboarding";
import { format } from "date-fns";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { ExternalLinkIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { viewProtectedFile } from "@/hooks/common/use-file-url";

export type OnboardingDoc = OnboardingChecklistDoc;

export function getDocStatusBadgeClass(status: OnboardingDoc["status"]): string {
  switch (status) {
    case "APPROVED":
      return "bg-status-success-surface text-status-success-ink border-status-success-rule";
    case "SUBMITTED":
      return "bg-status-info-surface text-status-info-ink border-status-info-rule";
    case "REJECTED":
      return "bg-status-danger-surface text-status-danger-ink border-status-danger-rule";
    case "RE_UPLOAD_REQUESTED":
      return "bg-status-warning-surface text-status-warning-ink border-status-warning-rule";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function getDocStatusAccentClass(status: OnboardingDoc["status"]): string {
  switch (status) {
    case "APPROVED":
      return "border-l-emerald-500";
    case "SUBMITTED":
      return "border-l-blue-500";
    case "REJECTED":
      return "border-l-rose-500";
    case "RE_UPLOAD_REQUESTED":
      return "border-l-amber-500";
    default:
      return "border-l-slate-300";
  }
}

export function docStatusLabel(status: OnboardingDoc["status"]): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "SUBMITTED":
      return "Submitted";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "RE_UPLOAD_REQUESTED":
      return "Re-upload Requested";
  }
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocFileLink({ docId, fileName, ariaLabel }: { docId: number; fileName: string; ariaLabel: string }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleClick = useCallback(() => {
    void viewProtectedFile(`/hr/onboarding-docs/${docId}/file`);
  }, [docId]);
  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-0.5 text-primary hover:text-primary/80 hover:underline transition-colors duration-200"
      aria-label={ariaLabel}
      {...hoverHandlers}
    >
      {fileName}
      <ExternalLinkIcon ref={iconRef} size={12} className="ml-0.5" />
    </button>
  );
}

interface DocCardProps {
  doc: OnboardingDoc;
  canReview: boolean;
  onApprove: (doc: OnboardingDoc) => void;
  onRequestReupload: (doc: OnboardingDoc) => void;
}

export function DocCard({ doc, canReview, onApprove, onRequestReupload }: DocCardProps) {
  const handleApproveClick = useCallback(() => onApprove(doc), [doc, onApprove]);
  const handleReuploadClick = useCallback(() => onRequestReupload(doc), [doc, onRequestReupload]);

  return (
    <div
      className={cn(
        "rounded-xl border-l-4 border border-border bg-card shadow-sm overflow-hidden",
        getDocStatusAccentClass(doc.status),
      )}
    >
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{doc.documentTypeName}</p>
              {doc.isMandatory && (
                <span className="inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border bg-status-warning-surface text-status-warning-ink border-status-warning-rule shrink-0">
                  Required
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap text-dense text-muted-foreground">
              {doc.hasFile ? (
                <DocFileLink
                  docId={doc.id}
                  fileName={doc.fileName}
                  ariaLabel={`View ${doc.fileName}`}
                />
              ) : null}
              {doc.fileSize != null && <span>{formatBytes(doc.fileSize)}</span>}
              {doc.version != null && <span>v{doc.version}</span>}
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border shrink-0",
              getDocStatusBadgeClass(doc.status),
            )}
          >
            {docStatusLabel(doc.status)}
          </span>
        </div>

        {doc.reviewedAt && (
          <p className="text-dense text-muted-foreground">
            Reviewed {format(new Date(doc.reviewedAt), "MMM d, yyyy")}
            {doc.reviewerName ? ` by ${doc.reviewerName}` : ""}
          </p>
        )}
        {doc.remarks && (
          <p className="text-dense text-muted-foreground italic border-l-2 border-muted pl-2">
            {doc.remarks}
          </p>
        )}

        {doc.status === "SUBMITTED" && canReview && (
          <>
            <Separator />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs flex-1 border-status-success-rule text-status-success-ink hover:bg-status-success-surface transition-colors duration-200"
                onClick={handleApproveClick}
                aria-label={`Approve ${doc.documentTypeName}`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs flex-1 transition-colors duration-200"
                onClick={handleReuploadClick}
                aria-label={`Request re-upload for ${doc.documentTypeName}`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Request Re-upload
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

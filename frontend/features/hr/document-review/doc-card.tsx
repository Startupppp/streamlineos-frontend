"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { ExternalLinkIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface OnboardingDoc {
  id: number;
  documentTypeId: number;
  documentTypeName: string;
  isMandatory: boolean;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  version: number | null;
  status: "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED" | "RE_UPLOAD_REQUESTED";
  reviewedAt: string | null;
  reviewerName: string | null;
  remarks: string | null;
  createdAt: string | null;
}

export function getDocStatusBadgeClass(status: OnboardingDoc["status"]): string {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-700";
    case "SUBMITTED":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-700";
    case "REJECTED":
      return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-700";
    case "RE_UPLOAD_REQUESTED":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-700";
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

function DocFileLink({ href, fileName, ariaLabel }: { href: string; fileName: string; ariaLabel: string }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-primary hover:text-primary/80 hover:underline transition-colors duration-200"
      aria-label={ariaLabel}
      {...hoverHandlers}
    >
      {fileName}
      <ExternalLinkIcon ref={iconRef} size={12} className="ml-0.5" />
    </a>
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
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-700 shrink-0">
                  Required
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap text-[11px] text-muted-foreground">
              <DocFileLink href={doc.fileUrl} fileName={doc.fileName} ariaLabel={`Download ${doc.fileName}`} />
              {doc.fileSize != null && <span>{formatBytes(doc.fileSize)}</span>}
              {doc.version != null && <span>v{doc.version}</span>}
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
              getDocStatusBadgeClass(doc.status),
            )}
          >
            {docStatusLabel(doc.status)}
          </span>
        </div>

        {doc.reviewedAt && (
          <p className="text-[11px] text-muted-foreground">
            Reviewed {format(new Date(doc.reviewedAt), "MMM d, yyyy")}
            {doc.reviewerName ? ` by ${doc.reviewerName}` : ""}
          </p>
        )}
        {doc.remarks && (
          <p className="text-[11px] text-muted-foreground italic border-l-2 border-muted pl-2">
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
                className="gap-1.5 text-xs flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-950/40 transition-colors duration-200"
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

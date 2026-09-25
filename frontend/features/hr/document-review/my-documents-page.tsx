"use client";

import { useCallback, useState } from "react";
import { FileClock, FileWarning } from "lucide-react";
import { UploadIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_BODY_EMPTY_CLASS, PAGE_BODY_SKELETON_CLASS } from "@/components/ui/content-fill-panel";
import { useMyOnboardingDocs } from "@/hooks/api/hr/documents";
import type { MyOnboardingDocStatus } from "@/hooks/api/hr/documents";
import { UploadDocSheet } from "@/features/hr/document-review/upload-doc-sheet";

const STATUS_LABELS: Record<MyOnboardingDocStatus, string> = {
  PENDING: "Pending",
  SUBMITTED: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RE_UPLOAD_REQUESTED: "Re-upload requested",
};

const STATUS_CLASSES: Record<MyOnboardingDocStatus, string> = {
  PENDING:
    "border-status-warning-rule bg-status-warning-surface text-status-warning-ink",
  SUBMITTED:
    "border-status-info-rule bg-status-info-surface text-status-info-ink",
  APPROVED:
    "border-status-success-rule bg-status-success-surface text-status-success-ink",
  REJECTED:
    "border-status-danger-rule bg-status-danger-surface text-status-danger-ink",
  RE_UPLOAD_REQUESTED:
    "border-status-warning-rule bg-status-warning-surface text-status-warning-ink",
};

function DocumentsSkeleton() {
  return (
    <div className={PAGE_BODY_SKELETON_CLASS}>
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function MyDocumentsPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const documents = useMyOnboardingDocs();
  const canUpload = useCan("self:onboarding-docs");
  const pageState = usePageState({
    permission: "self:onboarding-docs",
    isLoading: documents.isLoading,
    isError: documents.isError,
    error: documents.error,
    isEmpty: (documents.data?.data.length ?? 0) === 0,
  });
  const { refetch } = documents;
  const handleRetry = useCallback(() => void refetch(), [refetch]);

  const handleOpenUpload = useCallback(() => setUploadOpen(true), []);

  return (
    <PageWrapper
      title="My Documents"
      subtitle="Track the documents requested for your employment record."
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={
        canUpload ? (
          <AnimatedIconButton icon={UploadIcon} onClick={handleOpenUpload}>
            Upload Document
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <PageState
        resolution={pageState}
        onRetry={handleRetry}
        className={PAGE_BODY_EMPTY_CLASS}
        loading={<DocumentsSkeleton />}
        empty={
          <EmptyState
            illustrationPreset="documents"
            title="No documents requested"
            description="Your organization has not requested any employment documents."
            className={PAGE_BODY_EMPTY_CLASS}
          />
        }
      >
        <div className="min-h-0 flex-1 divide-y overflow-y-auto rounded-xl border border-border bg-card">
          {(documents.data?.data ?? []).map((document) => {
            const needsAttention =
              document.status === "PENDING" ||
              document.status === "REJECTED" ||
              document.status === "RE_UPLOAD_REQUESTED";
            const StatusIcon = needsAttention ? FileWarning : FileClock;

            return (
              <div
                key={document.id}
                className="flex min-w-0 items-center gap-3 px-4 py-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <StatusIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-label font-medium text-foreground">
                    {document.documentTypeName}
                  </p>
                  <p className="truncate text-dense text-muted-foreground">
                    {document.remarks ??
                      (document.isMandatory ? "Required document" : "Optional document")}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`h-5 shrink-0 px-2 py-0.5 text-micro ${STATUS_CLASSES[document.status]}`}
                >
                  {STATUS_LABELS[document.status]}
                </Badge>
              </div>
            );
          })}
        </div>
      </PageState>

      <UploadDocSheet
        open={uploadOpen}
        userId={null}
        userName={null}
        selfUpload
        onOpenChange={setUploadOpen}
      />
    </PageWrapper>
  );
}

"use client";

import { useCallback, useState } from "react";
import { FileCheck2, FileClock, FileWarning } from "lucide-react";
import { UploadIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyOnboardingDocs } from "@/hooks/api/hr/documents";
import { getErrorMessage } from "@/lib/get-error-message";
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
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  SUBMITTED:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
  APPROVED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  REJECTED:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
  RE_UPLOAD_REQUESTED:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
};

function DocumentsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function MyDocumentsPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const documents = useMyOnboardingDocs();

  const handleOpenUpload = useCallback(() => setUploadOpen(true), []);

  return (
    <PageWrapper
      title="My Documents"
      subtitle="Track the documents requested for your employment record."
      actions={
        <AnimatedIconButton icon={UploadIcon} onClick={handleOpenUpload}>
          Upload Document
        </AnimatedIconButton>
      }
    >
      {documents.isLoading ? <DocumentsSkeleton /> : null}

      {documents.isError ? (
        <ErrorState
          className="flex-1"
          title="Documents unavailable"
          description={getErrorMessage(documents.error)}
          onRetry={documents.refetch}
        />
      ) : null}

      {!documents.isLoading && !documents.isError && documents.data?.data.length === 0 ? (
        <EmptyState
          illustration={<FileCheck2 className="h-12 w-12 text-muted-foreground/40" />}
          illustrationSize="sm"
          title="No documents requested"
          description="Your organization has not requested any employment documents."
        />
      ) : null}

      {!documents.isLoading && !documents.isError && documents.data?.data.length ? (
        <Card className="overflow-hidden py-0">
          <CardContent className="divide-y p-0">
            {documents.data.data.map((document) => {
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
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {document.documentTypeName}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {document.remarks ??
                        (document.isMandatory ? "Required document" : "Optional document")}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`h-5 shrink-0 px-2 py-0.5 text-[10px] ${STATUS_CLASSES[document.status]}`}
                  >
                    {STATUS_LABELS[document.status]}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

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

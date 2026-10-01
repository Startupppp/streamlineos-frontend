"use client";

import { useCallback, useState } from "react";
import { UploadIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PAGE_BODY_EMPTY_CLASS, PAGE_BODY_SKELETON_CLASS } from "@/components/ui/content-fill-panel";
import {
  MY_DOCS_PAGE_SIZE,
  useMyOnboardingDocs,
  type MyOnboardingDoc,
} from "@/hooks/api/hr/documents";
import { UploadDocSheet } from "@/features/hr/document-review/upload-doc-sheet";
import { MyDocumentRow } from "@/features/hr/document-review/my-document-row";

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
  const [pendingOnly, setPendingOnly] = useState(false);
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const canUpload = useCan("self:onboarding-docs");
  const documents = useMyOnboardingDocs({
    cursor: cursors.at(-1),
    limit: MY_DOCS_PAGE_SIZE,
    ...(pendingOnly ? { status: "PENDING" as const } : {}),
  });
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
  const handleRowUpload = useCallback((_doc: MyOnboardingDoc) => setUploadOpen(true), []);

  const handleTogglePendingOnly = useCallback((next: boolean) => {
    setPendingOnly(next);
    setCursors([undefined]);
  }, []);
  const handlePrevious = useCallback(
    () => setCursors((current) => current.slice(0, -1)),
    [],
  );
  const handleNext = useCallback(() => {
    const nextCursor = documents.data?.pagination?.nextCursor;
    if (nextCursor) setCursors((current) => [...current, nextCursor]);
  }, [documents.data?.pagination?.nextCursor]);

  const rows = documents.data?.data ?? [];
  const hasMore = documents.data?.pagination?.hasMore ?? false;

  return (
    <PageWrapper
      title="My Documents"
      subtitle="Track the documents requested for your employment record."
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      filters={
        <div className="flex items-center gap-2">
          <Switch
            id="my-documents-pending-only"
            checked={pendingOnly}
            onCheckedChange={handleTogglePendingOnly}
          />
          <Label
            htmlFor="my-documents-pending-only"
            className="text-dense text-muted-foreground"
          >
            Pending only
          </Label>
        </div>
      }
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
            title={pendingOnly ? "Nothing pending" : "No documents requested"}
            description={
              pendingOnly
                ? "You have no documents waiting on an upload. Switch off the filter to see the rest of your vault."
                : "Your organization has not requested any employment documents."
            }
            className={PAGE_BODY_EMPTY_CLASS}
          />
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="min-h-0 flex-1 divide-y overflow-y-auto rounded-xl border border-border bg-card">
            {rows.map((document) => (
              <MyDocumentRow
                key={document.id}
                doc={document}
                canUploadSelf={canUpload}
                onUpload={handleRowUpload}
              />
            ))}
          </div>
          {cursors.length > 1 || hasMore ? (
            <CursorPageControls
              page={cursors.length}
              hasNext={hasMore}
              disabled={documents.isFetching}
              onPrevious={handlePrevious}
              onNext={handleNext}
              className="shrink-0"
            />
          ) : null}
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

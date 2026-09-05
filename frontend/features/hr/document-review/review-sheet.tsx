"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { UploadIcon } from "@animateicons/react/lucide";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";

import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { getErrorMessage } from "@/lib/get-error-message";
import { DocCard, type OnboardingDoc } from "./doc-card";
import { UploadDocSheet } from "./upload-doc-sheet";

const DOCS_PAGE_SIZE = 20;

interface OnboardingDocsResponse {
  data: OnboardingDoc[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

function useEmployeeOnboardingDocs(
  userId: string | null,
  cursor: string | undefined,
) {
  const canReviewDocs = useCan("hr:onboarding:manage");
  return useQuery<OnboardingDocsResponse>({
    queryKey: humanResourcesQueryKeys.hr.onboardingDocs({ userId: userId ?? undefined, cursor, limit: DOCS_PAGE_SIZE }),
    queryFn: ({ signal }) =>
      apiClient.get<OnboardingDocsResponse>("/hr/onboarding-docs", {
        userId,
        cursor,
        limit: DOCS_PAGE_SIZE,
      }, signal),
    enabled: canReviewDocs && !!userId,
    staleTime: 30_000,
  });
}

function useReviewDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      docId,
      status,
      remarks,
    }: {
      docId: number;
      status: "APPROVED" | "RE_UPLOAD_REQUESTED";
      remarks?: string;
    }) =>
      apiClient.patch<{ success: boolean }>(`/hr/onboarding-docs/${docId}`, { status, remarks }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.onboardingDocsAll });
    },
  });
}

interface ReviewSheetProps {
  userId: string | null;
  userName: string | null;
  canReview: boolean;
  onClose: () => void;
}

export function ReviewSheet({ userId, userName, canReview, onClose }: ReviewSheetProps) {
  const reviewMutation = useReviewDocument();
  const [docsCursorHistory, setDocsCursorHistory] = useState<
    Array<string | undefined>
  >([undefined]);
  const docsPage = docsCursorHistory.length;
  const docsCursor = docsCursorHistory.at(-1);
  const {
    data: docsData,
    isLoading: docsLoading,
    isFetching: docsFetching,
    isError: docsFailed,
    refetch: refetchDocs,
  } = useEmployeeOnboardingDocs(userId, docsCursor);

  const handleRetryDocs = useCallback(() => {
    void refetchDocs();
  }, [refetchDocs]);

  const employeeDocs = docsData?.data;

  const [reuploadDoc, setReuploadDoc] = useState<OnboardingDoc | null>(null);
  const [reuploadRemarks, setReuploadRemarks] = useState("");
  const [approveDoc, setApproveDoc] = useState<OnboardingDoc | null>(null);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setDocsCursorHistory([undefined]);
        onClose();
      }
    },
    [onClose],
  );

  const handlePrevDocsPage = useCallback(() => {
    setDocsCursorHistory((history) =>
      history.length > 1 ? history.slice(0, -1) : history,
    );
  }, []);

  const handleNextDocsPage = useCallback(() => {
    const nextCursor = docsData?.pagination.nextCursor;
    if (nextCursor) {
      setDocsCursorHistory((history) => [...history, nextCursor]);
    }
  }, [docsData?.pagination.nextCursor]);

  const handleSetApproveDoc = useCallback((doc: OnboardingDoc) => setApproveDoc(doc), []);

  const handleApprove = useCallback(() => {
    if (!approveDoc) return;
    reviewMutation.mutate(
      { docId: approveDoc.id, status: "APPROVED" },
      {
        onSuccess: () => {
          toast.success("Document approved");
          setApproveDoc(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [approveDoc, reviewMutation]);

  const handleCloseApprove = useCallback((open: boolean) => {
    if (!open) setApproveDoc(null);
  }, []);

  const handleOpenUploadSheet = useCallback(() => setUploadSheetOpen(true), []);

  const handleOpenReupload = useCallback((doc: OnboardingDoc) => {
    setReuploadDoc(doc);
    setReuploadRemarks("");
  }, []);

  const handleCloseReupload = useCallback((open: boolean) => {
    if (!open) {
      setReuploadDoc(null);
      setReuploadRemarks("");
    }
  }, []);

  const handleCancelReupload = useCallback(() => {
    setReuploadDoc(null);
    setReuploadRemarks("");
  }, []);

  const handleReuploadRemarksChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setReuploadRemarks(e.target.value);
    },
    [],
  );

  const handleReupload = useCallback(() => {
    if (!reuploadDoc) return;
    if (!reuploadRemarks.trim()) {
      toast.error("Please provide remarks explaining what needs to be corrected");
      return;
    }
    reviewMutation.mutate(
      {
        docId: reuploadDoc.id,
        status: "RE_UPLOAD_REQUESTED",
        remarks: reuploadRemarks.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Re-upload requested");
          setReuploadDoc(null);
          setReuploadRemarks("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [reuploadDoc, reuploadRemarks, reviewMutation]);

  return (
    <>
      <Sheet open={userId !== null} onOpenChange={handleSheetOpenChange}>
        <SheetContent side="right" className="flex flex-col p-0 gap-0 sm:max-w-lg w-full">
          <SheetHeader className="shrink-0 px-5 pt-4 pb-3 border-b">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <SheetTitle className="text-base font-semibold">
                  {userName ?? "Employee"} — Documents
                </SheetTitle>
                <SheetDescription className="text-xs mt-0.5">
                  {canReview
                    ? "Review and approve submitted onboarding documents."
                    : "View submitted onboarding documents."}
                </SheetDescription>
              </div>
              {canReview && (
                <AnimatedIconButton
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs shrink-0"
                  onClick={handleOpenUploadSheet}
                  icon={UploadIcon}
                  iconSize={12}
                  iconClassName="mr-1.5"
                >
                  Upload
                </AnimatedIconButton>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4 space-y-3">
              {docsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-xl" />
                  ))}
                </div>
              ) : docsFailed ? (
                <ErrorState
                  title="Couldn’t load this employee’s documents"
                  description="The submission list did not load, so an empty review queue would be misleading. Try again."
                  onRetry={handleRetryDocs}
                  compact
                />
              ) : !employeeDocs || employeeDocs.length === 0 ? (
                <EmptyState
                  illustration={<EmptyDocumentsIllustration className="h-24 w-24" />}
                  title="No documents submitted"
                  description="This employee has not submitted any documents yet."
                  compact
                />
              ) : (
                <>
                  {employeeDocs.map((doc) => (
                    <DocCard
                      key={doc.id}
                      doc={doc}
                      canReview={canReview}
                      onApprove={handleSetApproveDoc}
                      onRequestReupload={handleOpenReupload}
                    />
                  ))}
                  {docsData &&
                  (docsPage > 1 || docsData.pagination.hasMore) ? (
                    <CursorPageControls
                      page={docsPage}
                      hasNext={docsData.pagination.hasMore}
                      disabled={docsFetching}
                      onPrevious={handlePrevDocsPage}
                      onNext={handleNextDocsPage}
                      className="pt-1"
                    />
                  ) : null}
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <ConfirmSheet
        open={approveDoc !== null}
        onOpenChange={handleCloseApprove}
        title="Approve Document"
        description={`Approve "${approveDoc?.documentTypeName}" submitted by ${userName ?? "this employee"}?`}
        confirmLabel="Approve"
        onConfirm={handleApprove}
        isPending={reviewMutation.isPending}
      />

      <Sheet open={reuploadDoc !== null} onOpenChange={handleCloseReupload}>
        <SheetContent side="right" className="flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 px-5 pt-4 pb-3 border-b">
            <SheetTitle className="text-base font-semibold">Request Re-upload</SheetTitle>
            <SheetDescription className="text-xs">
              Explain what needs to be corrected for{" "}
              <strong>{reuploadDoc?.documentTypeName}</strong>.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                Remarks <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Describe what needs to be corrected or re-submitted..."
                value={reuploadRemarks}
                onChange={handleReuploadRemarksChange}
                rows={4}
                className="resize-none"
                aria-label="Re-upload remarks"
              />
            </div>
          </div>

          <div className="shrink-0 px-5 py-3 border-t flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancelReupload}
              disabled={reviewMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleReupload}
              disabled={reviewMutation.isPending || !reuploadRemarks.trim()}
            >
              {reviewMutation.isPending && (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Request
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <UploadDocSheet
        open={uploadSheetOpen}
        userId={userId}
        userName={userName}
        onOpenChange={setUploadSheetOpen}
      />
    </>
  );
}

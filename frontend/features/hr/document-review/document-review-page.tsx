"use client";

import { useState, useCallback } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";

import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

import { ReviewTable, type EmployeeDocSummary } from "@/features/hr/document-review/review-table";
import { ReviewSheet } from "@/features/hr/document-review/review-sheet";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";

const docsSummaryContract = lazyContract(() =>
  import("@/features/hr/document-review/document-review-schema").then((m) => m.onboardingDocsSummaryContract),
);

const PAGE_SIZE = 20;

interface DocReviewSummaryResponse {
  data: EmployeeDocSummary[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

function useDocReviewSummary(cursor: string | undefined, search: string, status: string) {
  const params: Record<string, unknown> = { cursor, limit: PAGE_SIZE };
  if (search.trim()) params.search = search.trim();
  if (status !== "ALL") params.status = status;
  const canReviewDocs = useCan("hr:onboarding:manage");
  return useQuery<DocReviewSummaryResponse>({
    queryKey: humanResourcesQueryKeys.hr.onboardingDocsSummary(params),
    queryFn: ({ signal }) => apiClient.get("/hr/onboarding-docs/summary", params, signal, docsSummaryContract),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled: canReviewDocs,
  });
}

export function DocumentReviewPage() {
  // PATCH /hr/onboarding-docs/:docId is `hr:onboarding:manage`
  // (hr-onboarding-docs-admin.controller.ts:121); hr:employees:manage was the
  // wrong key, so reviewers without it saw no Approve / Re-upload.
  const canReview = useCan("hr:onboarding:manage");

  const [reviewUserId, setReviewUserId] = useState<string | null>(null);
  const [reviewUserName, setReviewUserName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const page = cursorHistory.length;
  const cursor = cursorHistory.at(-1);

  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const { data, isLoading, isFetching, isError, error, refetch } = useDocReviewSummary(
    cursor,
    debouncedSearch,
    statusFilter,
  );

  const list = data?.data ?? [];
  // The summary read is disabled without hr:onboarding:manage while the route
  // only requires hr:documents:view, so a documents viewer used to see an
  // empty table instead of a denial (FE-47).
  const pageState = usePageState({ permission: "hr:onboarding:manage", isLoading, isError, error });

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCursorHistory([undefined]);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setCursorHistory([undefined]);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) =>
      history.length > 1 ? history.slice(0, -1) : history,
    );
  }, []);

  const handleNextPage = useCallback(() => {
    const nextCursor = data?.pagination.nextCursor;
    if (nextCursor) {
      setCursorHistory((history) => [...history, nextCursor]);
    }
  }, [data?.pagination.nextCursor]);

  const handleOpenReview = useCallback((emp: EmployeeDocSummary) => {
    setReviewUserId(emp.userId);
    setReviewUserName(emp.userName);
  }, []);

  const handleCloseReview = useCallback(() => {
    setReviewUserId(null);
    setReviewUserName(null);
  }, []);

  if (pageState.kind !== "ready" && pageState.kind !== "empty") {
    return (
      <PageWrapper title="Document Review" subtitle="Review employee onboarding documents">
        <PageState
          resolution={pageState}
          onRetry={handleRetry}
          className="flex-1"
          loading={<Skeleton className="flex-1 rounded-lg" />}
        >
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Document Review"
      subtitle="Review employee onboarding documents"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <SearchInput placeholder="Search employees..." value={searchQuery} onValueChange={handleSearchChange} />
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className={cn("w-36", FILTER_SELECT_TRIGGER)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        <ReviewTable
          list={list}
          canReview={canReview}
          onOpenReview={handleOpenReview}
        />
        {data && (page > 1 || data.pagination.hasMore) ? (
          <CursorPageControls
            page={page}
            hasNext={data.pagination.hasMore}
            disabled={isFetching}
            onPrevious={handlePreviousPage}
            onNext={handleNextPage}
            className="mt-3"
          />
        ) : null}
      </div>

      <ReviewSheet
        userId={reviewUserId}
        userName={reviewUserName}
        canReview={canReview}
        onClose={handleCloseReview}
      />
    </PageWrapper>
  );
}

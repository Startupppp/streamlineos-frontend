"use client";

import { useState, useCallback } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/error-state";

import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

import { ReviewTable, type EmployeeDocSummary } from "@/features/hr/document-review/review-table";
import { ReviewSheet } from "@/features/hr/document-review/review-sheet";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

const PAGE_SIZE = 20;

interface DocReviewSummaryResponse {
  data: EmployeeDocSummary[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function useDocReviewSummary(page: number, search: string, status: string) {
  const params: Record<string, unknown> = { page, limit: PAGE_SIZE };
  if (search.trim()) params.search = search.trim();
  if (status !== "ALL") params.status = status;
  return useQuery<DocReviewSummaryResponse>({
    queryKey: queryKeys.hr.onboardingDocsSummary(params),
    queryFn: () => apiClient.get<DocReviewSummaryResponse>("/hr/onboarding-docs/summary", params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export default function DocumentReviewPage() {
  const canReview = useCan("hr:employees:manage");

  const [reviewUserId, setReviewUserId] = useState<string | null>(null);
  const [reviewUserName, setReviewUserName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const { data, isLoading, isError, refetch } = useDocReviewSummary(page, debouncedSearch, statusFilter);

  const list = data?.data ?? [];
  const total = data?.pagination.total ?? 0;

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handleOpenReview = useCallback((emp: EmployeeDocSummary) => {
    setReviewUserId(emp.userId);
    setReviewUserName(emp.userName);
  }, []);

  const handleCloseReview = useCallback(() => {
    setReviewUserId(null);
    setReviewUserName(null);
  }, []);

  if (isError) {
    return (
      <PageWrapper title="Document Review" subtitle="Review employee onboarding documents" variant="display">
        <ErrorState title="Failed to load document review data" onRetry={handleRetry} />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="Document Review" subtitle="Review employee onboarding documents" variant="display">
        <Skeleton className="flex-1 rounded-lg" />
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
            <SelectTrigger className={cn("w-[140px]", FILTER_SELECT_TRIGGER)}>
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
          pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
        />
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

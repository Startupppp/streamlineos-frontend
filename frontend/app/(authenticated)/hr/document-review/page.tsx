"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/error-state";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ReviewTable, type EmployeeDocSummary } from "@/features/hr/document-review/review-table";
import { ReviewSheet } from "@/features/hr/document-review/review-sheet";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

function useDocReviewSummary() {
  return useQuery<EmployeeDocSummary[]>({
    queryKey: queryKeys.hr.onboardingDocsSummary(),
    queryFn: () => apiClient.get<EmployeeDocSummary[]>("/hr/onboarding-docs/summary"),
  });
}

export default function DocumentReviewPage() {
  const canReview = useCan("hr:employees:manage");
  const { data: summary, isLoading, isError, refetch } = useDocReviewSummary();

  const [reviewUserId, setReviewUserId] = useState<string | null>(null);
  const [reviewUserName, setReviewUserName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredList = useMemo(() => {
    let list = summary ?? [];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (e) =>
          (e.userName ?? "").toLowerCase().includes(q) ||
          (e.designation ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "ALL") {
      list = list.filter((e) => (e.onboardingDocStatus ?? "PENDING") === statusFilter);
    }
    return list;
  }, [summary, searchQuery, statusFilter]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
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
      <PageWrapper title="Document Review" subtitle="Review employee onboarding documents">
        <ErrorState title="Failed to load document review data" onRetry={handleRetry} />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="Document Review" subtitle="Review employee onboarding documents">
        <Skeleton className="flex-1 rounded-lg" />
      </PageWrapper>
    );
  }

  const list = summary ?? [];

  return (
    <PageWrapper
      title="Document Review"
      subtitle="Review employee onboarding documents"
      badge={`${list.length} employees`}
      filters={
        <div className="flex items-center gap-2 flex-wrap">
          <div className="min-w-0 w-[200px]">
          <SearchInput placeholder="Search employees..." value={searchQuery} onValueChange={handleSearchChange} />
        </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
        <ReviewTable list={filteredList} canReview={canReview} onOpenReview={handleOpenReview} />
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

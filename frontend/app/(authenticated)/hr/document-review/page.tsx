"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, AlertCircle } from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ReviewTable, type EmployeeDocSummary } from "@/features/hr/document-review/review-table";
import { ReviewSheet } from "@/features/hr/document-review/review-sheet";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAbility } from "@/lib/abilities-context";

function useDocReviewSummary() {
  return useQuery<EmployeeDocSummary[]>({
    queryKey: queryKeys.hr.onboardingDocsSummary(),
    queryFn: () => apiClient.get<EmployeeDocSummary[]>("/hr/onboarding-docs/summary"),
  });
}

export default function DocumentReviewPage() {
  const ability = useAbility();
  const canReview = ability.can("manage", "hr:onboarding");
  const { data: summary, isLoading } = useDocReviewSummary();

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

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleOpenReview = useCallback((emp: EmployeeDocSummary) => {
    setReviewUserId(emp.userId);
    setReviewUserName(emp.userName);
  }, []);

  const handleCloseReview = useCallback(() => {
    setReviewUserId(null);
    setReviewUserName(null);
  }, []);

  if (isLoading) {
    return (
      <PageWrapper title="Document Review" subtitle="Review employee onboarding documents">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
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
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-8 h-8 w-[200px] text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
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
      <ReviewTable list={filteredList} canReview={canReview} onOpenReview={handleOpenReview} />

      <ReviewSheet
        userId={reviewUserId}
        userName={reviewUserName}
        canReview={canReview}
        onClose={handleCloseReview}
      />
    </PageWrapper>
  );
}

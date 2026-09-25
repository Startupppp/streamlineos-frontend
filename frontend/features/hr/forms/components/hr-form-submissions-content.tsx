"use client";

import { useCallback } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { useHrForm } from "@/features/hr/forms/hooks/use-hr-forms";
import { useHrFormSubmissions } from "@/features/hr/forms/hooks/use-hr-form-submissions";
import { SubmissionsDataTable } from "@/features/hr/forms/components/submissions-data-table";
import { useCursorPager } from "@/components/ui/table-pagination";
import { useCan } from "@/hooks/api/access";

interface HrFormSubmissionsContentProps {
  formId: number;
}

export function HrFormSubmissionsContent({ formId }: HrFormSubmissionsContentProps) {
  const pager = useCursorPager();
  const canManage = useCan("hr:forms:manage");
  const { data: form, isLoading: formLoading } = useHrForm(formId);
  const {
    data: subs,
    isLoading: subsLoading,
    isError,
    error,
    refetch,
  } = useHrFormSubmissions(formId, { cursor: pager.cursor, limit: 20 });
  const isLoading = formLoading || subsLoading;

  const nextCursor = subs?.pagination.nextCursor;
  const handleNextPage = useCallback(() => {
    pager.goNext(nextCursor);
  }, [pager, nextCursor]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageWrapper
      title={form ? `${form.name} — Submissions` : "Submissions"}
      subtitle={subs ? `${subs.total} total submissions` : undefined}
      backHref={`/hr/settings/forms/${formId}`}
    >
      {isLoading ? (
        <div className="flex flex-1 min-h-0 flex-col gap-2 pt-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load submissions"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
        <div className="flex flex-1 min-h-0 flex-col pt-2">
          <SubmissionsDataTable
            formId={formId}
            submissions={subs?.data ?? []}
            canManage={canManage}
            pagination={{
              mode: "cursor",
              pageSize: 20,
              hasMore: subs?.pagination.hasMore ?? false,
              hasPrevious: pager.hasPrevious,
              onNext: handleNextPage,
              onPrevious: pager.goPrevious,
            }}
          />
        </div>
      )}
    </PageWrapper>
  );
}

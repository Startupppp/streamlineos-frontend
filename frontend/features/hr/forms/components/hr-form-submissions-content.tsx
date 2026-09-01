"use client";

import { useCallback, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { useHrForm } from "@/features/hr/forms/hooks/use-hr-forms";
import { useHrFormSubmissions } from "@/features/hr/forms/hooks/use-hr-form-submissions";
import { SubmissionsDataTable } from "@/features/hr/forms/components/submissions-data-table";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";

interface HrFormSubmissionsContentProps {
  formId: number;
}

export function HrFormSubmissionsContent({ formId }: HrFormSubmissionsContentProps) {
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const page = cursorHistory.length;
  const cursor = cursorHistory.at(-1);
  const { data: form, isLoading: formLoading } = useHrForm(formId);
  const { data: subs, isLoading: subsLoading, isFetching } = useHrFormSubmissions(
    formId,
    { cursor, limit: 20 },
  );
  const isLoading = formLoading || subsLoading;

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) => history.length > 1 ? history.slice(0, -1) : history);
  }, []);

  const handleNextPage = useCallback(() => {
    const nextCursor = subs?.pagination.nextCursor;
    if (nextCursor) setCursorHistory((history) => [...history, nextCursor]);
  }, [subs?.pagination.nextCursor]);

  return (
    <PageWrapper
      title={form ? `${form.name} — Submissions` : "Submissions"}
      subtitle={`${subs?.total ?? 0} total submissions`}
      backHref={`/hr/settings/forms/${formId}`}
    >
      {isLoading ? (
        <div className="flex flex-1 min-h-0 flex-col gap-2 pt-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col pt-2">
          <SubmissionsDataTable
            formId={formId}
            submissions={subs?.data ?? []}
            canManage
          />
          {subs && (page > 1 || subs.pagination.hasMore) ? (
            <CursorPageControls
              page={page}
              hasNext={subs.pagination.hasMore}
              disabled={isFetching}
              onPrevious={handlePreviousPage}
              onNext={handleNextPage}
              className="mt-3"
            />
          ) : null}
        </div>
      )}
    </PageWrapper>
  );
}

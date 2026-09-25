"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { useKbExportJobs } from "@/hooks/api/kb";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  KbDownloadIcon,
  KbFileTextIcon,
} from "@/features/wiki/lib/kb-icons";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import type { KbExportJob } from "@/hooks/api/kb/import-export";

function JobRow({ job }: { job: KbExportJob }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card text-sm">
      <KbFileTextIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <TruncatedText text={`${job.format} export`} className="flex-1 capitalize" />
      <span className="text-xs text-muted-foreground shrink-0 capitalize">
        {job.status}
      </span>
      <span className="text-xs text-muted-foreground shrink-0">
        {kbTimeAgo(job.createdAt)}
      </span>
    </div>
  );
}

export function ExportJobsCard() {
  const {
    data: jobs = [],
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useKbExportJobs();

  function handleRetry() {
    void refetch();
  }

  function handleLoadMore() {
    void fetchNextPage();
  }

  return (
    <>
      {isLoading && (
        <div className="space-y-1.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <ErrorState
          compact
          title="Couldn't load export history"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      )}

      {!isLoading && !isError && jobs.length === 0 && (
        <EmptyState
          compact
          illustration={
            <KbDownloadIcon className="h-5 w-5 text-muted-foreground" />
          }
          title="No exports yet"
          description="Use the ⋯ menu on a page to export it as Markdown or HTML."
        />
      )}

      {!isLoading && !isError && jobs.length > 0 && (
        <div className="space-y-1.5">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
          {hasNextPage ? (
            <LoadingButton
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              isPending={isFetchingNextPage}
              loadingText="Loading…"
              onClick={handleLoadMore}
            >
              Load more
            </LoadingButton>
          ) : null}
        </div>
      )}
    </>
  );
}

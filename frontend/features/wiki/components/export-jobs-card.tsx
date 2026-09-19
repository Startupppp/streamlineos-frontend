"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TablePagination } from "@/components/ui/table-pagination";
import { useKbExportJobs } from "@/hooks/api/kb";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  KbDownloadIcon,
  KbFileTextIcon,
} from "@/features/wiki/lib/kb-icons";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import type { KbExportJob } from "@/hooks/api/kb/import-export";

const PAGE_SIZE = 10;

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
  const [page, setPage] = useState(1);
  const {
    data: jobs = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useKbExportJobs();

  const total = jobs.length;
  const pageJobs = jobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleRetry() {
    void refetch();
  }

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
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
          {pageJobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
          {total > PAGE_SIZE ? (
            <TablePagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={handlePageChange}
              className="px-1"
            />
          ) : null}
        </div>
      )}
    </>
  );
}

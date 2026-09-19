"use client";

import { useState } from "react";
import Link from "next/link";
import { PageSection } from "@/components/ui/page-wrapper";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TablePagination } from "@/components/ui/table-pagination";
import { getErrorMessage } from "@/lib/get-error-message";
import { KNOWLEDGE_BASE } from "@/lib/knowledge-routes";
import { useKbImportJobs } from "@/hooks/api/kb";
import { KbFileTextIcon } from "@/features/wiki/lib/kb-icons";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import { importJobDisplayName } from "@/features/wiki/lib/import-job-label";
import type { KbImportJob } from "@/hooks/api/kb/import-export";

const PAGE_SIZE = 10;

function ImportJobRow({ job }: { job: KbImportJob }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card text-sm">
      <KbFileTextIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <TruncatedText text={importJobDisplayName(job)} className="flex-1 font-medium" />
      <span className="text-xs text-muted-foreground">
        {job.succeededItems}/{job.totalItems} pages
      </span>
      <Badge
        variant={
          job.status === "completed"
            ? "secondary"
            : job.status === "failed"
              ? "destructive"
              : "outline"
        }
        className="text-micro h-4 px-1.5"
      >
        {job.status}
      </Badge>
      <span className="text-xs text-muted-foreground shrink-0">
        {kbTimeAgo(job.createdAt)}
      </span>
    </div>
  );
}

export function ImportHistorySection() {
  const [page, setPage] = useState(1);
  const {
    data: jobs = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useKbImportJobs();

  const total = jobs.length;
  const pageJobs = jobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleRetry() {
    void refetch();
  }

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
  }

  return (
    <PageSection title="Recent imports">
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
          title="Couldn't load import history"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      )}

      {!isLoading && !isError && jobs.length === 0 && (
        <EmptyState
          compact
          illustration={
            <KbFileTextIcon className="h-5 w-5 text-muted-foreground" />
          }
          title="No imports yet"
          description="Import history will appear here after your first import. Use Choose files or Paste text to add pages."
        />
      )}

      {!isLoading && !isError && jobs.length > 0 && (
        <div className="space-y-1.5">
          {pageJobs.map((job) => (
            <ImportJobRow key={job.id} job={job} />
          ))}
          <p className="text-xs text-muted-foreground pt-1">
            Imported pages appear in the{" "}
            <Link href={KNOWLEDGE_BASE} className="underline underline-offset-2">
              wiki
            </Link>
            .
          </p>
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
    </PageSection>
  );
}

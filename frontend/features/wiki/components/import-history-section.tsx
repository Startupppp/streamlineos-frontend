"use client";

import Link from "next/link";
import { toast } from "sonner";
import { PageSection } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-envelope";
import { KNOWLEDGE_BASE } from "@/lib/knowledge-routes";
import { useKbImportJobs, useRetryImportJob } from "@/hooks/api/kb/import-export";
import { usePermissionGate } from "@/hooks/api/access";
import { KbFileTextIcon } from "@/features/wiki/lib/kb-icons";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import { importJobDisplayName } from "@/features/wiki/lib/import-job-label";
import type { KbImportJob } from "@/hooks/api/kb/import-export";
import { failedItemsFromReport, ImportFailedItemsList } from "./import-failed-titles-alert";

interface ImportJobRowProps {
  job: KbImportJob;
  retryDisabled: boolean;
  retryPending: boolean;
  onRetry: (jobId: number) => void;
}

function ImportJobRow({ job, retryDisabled, retryPending, onRetry }: ImportJobRowProps) {
  const failedItems = failedItemsFromReport(job.errorReport);

  function handleRetry() {
    onRetry(job.id);
  }

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
      <div className="flex items-center gap-3">
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
      {job.errorReport?.code === "PROGRESS_RECONCILIATION_REQUIRED" ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {job.errorReport.reason ?? "Import progress needs manual reconciliation. Contact support before retrying."}
        </p>
      ) : null}
      {failedItems.length > 0 ? (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-destructive">
            {failedItems.length} failed page{failedItems.length === 1 ? "" : "s"}
          </summary>
          <div className="mt-2 pl-5">
            <ImportFailedItemsList items={failedItems} />
          </div>
        </details>
      ) : null}
      {job.canRetry ? (
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleRetry}
            disabled={retryDisabled}
          >
            {retryPending ? "Retrying…" : "Retry failed pages"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function ImportHistorySection() {
  const importGate = usePermissionGate("kb:pages:import");
  const retryMutation = useRetryImportJob();
  const {
    data: jobs = [],
    isLoading,
    isError,
    isFetchNextPageError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useKbImportJobs();
  const accessLost = importGate.denied || (isError && isApiError(error) && (error.status === 401 || error.status === 403 || error.status === 404));
  const accessReady = importGate.allowed && !accessLost;

  function handleRetryLoad() {
    if (isFetchNextPageError) {
      void fetchNextPage();
      return;
    }
    void refetch();
  }

  function handleRetryImport(jobId: number) {
    if (!accessReady) return;
    retryMutation.mutate(jobId, {
      onSuccess: () => {
        toast.success("Retry queued for failed pages");
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        void refetch();
      },
    });
  }

  function handleLoadMore() {
    void fetchNextPage();
  }

  return (
    <PageSection title="Recent imports">
      {accessLost && <NoPermissionState permission="kb:pages:import" compact />}
      {!accessLost && importGate.unavailable && (
        <ErrorState compact title="Couldn't check import access" description="Refresh the page and try again." />
      )}
      {!accessLost && (importGate.pending || (importGate.allowed && isLoading)) && (
        <div className="space-y-1.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      )}

      {accessReady && !isLoading && isError && jobs.length === 0 && (
        <ErrorState
          compact
          title="Couldn't load import history"
          description={getErrorMessage(error)}
          error={error}
          onRetry={handleRetryLoad}
        />
      )}

      {accessReady && !isLoading && !isError && jobs.length === 0 && (
        <EmptyState
          compact
          access={importGate}
          illustration={
            <KbFileTextIcon className="h-5 w-5 text-muted-foreground" />
          }
          title="No imports yet"
          description="Import history will appear here after your first import. Use Choose files or Paste text to add pages."
        />
      )}

      {accessReady && !isLoading && jobs.length > 0 && (
        <div className="space-y-1.5">
          {jobs.map((job) => (
            <ImportJobRow
              key={job.id}
              job={job}
              retryDisabled={retryMutation.isPending}
              retryPending={retryMutation.isPending && retryMutation.variables === job.id}
              onRetry={handleRetryImport}
            />
          ))}
          <p className="text-xs text-muted-foreground pt-1">
            Imported pages appear in the{" "}
            <Link href={KNOWLEDGE_BASE} className="underline underline-offset-2">
              wiki
            </Link>
            .
          </p>
          {isError ? (
            <ErrorState
              compact
              title={isFetchNextPageError ? "Couldn't load more import jobs" : "Couldn't refresh import history"}
              description={getErrorMessage(error)}
              error={error}
              onRetry={handleRetryLoad}
            />
          ) : (
            <InfiniteScrollSentinel
              hasNextPage={hasNextPage ?? false}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={handleLoadMore}
              label="Load more import jobs"
            />
          )}
        </div>
      )}
    </PageSection>
  );
}

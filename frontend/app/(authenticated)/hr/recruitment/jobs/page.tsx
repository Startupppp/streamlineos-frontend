"use client";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState } from "@/components/shared/error-state";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useUpdateJobPosting, useDeleteJobPosting, useHrDepartments } from "@/hooks/api/hr";
import {
  useJobPostingsPage,
  usePublishJobToBoards,
  useDuplicateJobPosting,
} from "@/hooks/api/hr/recruitment";
import type { JobBoardPlatform } from "@/hooks/api/hr/recruitment";
import type { JobPostingStatus } from "@/types/hr";
import { TablePagination } from "@/components/ui/table-pagination";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { ExternalBoardsSheet } from "@/features/hr/recruitment/jobs/external-boards-sheet";
import { ShareJobDialog } from "@/features/hr/recruitment/jobs/share-job-dialog";
import { JobCard, JobCardSkeleton } from "@/features/hr/recruitment/jobs/job-card";
import { STATUS_OPTIONS } from "@/features/hr/recruitment/jobs/job-posting-constants";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { CONTENT_FILL_PANEL, FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";

export default function JobPostingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") as JobPostingStatus | null;
  const visibilityFilter = searchParams.get("visibility");
  const pageFromUrl = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSizeFromUrl = Math.min(
    100,
    Math.max(6, Number(searchParams.get("pageSize") ?? "12") || 12),
  );

  const { data: jobsPage, isLoading, isError, refetch } = useJobPostingsPage({
    ...(statusFilter ? { status: statusFilter } : {}),
    page: pageFromUrl,
    pageSize: pageSizeFromUrl,
  });

  const jobs = (jobsPage?.items ?? []).filter((job) => {
    if (visibilityFilter === "internal") return job.isInternal === true;
    if (visibilityFilter === "external") return !job.isInternal;
    return true;
  });

  const updateJob = useUpdateJobPosting();
  const deleteJob = useDeleteJobPosting();
  const duplicateJob = useDuplicateJobPosting();
  const publishToBoards = usePublishJobToBoards();
  const { data: departments } = useHrDepartments();

  const [shareJobId, setShareJobId] = useState<number | null>(null);
  const [boardsJobId, setBoardsJobId] = useState<number | null>(null);
  const [deleteJobId, setDeleteJobId] = useState<number | null>(null);

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "ALL") params.set(key, value);
      else params.delete(key);
      if (key !== "page" && key !== "pageSize") params.delete("page");
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const setPagination = useCallback(
    (next: { page?: number; pageSize?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.pageSize != null) params.set("pageSize", String(next.pageSize));
      if (next.page != null) {
        if (next.page <= 1) params.delete("page");
        else params.set("page", String(next.page));
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleStatusChange = useCallback(
    (id: number, status: JobPostingStatus) => {
      updateJob.mutate({ id, status }, {
        onSuccess: () => toast.success("Status updated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [updateJob],
  );

  const handleDelete = useCallback(() => {
    if (!deleteJobId) return;
    deleteJob.mutate(deleteJobId, {
      onSuccess: () => {
        toast.success("Job posting deleted");
        setDeleteJobId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteJobId, deleteJob]);

  const handleDuplicate = useCallback(
    (id: number) => {
      duplicateJob.mutate(id, {
        onSuccess: (job) => {
          toast.success("Job duplicated as draft");
          router.push(`/hr/recruitment/jobs/${job.id}/edit`);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [duplicateJob, router],
  );

  const handlePublish = useCallback(
    (id: number) => {
      const platforms: JobBoardPlatform[] = ["LINKEDIN", "NAUKRI", "INDEED"];
      publishToBoards.mutate({ jobId: id, platforms }, {
        onSuccess: (data) => {
          if (data.publishedCount > 0) {
            toast.success(`Posted to ${data.publishedCount} platform${data.publishedCount !== 1 ? "s" : ""}`);
          } else {
            toast.error("No connected platforms available. Configure integrations in Settings.");
          }
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [publishToBoards],
  );

  function handleStatusFilterChange(v: string) { setFilter("status", v); }
  function handleVisibilityFilterChange(v: string) { setFilter("visibility", v); }
  function handleRetry() { void refetch(); }
  function handleCloseShareDialog() { setShareJobId(null); }
  function handleCloseBoardsSheet() { setBoardsJobId(null); }
  function handleConfirmDialogOpenChange(open: boolean) { if (!open) setDeleteJobId(null); }

  const total = jobsPage?.total ?? 0;
  const subtitle =
    isLoading
      ? "Loading positions…"
      : total > 0
        ? `${total.toLocaleString()} position${total === 1 ? "" : "s"}`
        : "Manage open positions";

  return (
    <>
      <PageWrapper
        title="Job Postings"
        subtitle={subtitle}
        actions={
          <Button size="sm" asChild>
            <Link href="/hr/recruitment/jobs/new">
              <Plus className="mr-1.5 h-4 w-4" /> New Job
            </Link>
          </Button>
        }
        filters={
          <div className={FILTER_TOOLBAR_ROW}>
            <Select value={statusFilter ?? "ALL"} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className={cn("w-32", FILTER_SELECT_TRIGGER)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={visibilityFilter ?? "ALL"} onValueChange={handleVisibilityFilterChange}>
              <SelectTrigger className={cn("w-36", FILTER_SELECT_TRIGGER)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                <SelectItem value="ALL">All Postings</SelectItem>
                <SelectItem value="external">External</SelectItem>
                <SelectItem value="internal">Internal Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 12 }).map((_, i) => <JobCardSkeleton key={i} />)}
            </div>
          ) : isError ? (
            <ErrorState className="flex-1" title="Unable to load job postings" onRetry={handleRetry} />
          ) : !jobs?.length ? (
            <RecruitmentEmptyState
              illustration={<EmptyPersonIllustration />}
              title="No job postings yet"
              description="Create your first job posting to start hiring"
              action={{ label: "New Job Posting", href: "/hr/recruitment/jobs/new" }}
              className={CONTENT_FILL_PANEL}
            />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job) => {
                  const deptName = departments?.find((d) => d.id === job.departmentId)?.name;
                  return (
                    <JobCard
                      key={job.id}
                      job={job}
                      deptName={deptName}
                      isPublishPending={publishToBoards.isPending}
                      isDuplicatePending={duplicateJob.isPending}
                      onStatusChange={handleStatusChange}
                      onPublish={handlePublish}
                      onShare={setShareJobId}
                      onTrackBoards={setBoardsJobId}
                      onDuplicate={handleDuplicate}
                      onDelete={setDeleteJobId}
                    />
                  );
                })}
              </div>
              <TablePagination
                page={jobsPage?.page ?? 1}
                pageSize={jobsPage?.pageSize ?? pageSizeFromUrl}
                total={jobsPage?.total ?? 0}
                onPageChange={(p) => setPagination({ page: p })}
              />
            </>
          )}
        </div>
      </PageWrapper>

      {shareJobId !== null && (
        <ShareJobDialog jobId={shareJobId} onClose={handleCloseShareDialog} />
      )}
      {boardsJobId !== null && (
        <ExternalBoardsSheet jobId={boardsJobId} onClose={handleCloseBoardsSheet} />
      )}
      <ConfirmSheet
        open={deleteJobId !== null}
        onOpenChange={handleConfirmDialogOpenChange}
        title="Delete job posting?"
        description="This will permanently delete this job posting and all related data. This cannot be undone."
        confirmLabel="Delete Job Posting"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}

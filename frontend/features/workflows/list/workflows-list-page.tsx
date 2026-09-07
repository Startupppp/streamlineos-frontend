"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import {
  useWorkflows,
  useDeleteWorkflow,
  useDuplicateWorkflow,
  useWorkflowAnalytics,
  type Workflow,
  type WorkflowStatus,
} from "@/hooks/api/workflows";
import { CreateWorkflowDialog } from "@/features/workflows/components/create-workflow-dialog";
import { WorkflowAnalyticsStats } from "@/features/workflows/list/workflow-analytics-stats";
import { WorkflowCardGrid } from "@/features/workflows/list/workflow-card-grid";
import { DeleteWorkflowDialog } from "@/features/workflows/list/delete-workflow-dialog";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { useCursorPageStack } from "@/hooks/common/use-cursor-page-stack";

const STATUS_FILTERS = [
  "all",
  "draft",
  "published",
  "disabled",
  "archived",
] as const satisfies readonly (WorkflowStatus | "all")[];
type StatusFilter = (typeof STATUS_FILTERS)[number];

const WORKFLOW_PAGE_SIZE = 24;

export function WorkflowsListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);
  const pagination = useCursorPageStack();

  const debouncedSearch = useDebouncedValue(search, 300);

  const filterKey = `${debouncedSearch}|${statusFilter}`;

  const resetToFirstPage = pagination.resetToFirstPage;

  useEffect(() => {
    resetToFirstPage();
  }, [filterKey, resetToFirstPage]);

  const { data, isLoading, isError, refetch } = useWorkflows({
    search: debouncedSearch.trim() || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: WORKFLOW_PAGE_SIZE,
    cursor: pagination.cursor,
  });

  const { data: analytics, isLoading: analyticsLoading } =
    useWorkflowAnalytics();

  const remove = useDeleteWorkflow();
  const duplicate = useDuplicateWorkflow();

  const workflows = data?.data ?? [];
  const hasFilters = search.length > 0 || statusFilter !== "all";
  const hasMore = data?.pagination?.hasMore ?? false;

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  function handleCloseCreate() {
    setCreateOpen(false);
  }

  function handleSetDeleteTarget(workflow: Workflow) {
    setDeleteTarget(workflow);
  }

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Workflow deleted");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete workflow"),
    });
  }

  function handleDuplicate(workflow: Workflow) {
    duplicate.mutate(workflow.id, {
      onSuccess: (data) => {
        toast.success("Workflow duplicated");
        router.push(`/workflows/${data.id}/builder`);
      },
      onError: () => toast.error("Failed to duplicate workflow"),
    });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function handleStatusChange(value: string) {
    const next = STATUS_FILTERS.find((candidate) => candidate === value);
    if (next) setStatusFilter(next);
  }

  function handleNextPage() {
    pagination.goToNextPage(data?.pagination.nextCursor);
  }

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper
      title="Workflows"
      subtitle="Build, automate, and monitor your business processes"
      actions={
        <AnimatedIconButton
          icon={PlusIcon}
          iconSize={16}
          iconClassName="mr-1"
          size="sm"
          onClick={handleOpenCreate}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all duration-200"
        >
          New Workflow
        </AnimatedIconButton>
      }
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <SearchInput placeholder="Search workflows…" value={search} onValueChange={handleSearchChange} />
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className={`w-[140px] ${FILTER_SELECT_TRIGGER}`}>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-5">
        <WorkflowAnalyticsStats
          analytics={analytics}
          isLoading={analyticsLoading}
        />

        {isLoading ? (
          <LoadingState variant="cards" rows={9} />
        ) : isError ? (
          <ErrorState
            title="Couldn't load workflows"
            description="Something went wrong while fetching your workflows."
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : workflows.length === 0 ? (
          <EmptyState
            illustration={<EmptyProjectsIllustration />}
            title={
              hasFilters
                ? "No workflows match your filters"
                : "No workflows yet"
            }
            description={
              hasFilters
                ? "Try adjusting your search or status filter."
                : "Create your first workflow to start automating your business processes."
            }
            action={
              hasFilters
                ? undefined
                : { label: "New Workflow", onClick: handleOpenCreate }
            }
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <>
            <WorkflowCardGrid
              workflows={workflows}
              onDuplicate={handleDuplicate}
              onDelete={handleSetDeleteTarget}
            />
            {(pagination.hasPrevious || hasMore) ? (
              <CursorPageControls
                page={pagination.page}
                hasNext={hasMore}
                onPrevious={pagination.goToPreviousPage}
                onNext={handleNextPage}
              />
            ) : null}
          </>
        )}
      </div>

      <CreateWorkflowDialog open={createOpen} onClose={handleCloseCreate} />

      <DeleteWorkflowDialog
        target={deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}

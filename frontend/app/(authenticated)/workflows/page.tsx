"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  GitBranch,
  Activity,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { WorkflowCardItem } from "@/features/workflows/components/workflow-card";
import { CreateWorkflowDialog } from "@/features/workflows/components/create-workflow-dialog";

type StatusFilter = WorkflowStatus | "all";

export default function WorkflowsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, isError, refetch } = useWorkflows({
    search: debouncedSearch.trim() || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 50,
  });

  const { data: analytics, isLoading: analyticsLoading } =
    useWorkflowAnalytics();

  const remove = useDeleteWorkflow();
  const duplicate = useDuplicateWorkflow();

  const workflows = data?.data ?? [];
  const hasFilters = search.length > 0 || statusFilter !== "all";

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
    setStatusFilter(value as StatusFilter);
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
        <StatCardGrid cols={4}>
          <StatCard
            label="Total Workflows"
            value={analytics?.totalWorkflows ?? 0}
            icon={GitBranch}
            tone="violet"
            isLoading={analyticsLoading}
          />
          <StatCard
            label="Active Workflows"
            value={analytics?.activeWorkflows ?? 0}
            icon={CheckCircle2}
            tone="emerald"
            isLoading={analyticsLoading}
          />
          <StatCard
            label="Total Executions"
            value={analytics?.totalExecutions ?? 0}
            icon={Activity}
            tone="blue"
            isLoading={analyticsLoading}
          />
          <StatCard
            label="Pending Approvals"
            value={analytics?.pendingApprovals ?? 0}
            icon={Clock}
            tone="amber"
            isLoading={analyticsLoading}
          />
        </StatCardGrid>

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
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((workflow, idx) => (
                <motion.div
                  key={workflow.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
                  whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
                  transition={{
                    duration: 0.22,
                    ease: "easeOut",
                    delay: idx * 0.04,
                  }}
                >
                  <WorkflowCardItem
                    workflow={workflow}
                    onDuplicate={handleDuplicate}
                    onDelete={handleSetDeleteTarget}
                  />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      <CreateWorkflowDialog open={createOpen} onClose={handleCloseCreate} />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; and all its execution history
              will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}

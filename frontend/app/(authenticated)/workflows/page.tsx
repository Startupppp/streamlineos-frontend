"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Copy,
  Trash2,
  Pencil,
  GitBranch,
  Activity,
  CheckCircle2,
  Clock,
} from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import {
  useWorkflows,
  useCreateWorkflow,
  useDeleteWorkflow,
  useDuplicateWorkflow,
  useWorkflowAnalytics,
  type Workflow,
  type WorkflowStatus,
} from "@/hooks/api/workflows";

type StatusFilter = WorkflowStatus | "all";

const STATUS_BADGE_CLASS: Record<WorkflowStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300",
  disabled: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300",
  archived: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
};

const STATUS_LEFT_BORDER: Record<WorkflowStatus, string> = {
  draft: "border-l-border",
  published: "border-l-green-400",
  disabled: "border-l-yellow-400",
  archived: "border-l-red-400",
};

const createWorkflowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type CreateWorkflowValues = z.infer<typeof createWorkflowSchema>;

interface StatCardProps {
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
  loading: boolean;
  index: number;
}

function StatCard({ label, value, icon, loading, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: index * 0.06 }}
    >
      <Card className="bg-card rounded-xl border border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              {icon}
            </div>
          </div>
          <div className="mt-2">
            {loading ? (
              <div className="h-7 w-14 rounded bg-muted animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {value ?? 0}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface WorkflowCardProps {
  workflow: Workflow;
  onDuplicate: () => void;
  onDelete: () => void;
}

function WorkflowCard({ workflow, onDuplicate, onDelete }: WorkflowCardProps) {
  return (
    <Card
      className={cn(
        "bg-card rounded-xl border border-border shadow-sm border-l-4 transition-all duration-200 hover:shadow-md h-full",
        STATUS_LEFT_BORDER[workflow.status]
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm text-foreground truncate">
                {workflow.name}
              </p>
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize",
                  STATUS_BADGE_CLASS[workflow.status]
                )}
              >
                {workflow.status}
              </span>
              <span className="text-[10px] text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded">
                v{workflow.version}
              </span>
            </div>

            {workflow.description && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                {workflow.description}
              </p>
            )}

            <p className="text-[11px] text-muted-foreground mt-2">
              Updated{" "}
              {formatDistanceToNow(new Date(workflow.updatedAt), {
                addSuffix: true,
              })}
            </p>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              title="Edit in Builder"
            >
              <Link href={`/workflows/${workflow.id}/builder`}>
                <Pencil className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              title="Duplicate"
              onClick={onDuplicate}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Delete"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface WorkflowCardItemProps {
  workflow: Workflow;
  onDuplicate: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow) => void;
}

function WorkflowCardItem({
  workflow,
  onDuplicate,
  onDelete,
}: WorkflowCardItemProps) {
  function handleDuplicate() {
    onDuplicate(workflow);
  }

  function handleDelete() {
    onDelete(workflow);
  }

  return (
    <WorkflowCard
      workflow={workflow}
      onDuplicate={handleDuplicate}
      onDelete={handleDelete}
    />
  );
}

interface CreateWorkflowDialogProps {
  open: boolean;
  onClose: () => void;
}

function CreateWorkflowDialog({ open, onClose }: CreateWorkflowDialogProps) {
  const router = useRouter();
  const create = useCreateWorkflow();

  const form = useForm<CreateWorkflowValues>({
    resolver: zodResolver(createWorkflowSchema),
    defaultValues: { name: "", description: "" },
  });

  function handleSubmit(values: CreateWorkflowValues) {
    create.mutate(
      { name: values.name, description: values.description || undefined },
      {
        onSuccess: (data) => {
          toast.success("Workflow created");
          form.reset();
          onClose();
          router.push(`/workflows/${data.id}/builder`);
        },
        onError: () => toast.error("Failed to create workflow"),
      }
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
      onClose();
    }
  }

  const handleFormSubmit = form.handleSubmit(handleSubmit);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Workflow</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleFormSubmit} className="space-y-4 pt-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Lead Assignment Flow"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What does this workflow do?"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={create.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={create.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all duration-200"
              >
                {create.isPending ? "Creating…" : "Create & Open Builder"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

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

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
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
        <Button
          size="sm"
          onClick={handleOpenCreate}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-1" /> New Workflow
        </Button>
      }
      filters={
        <div className="flex items-center gap-3 w-full flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search workflows…"
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 w-[140px] text-sm">
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
      <div className="flex flex-1 min-h-0 flex-col space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total Workflows"
            value={analytics?.totalWorkflows}
            icon={<GitBranch className="h-4 w-4 text-violet-600 dark:text-violet-400" />}
            loading={analyticsLoading}
            index={0}
          />
          <StatCard
            label="Active Workflows"
            value={analytics?.activeWorkflows}
            icon={<CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
            loading={analyticsLoading}
            index={1}
          />
          <StatCard
            label="Total Executions"
            value={analytics?.totalExecutions}
            icon={<Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
            loading={analyticsLoading}
            index={2}
          />
          <StatCard
            label="Pending Approvals"
            value={analytics?.pendingApprovals}
            icon={<Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
            loading={analyticsLoading}
            index={3}
          />
        </div>

        {isLoading ? (
          <LoadingState variant="cards" rows={6} />
        ) : isError ? (
          <ErrorState
            title="Couldn't load workflows"
            description="Something went wrong while fetching your workflows."
            onRetry={handleRetry}
            className="flex-1"
          />
        ) : workflows.length === 0 ? (
          <div className="flex flex-1 min-h-0">
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
              className="w-full"
            />
          </div>
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

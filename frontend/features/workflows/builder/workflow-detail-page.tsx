"use client";

import { useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Pencil,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  GitBranch,
  Calendar,
  User,
  RefreshCcw,
} from "lucide-react";
import { PlayIcon } from "@animateicons/react/lucide";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger, TABS_CONTENT_PAGE_BODY_CLASS } from "@/components/ui/tabs";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import {
  useWorkflow,
  useWorkflowExecutions,
  useTriggerWorkflow,
  type Workflow,
  type WorkflowExecution,
  type ExecutionStatus,
  type WorkflowStatus,
} from "@/hooks/api/workflows";

const STATUS_CONFIG: Record<WorkflowStatus, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground border-border" },
  published: { label: "Active", cls: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
  disabled: { label: "Disabled", cls: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule" },
  archived: { label: "Archived", cls: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule" },
};

const EXEC_STATUS_CONFIG: Record<ExecutionStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", cls: "bg-muted text-muted-foreground", icon: <Clock className="h-3 w-3" /> },
  running: { label: "Running", cls: "bg-status-info-surface text-status-info-ink", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  waiting: { label: "Waiting", cls: "bg-status-warning-surface text-status-warning-ink", icon: <Clock className="h-3 w-3" /> },
  completed: { label: "Completed", cls: "bg-status-success-surface text-status-success-ink", icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: "Failed", cls: "bg-status-danger-surface text-status-danger-ink", icon: <XCircle className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", cls: "bg-muted text-muted-foreground", icon: <XCircle className="h-3 w-3" /> },
  timed_out: { label: "Timed Out", cls: "bg-status-warning-surface text-status-warning-ink", icon: <AlertCircle className="h-3 w-3" /> },
  dead_lettered: { label: "Dead Lettered", cls: "bg-status-danger-surface text-status-danger-ink", icon: <AlertCircle className="h-3 w-3" /> },
};

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function ExecutionRow({ execution }: { execution: WorkflowExecution }) {
  const cfg = EXEC_STATUS_CONFIG[execution.status];
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors">
      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-dense font-medium", cfg.cls)}>
        {cfg.icon}
        {cfg.label}
      </span>
      <span className="text-xs text-muted-foreground flex-1 min-w-0">
        {execution.triggerType ?? "manual"}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatDuration(execution.durationMs)}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
        {execution.createdAt ? format(new Date(execution.createdAt), "MMM d, HH:mm") : "—"}
      </span>
    </div>
  );
}

interface WorkflowOverviewTabProps {
  workflow: Workflow;
}

function WorkflowOverviewTab({ workflow }: WorkflowOverviewTabProps) {
  const statusCfg = STATUS_CONFIG[workflow.status];
  const fields = [
    { icon: <User className="h-3.5 w-3.5" />, label: "Created by", value: workflow.createdByName ?? workflow.createdByEmail?.split("@")[0] ?? "System" },
    { icon: <Calendar className="h-3.5 w-3.5" />, label: "Created", value: format(new Date(workflow.createdAt), "MMM d, yyyy") },
    { icon: <RefreshCcw className="h-3.5 w-3.5" />, label: "Last updated", value: formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true }) },
    { icon: <GitBranch className="h-3.5 w-3.5" />, label: "Version", value: `v${workflow.version}` },
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-card rounded-xl border border-border shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border", statusCfg.cls)}>
              {statusCfg.label}
            </span>
          </div>
          {workflow.description && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{workflow.description}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.label} className="flex items-center gap-2">
                <span className="text-muted-foreground">{f.icon}</span>
                <div>
                  <p className="text-micro text-muted-foreground leading-none mb-0.5">{f.label}</p>
                  <p className="text-xs font-medium text-foreground">{f.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ExecutionsTabProps {
  workflowId: string;
}

function ExecutionsTab({ workflowId }: ExecutionsTabProps) {
  const { data, isLoading, isError, refetch } = useWorkflowExecutions(workflowId, { limit: 20 });

  function handleRetry() {
    void refetch();
  }

  if (isLoading) return <LoadingState variant="list" rows={12} />;
  if (isError) return <ErrorState title="Failed to load executions" onRetry={handleRetry} className={CONTENT_FILL_PANEL} />;

  const executions = data?.data ?? [];

  if (executions.length === 0) {
    return (
      <EmptyState
        illustration={<EmptyActivityIllustration />}
        title="No executions yet"
        description="This workflow hasn't been triggered yet. Publish it and run it to see executions here."
        className={CONTENT_FILL_PANEL}
      />
    );
  }

  return (
    <div className="space-y-1">
      <div className="grid px-3 py-2 text-micro font-medium text-muted-foreground uppercase tracking-wide border-b border-border/60"
        style={{ gridTemplateColumns: "120px 1fr 60px 100px" }}>
        <span>Status</span>
        <span>Trigger</span>
        <span>Duration</span>
        <span>Time</span>
      </div>
      {executions.map((ex) => (
        <ExecutionRow key={ex.id} execution={ex} />
      ))}
      {data?.pagination.hasMore === true && (
        <div className="pt-3 text-center">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/workflows/executions">View all executions</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

interface WorkflowDetailPageProps {
  workflowId: string;
}

export function WorkflowDetailPage({ workflowId }: WorkflowDetailPageProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: workflow, isLoading, isError, refetch } = useWorkflow(workflowId);
  const trigger = useTriggerWorkflow();

  function handleRetry() {
    void refetch();
  }

  function handleTrigger() {
    trigger.mutate(
      { id: workflowId },
      {
        onSuccess: () => toast.success("Workflow triggered successfully"),
        onError: () => toast.error("Failed to trigger workflow"),
      },
    );
  }

  const statusCfg = workflow ? STATUS_CONFIG[workflow.status] : null;

  return (
    <PageWrapper
      title={workflow?.name ?? "Workflow"}
      badge={
        statusCfg ? (
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-dense font-medium border", statusCfg.cls)}>
            {statusCfg.label}
          </span>
        ) : undefined
      }
      subtitle={
        workflow
          ? `Version ${workflow.version} · Updated ${formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}`
          : undefined
      }
      backHref="/workflows"
      actions={
        workflow ? (
          <div className="flex items-center gap-2">
            <AnimatedIconButton
              icon={PlayIcon}
              iconSize={14}
              iconClassName="mr-1.5"
              variant="outline"
              size="sm"
              onClick={handleTrigger}
              disabled={workflow.status !== "published" || trigger.isPending}
            >
              {trigger.isPending ? "Triggering…" : "Run Now"}
            </AnimatedIconButton>
            <Button
              size="sm"
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all duration-200"
            >
              <Link href={`/workflows/${workflowId}/builder`}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit in Builder
              </Link>
            </Button>
          </div>
        ) : undefined
      }
    >
      {isLoading ? (
        <LoadingState variant="page" />
      ) : isError || !workflow ? (
        <ErrorState
          title="Workflow not found"
          description="This workflow may have been deleted or you don't have access."
          onRetry={handleRetry}
          className={CONTENT_FILL_PANEL}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col gap-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="executions">Executions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className={TABS_CONTENT_PAGE_BODY_CLASS}>
              <WorkflowOverviewTab workflow={workflow} />
            </TabsContent>

            <TabsContent value="executions" className={TABS_CONTENT_PAGE_BODY_CLASS}>
              <ExecutionsTab workflowId={workflowId} />
            </TabsContent>
          </Tabs>
        </motion.div>
      )}
    </PageWrapper>
  );
}

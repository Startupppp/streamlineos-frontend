"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Play,
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
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
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
  published: { label: "Active", cls: "bg-green-50 text-green-700 border-green-200" },
  disabled: { label: "Disabled", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  archived: { label: "Archived", cls: "bg-red-50 text-red-700 border-red-200" },
};

const EXEC_STATUS_CONFIG: Record<ExecutionStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", cls: "bg-muted text-muted-foreground", icon: <Clock className="h-3 w-3" /> },
  running: { label: "Running", cls: "bg-blue-100 text-blue-700", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  waiting: { label: "Waiting", cls: "bg-yellow-100 text-yellow-700", icon: <Clock className="h-3 w-3" /> },
  completed: { label: "Completed", cls: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: "Failed", cls: "bg-red-100 text-red-700", icon: <XCircle className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", cls: "bg-muted text-muted-foreground", icon: <XCircle className="h-3 w-3" /> },
  timed_out: { label: "Timed Out", cls: "bg-orange-100 text-orange-700", icon: <AlertCircle className="h-3 w-3" /> },
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
      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium", cfg.cls)}>
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
    { icon: <User className="h-3.5 w-3.5" />, label: "Created by", value: workflow.createdBy ?? "System" },
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
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{f.label}</p>
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

  if (isLoading) return <LoadingState variant="list" rows={5} />;
  if (isError) return <ErrorState title="Failed to load executions" onRetry={handleRetry} className="py-8" />;

  const executions = data?.data ?? [];

  if (executions.length === 0) {
    return (
      <EmptyState
        illustration={<EmptyActivityIllustration />}
        title="No executions yet"
        description="This workflow hasn't been triggered yet. Publish it and run it to see executions here."
      />
    );
  }

  return (
    <div className="space-y-1">
      <div className="grid px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide border-b border-border/50"
        style={{ gridTemplateColumns: "120px 1fr 60px 100px" }}>
        <span>Status</span>
        <span>Trigger</span>
        <span>Duration</span>
        <span>Time</span>
      </div>
      {executions.map((ex) => (
        <ExecutionRow key={ex.id} execution={ex} />
      ))}
      {(data?.total ?? 0) > 20 && (
        <div className="pt-3 text-center">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/workflows/executions">View all executions</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default function WorkflowDetailPage() {
  const params = useParams<{ workflowId: string }>();
  const router = useRouter();
  const workflowId = params.workflowId;
  const [activeTab, setActiveTab] = useState("overview");

  const { data: workflow, isLoading, isError, refetch } = useWorkflow(workflowId);
  const trigger = useTriggerWorkflow();

  function handleRetry() {
    void refetch();
  }

  function handleBack() {
    router.push("/workflows");
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

  if (isLoading) return <LoadingState variant="page" />;
  if (isError || !workflow) {
    return (
      <ErrorState
        title="Workflow not found"
        description="This workflow may have been deleted or you don't have access."
        onRetry={handleRetry}
        className="flex-1"
      />
    );
  }

  const statusCfg = STATUS_CONFIG[workflow.status];

  return (
    <PageWrapper
      title={workflow.name}
      badge={
        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border", statusCfg.cls)}>
          {statusCfg.label}
        </span>
      }
      subtitle={`Version ${workflow.version} · Updated ${formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTrigger}
            disabled={workflow.status !== "published" || trigger.isPending}
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            {trigger.isPending ? "Triggering…" : "Run Now"}
          </Button>
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
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="h-8">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="executions" className="text-xs">Executions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <WorkflowOverviewTab workflow={workflow} />
          </TabsContent>

          <TabsContent value="executions">
            <ExecutionsTab workflowId={workflowId} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </PageWrapper>
  );
}

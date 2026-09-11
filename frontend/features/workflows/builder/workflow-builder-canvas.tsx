"use client";

import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ReactFlowProvider } from "@xyflow/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-client";
import { usePublishWorkflow, useUpdateWorkflow, useWorkflow, type Workflow } from "@/hooks/api/workflows";
import { WorkflowBuilderCanvasSurface } from "./workflow-builder-canvas-surface";
import { WorkflowBuilderToolbar } from "./workflow-builder-toolbar";
import { isWorkflowNodeType } from "./workflow-node-palette";
import type { WorkflowEdge, WorkflowNode } from "./workflow-builder-types";

const DEFAULT_NODES: WorkflowNode[] = [{
  id: "trigger-1", type: "workflowNode", position: { x: 200, y: 120 },
  data: { label: "Trigger", nodeType: "trigger", configuration: {}, description: "Start your workflow here" },
}];

interface BuilderCanvasProps { workflow: Workflow; workflowId: string; }

function BuilderCanvas({ workflow, workflowId }: BuilderCanvasProps) {
  const router = useRouter();
  const updateWorkflow = useUpdateWorkflow();
  const publishWorkflow = usePublishWorkflow();
  const [definition, setDefinition] = useState(() => ({ nodes: extractDefinitionNodes(workflow), edges: extractDefinitionEdges(workflow) }));
  const [workflowName, setWorkflowName] = useState(workflow.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const handleDefinitionChange = useCallback((nodes: WorkflowNode[], edges: WorkflowEdge[]) => setDefinition({ nodes, edges }), []);

  function handleNameSubmit(event: FormEvent) {
    event.preventDefault();
    const name = workflowName.trim();
    if (!name) return;
    setIsEditingName(false);
    updateWorkflow.mutate({ id: workflowId, name }, { onError: (error) => toast.error(getErrorMessage(error)) });
  }
  function handleNameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { setIsEditingName(false); setWorkflowName(workflow.name); }
  }
  function handleNameChange(event: ChangeEvent<HTMLInputElement>) { setWorkflowName(event.target.value); }
  function handleStartNameEditing() { setIsEditingName(true); }
  function handleSave() {
    updateWorkflow.mutate({ id: workflowId, name: workflowName }, { onSuccess: () => toast.success("Draft saved"), onError: (error) => toast.error(getErrorMessage(error)) });
  }
  function handlePublish() {
    publishWorkflow.mutate(
      // `expectedVersion` is the version this editor loaded. Without it the
      // backend can only serialise two simultaneous publishes; it cannot tell
      // that THIS canvas has been open since before someone else published, so
      // the 409 branch below — the message the user is shown — could never fire.
      { id: workflowId, definitionJson: definition, expectedVersion: workflow.version },
      {
        onSuccess: () => toast.success("Workflow published"),
        onError: (error) => {
          if (isApiError(error) && error.status === 409)
            toast.error("Another user published a newer version — refresh before publishing", { duration: 6000 });
          else
            toast.error(getErrorMessage(error));
        },
      },
    );
  }
  function handleBack() { router.push(`/workflows/${workflowId}`); }

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <div className="flex-1 flex flex-col min-w-0">
        <WorkflowBuilderToolbar isEditingName={isEditingName} isPublishing={publishWorkflow.isPending} isSaving={updateWorkflow.isPending} name={workflowName} status={workflow.status} onBack={handleBack} onNameChange={handleNameChange} onNameKeyDown={handleNameKeyDown} onNameSubmit={handleNameSubmit} onStartNameEditing={handleStartNameEditing} onPublish={handlePublish} onSave={handleSave} />
        <WorkflowBuilderCanvasSurface initialNodes={definition.nodes} initialEdges={definition.edges} onDefinitionChange={handleDefinitionChange} />
      </div>
    </div>
  );
}

export function WorkflowBuilderGate({ workflowId }: { workflowId: string }) {
  const { data: workflow, isLoading, isError, error, refetch } = useWorkflow(workflowId);
  const router = useRouter();
  function handleBackToWorkflows() { router.push("/workflows"); }
  if (isLoading) return <BuilderLoadingState />;
  if (isError) return <BuilderErrorState error={error} onRetry={refetch} onBack={handleBackToWorkflows} />;
  if (!workflow) return <BuilderNotFoundState onBack={handleBackToWorkflows} />;
  return <ReactFlowProvider><BuilderCanvas workflow={workflow} workflowId={workflowId} /></ReactFlowProvider>;
}

function BuilderLoadingState() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-12 shrink-0 bg-card border-b border-border px-3 flex items-center gap-3">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <div className="w-px h-4 bg-border" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-7 w-20 rounded-md" />
          </div>
        </div>
        <div className="flex-1 flex min-h-0">
          <div className="w-56 shrink-0 border-r border-border bg-card p-2 space-y-1.5">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
          <div className="flex-1 bg-muted/30 relative">
            <div className="absolute inset-8 flex items-center justify-center">
              <Skeleton className="w-48 h-16 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BuilderErrorState({ error, onRetry, onBack }: { error: unknown; onRetry: () => void; onBack: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background h-full gap-3 p-6">
      <ErrorState title="Couldn't load workflow" description={getErrorMessage(error)} onRetry={onRetry} className="max-w-sm" />
      <Button variant="outline" size="sm" onClick={onBack}>Back to Workflows</Button>
    </div>
  );
}

function BuilderNotFoundState({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-background h-full">
      <EmptyState
        illustrationPreset="automations"
        title="Workflow not found"
        description="This workflow was deleted, or the link is out of date."
        action={{ label: "Back to Workflows", onClick: onBack }}
      />
    </div>
  );
}

function extractDefinitionNodes(workflow: Workflow): WorkflowNode[] {
  const nodes = workflow.definitionJson?.nodes;
  if (!Array.isArray(nodes)) return DEFAULT_NODES;
  const validNodes = nodes.filter(isWorkflowNode);
  return validNodes.length > 0 ? validNodes : DEFAULT_NODES;
}

function extractDefinitionEdges(workflow: Workflow): WorkflowEdge[] {
  const edges = workflow.definitionJson?.edges;
  return Array.isArray(edges) ? edges.filter(isWorkflowEdge) : [];
}

function isWorkflowNode(value: unknown): value is WorkflowNode {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.type !== "string" ||
    !isRecord(value.position) ||
    !isRecord(value.data)
  ) return false;
  return (
    typeof value.position.x === "number" &&
    typeof value.position.y === "number" &&
    typeof value.data.label === "string" &&
    isWorkflowNodeType(value.data.nodeType) &&
    isRecord(value.data.configuration)
  );
}

function isWorkflowEdge(value: unknown): value is WorkflowEdge {
  return isRecord(value) && typeof value.id === "string" && typeof value.source === "string" && typeof value.target === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

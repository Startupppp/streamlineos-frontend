"use client";

import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ReactFlowProvider } from "@xyflow/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
    updateWorkflow.mutate({ id: workflowId, name }, { onError: () => toast.error("Failed to save name") });
  }
  function handleNameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { setIsEditingName(false); setWorkflowName(workflow.name); }
  }
  function handleNameChange(event: ChangeEvent<HTMLInputElement>) { setWorkflowName(event.target.value); }
  function handleSave() {
    updateWorkflow.mutate({ id: workflowId, name: workflowName }, { onSuccess: () => toast.success("Draft saved"), onError: () => toast.error("Failed to save") });
  }
  function handlePublish() {
    publishWorkflow.mutate({ id: workflowId, definitionJson: definition }, { onSuccess: () => toast.success("Workflow published"), onError: () => toast.error("Failed to publish") });
  }
  function handleBack() { router.push(`/workflows/${workflowId}`); }

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <div className="flex-1 flex flex-col min-w-0">
        <WorkflowBuilderToolbar isEditingName={isEditingName} isPublishing={publishWorkflow.isPending} isSaving={updateWorkflow.isPending} name={workflowName} status={workflow.status} onBack={handleBack} onNameChange={handleNameChange} onNameKeyDown={handleNameKeyDown} onNameSubmit={handleNameSubmit} onStartNameEditing={() => setIsEditingName(true)} onPublish={handlePublish} onSave={handleSave} />
        <WorkflowBuilderCanvasSurface initialNodes={definition.nodes} initialEdges={definition.edges} onDefinitionChange={handleDefinitionChange} />
      </div>
    </div>
  );
}

export function WorkflowBuilderGate({ workflowId }: { workflowId: string }) {
  const { data: workflow, isLoading, isError } = useWorkflow(workflowId);
  const router = useRouter();
  function handleBackToWorkflows() { router.push("/workflows"); }
  if (isLoading) return <BuilderLoadingState />;
  if (isError || !workflow) return <BuilderNotFoundState onBack={handleBackToWorkflows} />;
  return <ReactFlowProvider><BuilderCanvas workflow={workflow} workflowId={workflowId} /></ReactFlowProvider>;
}

function BuilderLoadingState() {
  return <div className="flex-1 flex items-center justify-center bg-background h-full"><div className="flex flex-col items-center gap-3"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /><p className="text-sm text-muted-foreground">Loading workflow builder…</p></div></div>;
}

function BuilderNotFoundState({ onBack }: { onBack: () => void }) {
  return <div className="flex-1 flex items-center justify-center bg-background h-full"><div className="text-center space-y-3"><p className="text-sm font-medium text-foreground">Workflow not found</p><Button variant="outline" size="sm" onClick={onBack}>Back to Workflows</Button></div></div>;
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

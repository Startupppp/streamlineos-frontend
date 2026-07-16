"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Panel,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Zap,
  GitBranch,
  CheckSquare,
  Play,
  Clock,
  RefreshCcw,
  Sparkles,
  Share2,
  Code,
  XCircle,
  ArrowLeft,
  Save,
  Upload,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useWorkflow,
  usePublishWorkflow,
  useUpdateWorkflow,
  type Workflow,
  type NodeType,
  type WorkflowStatus,
} from "@/hooks/api/workflows";

interface WorkflowNodeData {
  label: string;
  nodeType: NodeType;
  configuration: Record<string, unknown>;
  description?: string;
  [key: string]: unknown;
}

type WorkflowNode = Node<WorkflowNodeData>;
type WorkflowEdge = Edge;

const NODE_PALETTE: Array<{
  nodeType: NodeType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  border: string;
  bg: string;
}> = [
  {
    nodeType: "trigger",
    label: "Trigger",
    description: "Start the workflow",
    icon: <Zap className="h-4 w-4" />,
    color: "text-amber-600 dark:text-amber-400",
    border: "border-amber-300 dark:border-amber-500/30",
    bg: "bg-amber-50 dark:bg-amber-500/10",
  },
  {
    nodeType: "condition",
    label: "Condition",
    description: "Branch on a rule",
    icon: <GitBranch className="h-4 w-4" />,
    color: "text-blue-600 dark:text-blue-400",
    border: "border-blue-300 dark:border-blue-500/30",
    bg: "bg-blue-50 dark:bg-blue-500/10",
  },
  {
    nodeType: "approval",
    label: "Approval",
    description: "Wait for human sign-off",
    icon: <CheckSquare className="h-4 w-4" />,
    color: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-300 dark:border-emerald-500/30",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  {
    nodeType: "action",
    label: "Action",
    description: "Execute an operation",
    icon: <Play className="h-4 w-4" />,
    color: "text-violet-600 dark:text-violet-400",
    border: "border-violet-300 dark:border-violet-500/30",
    bg: "bg-violet-50 dark:bg-violet-500/10",
  },
  {
    nodeType: "delay",
    label: "Delay",
    description: "Wait before continuing",
    icon: <Clock className="h-4 w-4" />,
    color: "text-orange-600 dark:text-orange-400",
    border: "border-orange-300 dark:border-orange-500/30",
    bg: "bg-orange-50 dark:bg-orange-500/10",
  },
  {
    nodeType: "loop",
    label: "Loop",
    description: "Repeat a set of steps",
    icon: <RefreshCcw className="h-4 w-4" />,
    color: "text-foreground",
    border: "border-border",
    bg: "bg-muted",
  },
  {
    nodeType: "ai_action",
    label: "AI Action",
    description: "Use AI to process data",
    icon: <Sparkles className="h-4 w-4" />,
    color: "text-purple-600 dark:text-purple-400",
    border: "border-purple-300 dark:border-purple-500/30",
    bg: "bg-purple-50 dark:bg-purple-500/10",
  },
  {
    nodeType: "integration",
    label: "Integration",
    description: "Call external service",
    icon: <Share2 className="h-4 w-4" />,
    color: "text-teal-600 dark:text-teal-400",
    border: "border-teal-300 dark:border-teal-500/30",
    bg: "bg-teal-50 dark:bg-teal-500/10",
  },
  {
    nodeType: "script",
    label: "Script",
    description: "Run custom code",
    icon: <Code className="h-4 w-4" />,
    color: "text-foreground",
    border: "border-input",
    bg: "bg-muted",
  },
  {
    nodeType: "end",
    label: "End",
    description: "Terminate the workflow",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-red-600 dark:text-red-400",
    border: "border-red-300 dark:border-red-500/30",
    bg: "bg-red-50 dark:bg-red-500/10",
  },
];

const NODE_PALETTE_MAP = Object.fromEntries(NODE_PALETTE.map((n) => [n.nodeType, n])) as Record<
  NodeType,
  (typeof NODE_PALETTE)[0]
>;

const STATUS_BADGE: Record<WorkflowStatus, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground border-border" },
  published: { label: "Published", cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30" },
  disabled: { label: "Disabled", cls: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/30" },
  archived: { label: "Archived", cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30" },
};

const DEFAULT_NODES: WorkflowNode[] = [
  {
    id: "trigger-1",
    type: "workflowNode",
    position: { x: 200, y: 120 },
    data: {
      label: "Trigger",
      nodeType: "trigger",
      configuration: {},
      description: "Start your workflow here",
    },
  },
];

const DEFAULT_EDGE_OPTIONS = {
  style: { stroke: "var(--muted-foreground)", strokeWidth: 1.5 },
};

function WorkflowNodeComponent({
  data,
  selected,
}: {
  data: WorkflowNodeData;
  selected: boolean;
}) {
  const palette = NODE_PALETTE_MAP[data.nodeType];
  if (!palette) return null;
  return (
    <div
      className={cn(
        "rounded-xl border-2 bg-card shadow-md min-w-[160px] max-w-[220px] transition-all duration-150",
        selected
          ? "border-violet-500 shadow-violet-200/60 shadow-lg ring-2 ring-violet-200 dark:shadow-violet-500/20 dark:ring-violet-500/30"
          : palette.border,
      )}
    >
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-t-[10px]", palette.bg)}>
        <span className={palette.color}>{palette.icon}</span>
        <span className="text-xs font-semibold text-foreground truncate">{data.label}</span>
      </div>
      {data.description && (
        <div className="px-3 py-1.5 border-t border-border/60">
          <p className="text-[11px] text-muted-foreground leading-snug truncate">{data.description}</p>
        </div>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = { workflowNode: WorkflowNodeComponent };

interface NodeConfigPanelProps {
  node: WorkflowNode;
  onChange: (id: string, data: Partial<WorkflowNodeData>) => void;
  onClose: () => void;
}

function NodeConfigPanel({ node, onChange, onClose }: NodeConfigPanelProps) {
  const palette = NODE_PALETTE_MAP[node.data.nodeType];

  function handleLabelChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(node.id, { label: e.target.value });
  }

  function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(node.id, { description: e.target.value });
  }

  return (
    <div className="w-72 bg-card border-l border-border flex flex-col h-full shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          {palette && <span className={palette.color}>{palette.icon}</span>}
          <p className="text-sm font-semibold">Node Settings</p>
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
          aria-label="Close panel"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <ScrollArea hideScrollbar className="min-h-0 flex-1">
        <div className="overscroll-contain space-y-4 p-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Label</label>
          <Input value={node.data.label} onChange={handleLabelChange} className="text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Description</label>
          <Textarea
            value={node.data.description ?? ""}
            onChange={handleDescriptionChange}
            rows={3}
            className="text-sm resize-none"
            placeholder="What does this node do?"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Node Type</label>
          <p className="text-sm text-muted-foreground capitalize">
            {node.data.nodeType.replace(/_/g, " ")}
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Node ID</label>
          <p className="text-xs font-mono text-muted-foreground break-all">{node.id}</p>
        </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function PaletteItem({ item }: { item: (typeof NODE_PALETTE)[0] }) {
  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("application/reactflow", JSON.stringify({ nodeType: item.nodeType }));
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing hover:shadow-sm transition-all duration-150 select-none",
        item.bg,
        item.border,
      )}
    >
      <span className={cn("shrink-0", item.color)}>{item.icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground leading-tight">{item.label}</p>
        <p className="text-[10px] text-muted-foreground leading-tight truncate">{item.description}</p>
      </div>
    </div>
  );
}

function extractDefinitionNodes(workflow: Workflow): WorkflowNode[] {
  const def = workflow.definitionJson;
  if (!def) return DEFAULT_NODES;
  const nodes = def['nodes'];
  return Array.isArray(nodes) && nodes.length > 0 ? (nodes as WorkflowNode[]) : DEFAULT_NODES;
}

function extractDefinitionEdges(workflow: Workflow): WorkflowEdge[] {
  const def = workflow.definitionJson;
  if (!def) return [];
  const edges = def['edges'];
  return Array.isArray(edges) ? (edges as WorkflowEdge[]) : [];
}

interface BuilderCanvasProps {
  workflow: Workflow;
  workflowId: string;
}

function BuilderCanvas({ workflow, workflowId }: BuilderCanvasProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const updateWorkflow = useUpdateWorkflow();
  const publishWorkflow = usePublishWorkflow();

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>(
    extractDefinitionNodes(workflow),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdge>(
    extractDefinitionEdges(workflow),
  );
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [workflowName, setWorkflowName] = useState(workflow.name);
  const [editingName, setEditingName] = useState(false);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) => addEdge({ ...connection, ...DEFAULT_EDGE_OPTIONS }, eds)),
    [setEdges],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/reactflow");
    if (!raw) return;
    const { nodeType } = JSON.parse(raw) as { nodeType: NodeType };
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const palette = NODE_PALETTE_MAP[nodeType];
    const newNode: WorkflowNode = {
      id: `${nodeType}-${Date.now()}`,
      type: "workflowNode",
      position,
      data: { label: palette?.label ?? nodeType, nodeType, configuration: {} },
    };
    setNodes((nds) => [...nds, newNode]);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleNodeClick(_: React.MouseEvent, node: WorkflowNode) {
    setSelectedNode(node);
  }

  function handlePaneClick() {
    setSelectedNode(null);
  }

  function handleNodeDataChange(id: string, data: Partial<WorkflowNodeData>) {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)));
    setSelectedNode((prev) =>
      prev?.id === id ? { ...prev, data: { ...prev.data, ...data } } : prev,
    );
  }

  function handleCloseConfig() {
    setSelectedNode(null);
  }

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workflowName.trim()) return;
    setEditingName(false);
    updateWorkflow.mutate(
      { id: workflowId, name: workflowName.trim() },
      { onError: () => toast.error("Failed to save name") },
    );
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setEditingName(false);
      setWorkflowName(workflow.name);
    }
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setWorkflowName(e.target.value);
  }

  function handleStartEditing() {
    setEditingName(true);
  }

  function handleSave() {
    updateWorkflow.mutate(
      { id: workflowId, name: workflowName },
      {
        onSuccess: () => toast.success("Draft saved"),
        onError: () => toast.error("Failed to save"),
      },
    );
  }

  function handlePublish() {
    publishWorkflow.mutate(
      { id: workflowId, definitionJson: { nodes, edges } },
      {
        onSuccess: () => toast.success("Workflow published"),
        onError: () => toast.error("Failed to publish"),
      },
    );
  }

  function handleBack() {
    router.push(`/workflows/${workflowId}`);
  }

  const statusBadge = STATUS_BADGE[workflow.status];

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <div className="w-56 shrink-0 border-r border-border bg-card flex flex-col shadow-sm">
        <div className="px-3 py-3 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Node Palette
          </p>
          <p className="text-[10px] text-muted-foreground">Drag nodes onto canvas</p>
        </div>
        <ScrollArea hideScrollbar className="min-h-0 flex-1">
          <div className="overscroll-contain space-y-1.5 p-2">
          {NODE_PALETTE.map((item) => (
            <PaletteItem key={item.nodeType} item={item} />
          ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-12 shrink-0 bg-card border-b border-border flex items-center px-3 gap-3 shadow-sm">
          <button
            onClick={handleBack}
            className="w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-4 w-px bg-border" />
          {editingName ? (
            <form onSubmit={handleNameSubmit} className="flex-1 max-w-xs">
              <Input
                autoFocus
                value={workflowName}
                onChange={handleNameChange}
                onBlur={handleNameSubmit}
                onKeyDown={handleNameKeyDown}
                className="text-sm font-medium"
              />
            </form>
          ) : (
            <button
              onClick={handleStartEditing}
              className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors group"
              title="Click to rename"
            >
              {workflowName}
              <Settings className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border",
              statusBadge.cls,
            )}
          >
            {statusBadge.label}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleSave}
              disabled={updateWorkflow.isPending}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              {updateWorkflow.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              size="sm"
              className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
              onClick={handlePublish}
              disabled={publishWorkflow.isPending}
            >
              <Upload className="h-3.5 w-3.5 mr-1" />
              {publishWorkflow.isPending ? "Publishing…" : "Publish"}
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex">
          <div
            ref={canvasRef}
            className="flex-1"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
              fitView
              deleteKeyCode="Delete"
              className="bg-muted/30"
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
              <Controls className="border border-border shadow-sm rounded-lg overflow-hidden" />
              <MiniMap className="border border-border shadow-sm rounded-lg overflow-hidden" />
              <Panel position="bottom-center">
                <div className="bg-card/90 backdrop-blur-sm border border-border rounded-full px-4 py-1.5 shadow-sm flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{nodes.length} node{nodes.length !== 1 ? "s" : ""}</span>
                  <span className="w-px h-3 bg-border" />
                  <span>{edges.length} connection{edges.length !== 1 ? "s" : ""}</span>
                  <span className="w-px h-3 bg-border" />
                  <span>Delete key removes selected</span>
                </div>
              </Panel>
            </ReactFlow>
          </div>

          {selectedNode && (
            <NodeConfigPanel
              node={selectedNode}
              onChange={handleNodeDataChange}
              onClose={handleCloseConfig}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function WorkflowBuilderGate({ workflowId }: { workflowId: string }) {
  const { data: workflow, isLoading, isError } = useWorkflow(workflowId);
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading workflow builder…</p>
        </div>
      </div>
    );
  }

  if (isError || !workflow) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background h-full">
        <div className="text-center space-y-3">
          <p className="text-sm font-medium text-foreground">Workflow not found</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/workflows")}>
            Back to Workflows
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <BuilderCanvas workflow={workflow} workflowId={workflowId} />
    </ReactFlowProvider>
  );
}

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  ChevronRight,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  useWorkflow,
  usePublishWorkflow,
  useUpdateWorkflow,
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
    color: "text-amber-600",
    border: "border-amber-300",
    bg: "bg-amber-50",
  },
  {
    nodeType: "condition",
    label: "Condition",
    description: "Branch on a rule",
    icon: <GitBranch className="h-4 w-4" />,
    color: "text-blue-600",
    border: "border-blue-300",
    bg: "bg-blue-50",
  },
  {
    nodeType: "approval",
    label: "Approval",
    description: "Wait for human sign-off",
    icon: <CheckSquare className="h-4 w-4" />,
    color: "text-emerald-600",
    border: "border-emerald-300",
    bg: "bg-emerald-50",
  },
  {
    nodeType: "action",
    label: "Action",
    description: "Execute an operation",
    icon: <Play className="h-4 w-4" />,
    color: "text-violet-600",
    border: "border-violet-300",
    bg: "bg-violet-50",
  },
  {
    nodeType: "delay",
    label: "Delay",
    description: "Wait before continuing",
    icon: <Clock className="h-4 w-4" />,
    color: "text-orange-600",
    border: "border-orange-300",
    bg: "bg-orange-50",
  },
  {
    nodeType: "loop",
    label: "Loop",
    description: "Repeat a set of steps",
    icon: <RefreshCcw className="h-4 w-4" />,
    color: "text-slate-600",
    border: "border-slate-300",
    bg: "bg-slate-50",
  },
  {
    nodeType: "ai_action",
    label: "AI Action",
    description: "Use AI to process data",
    icon: <Sparkles className="h-4 w-4" />,
    color: "text-purple-600",
    border: "border-purple-300",
    bg: "bg-purple-50",
  },
  {
    nodeType: "integration",
    label: "Integration",
    description: "Call external service",
    icon: <Share2 className="h-4 w-4" />,
    color: "text-teal-600",
    border: "border-teal-300",
    bg: "bg-teal-50",
  },
  {
    nodeType: "script",
    label: "Script",
    description: "Run custom code",
    icon: <Code className="h-4 w-4" />,
    color: "text-slate-700",
    border: "border-slate-400",
    bg: "bg-slate-100",
  },
  {
    nodeType: "end",
    label: "End",
    description: "Terminate the workflow",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-red-600",
    border: "border-red-300",
    bg: "bg-red-50",
  },
];

const NODE_PALETTE_MAP = Object.fromEntries(NODE_PALETTE.map((n) => [n.nodeType, n])) as Record<NodeType, typeof NODE_PALETTE[0]>;

const STATUS_BADGE: Record<WorkflowStatus, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  published: { label: "Published", cls: "bg-green-50 text-green-700 border-green-200" },
  disabled: { label: "Disabled", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  archived: { label: "Archived", cls: "bg-red-50 text-red-700 border-red-200" },
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
        "rounded-xl border-2 bg-white shadow-md min-w-[160px] max-w-[220px] transition-all duration-150",
        selected ? "border-violet-500 shadow-violet-200/60 shadow-lg ring-2 ring-violet-200" : palette.border,
      )}
    >
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-t-[10px]", palette.bg)}>
        <span className={palette.color}>{palette.icon}</span>
        <span className="text-xs font-semibold text-foreground truncate">{data.label}</span>
      </div>
      {data.description && (
        <div className="px-3 py-1.5 border-t border-border/30">
          <p className="text-[11px] text-muted-foreground leading-snug truncate">{data.description}</p>
        </div>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  workflowNode: WorkflowNodeComponent,
};

const defaultEdgeOptions = {
  style: { stroke: "#94a3b8", strokeWidth: 1.5 },
  animated: false,
};

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
    <div className="w-72 bg-white border-l border-slate-200 flex flex-col h-full shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          {palette && <span className={palette.color}>{palette.icon}</span>}
          <p className="text-sm font-semibold">Node Settings</p>
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-slate-100 transition-colors"
          aria-label="Close panel"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Label</label>
          <Input
            value={node.data.label}
            onChange={handleLabelChange}
            className="h-8 text-sm"
          />
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
    </div>
  );
}

interface PaletteItemProps {
  item: typeof NODE_PALETTE[0];
}

function PaletteItem({ item }: PaletteItemProps) {
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

const initialNodes: WorkflowNode[] = [
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

function BuilderCanvas({ workflowId }: { workflowId: string }) {
  const router = useRouter();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const { data: workflow } = useWorkflow(workflowId);
  const updateWorkflow = useUpdateWorkflow();
  const publishWorkflow = usePublishWorkflow();

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdge>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [workflowName, setWorkflowName] = useState("");
  const [editingName, setEditingName] = useState(false);

  useEffect(() => {
    if (!workflow) return;
    setWorkflowName(workflow.name);
    const def = workflow as unknown as { definitionJson?: { nodes?: WorkflowNode[]; edges?: WorkflowEdge[] } };
    if (def.definitionJson?.nodes?.length) {
      setNodes(def.definitionJson.nodes);
    }
    if (def.definitionJson?.edges?.length) {
      setEdges(def.definitionJson.edges);
    }
  }, [workflow, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, ...defaultEdgeOptions }, eds)),
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
      data: {
        label: palette?.label ?? nodeType,
        nodeType,
        configuration: {},
      },
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
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)),
    );
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
      setWorkflowName(workflow?.name ?? "");
    }
  }

  function handleSave() {
    updateWorkflow.mutate(
      { id: workflowId, name: workflowName || (workflow?.name ?? "Untitled") },
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

  const status = workflow?.status;
  const statusBadge = status ? STATUS_BADGE[status] : null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <div className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col shadow-sm">
        <div className="px-3 py-3 border-b border-slate-100">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Nodes
          </p>
          <p className="text-[10px] text-muted-foreground">Drag onto canvas</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {NODE_PALETTE.map((item) => (
            <PaletteItem key={item.nodeType} item={item} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-12 shrink-0 bg-white border-b border-slate-200 flex items-center px-3 gap-3 shadow-sm">
          <button
            onClick={handleBack}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-muted-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-200" />

          {editingName ? (
            <form onSubmit={handleNameSubmit} className="flex-1 max-w-xs">
              <Input
                autoFocus
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={handleNameKeyDown}
                className="h-7 text-sm font-medium"
              />
            </form>
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-violet-600 transition-colors group"
              title="Click to rename"
            >
              {workflowName || workflow?.name || "Untitled Workflow"}
              <Settings className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}

          {statusBadge && (
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", statusBadge.cls)}>
              {statusBadge.label}
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleSave}
              disabled={updateWorkflow.isPending}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              {updateWorkflow.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
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
            ref={reactFlowWrapper}
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
              defaultEdgeOptions={defaultEdgeOptions}
              fitView
              deleteKeyCode="Delete"
              className="bg-slate-50"
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="#cbd5e1"
              />
              <Controls className="border border-slate-200 shadow-sm rounded-lg overflow-hidden" />
              <MiniMap
                className="border border-slate-200 shadow-sm rounded-lg overflow-hidden"
                nodeColor={(n) => {
                  const nt = (n.data as WorkflowNodeData)?.nodeType;
                  const p = nt ? NODE_PALETTE_MAP[nt] : null;
                  return p ? "" : "#e2e8f0";
                }}
              />
              <Panel position="bottom-center">
                <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full px-4 py-1.5 shadow-sm flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{nodes.length} node{nodes.length !== 1 ? "s" : ""}</span>
                  <span className="w-px h-3 bg-slate-200" />
                  <span>{edges.length} connection{edges.length !== 1 ? "s" : ""}</span>
                  <span className="w-px h-3 bg-slate-200" />
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

export default function WorkflowBuilderPage() {
  const params = useParams<{ workflowId: string }>();
  return (
    <ReactFlowProvider>
      <BuilderCanvas workflowId={params.workflowId} />
    </ReactFlowProvider>
  );
}

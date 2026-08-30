import type { DragEvent, MouseEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
} from "@xyflow/react";
import { WorkflowNodeConfigPanel } from "./workflow-node-config-panel";
import { isWorkflowNodeType, NODE_PALETTE_MAP } from "./workflow-node-palette";
import { workflowNodeTypes } from "./workflow-flow-node";
import type { WorkflowEdge, WorkflowNode, WorkflowNodeData } from "./workflow-builder-types";

const DEFAULT_EDGE_OPTIONS = { style: { stroke: "var(--muted-foreground)", strokeWidth: 1.5 } };

interface WorkflowBuilderCanvasSurfaceProps {
  initialEdges: WorkflowEdge[];
  initialNodes: WorkflowNode[];
  onDefinitionChange: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
}

export function WorkflowBuilderCanvasSurface({ initialEdges, initialNodes, onDefinitionChange }: WorkflowBuilderCanvasSurfaceProps) {
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdge>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);

  useEffect(() => { onDefinitionChange(nodes, edges); }, [edges, nodes, onDefinitionChange]);
  const handleNodesChange = useCallback((changes: Parameters<typeof onNodesChange>[0]) => { onNodesChange(changes); }, [onNodesChange]);
  const handleEdgesChange = useCallback((changes: Parameters<typeof onEdgesChange>[0]) => { onEdgesChange(changes); }, [onEdgesChange]);

  const handleConnect = useCallback((connection: Connection) => {
    setEdges((currentEdges) => {
      const nextEdges = addEdge({ ...connection, ...DEFAULT_EDGE_OPTIONS }, currentEdges);
      return nextEdges;
    });
  }, [setEdges]);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const raw = event.dataTransfer.getData("application/reactflow");
    if (!raw) return;
    try {
      const payload: unknown = JSON.parse(raw);
      if (!isDropPayload(payload)) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const palette = NODE_PALETTE_MAP[payload.nodeType];
      const node: WorkflowNode = { id: `${payload.nodeType}-${Date.now()}`, type: "workflowNode", position, data: { label: palette.label, nodeType: payload.nodeType, configuration: {} } };
      setNodes((currentNodes) => {
        return [...currentNodes, node];
      });
    } catch { }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }
  function handleNodeClick(_: MouseEvent, node: WorkflowNode) { setSelectedNode(node); }
  function handlePaneClick() { setSelectedNode(null); }
  function handleCloseConfigPanel() { setSelectedNode(null); }
  function handleNodeDataChange(id: string, data: Partial<WorkflowNodeData>) {
    setNodes((currentNodes) => {
      return currentNodes.map((node) => node.id === id ? { ...node, data: { ...node.data, ...data } } : node);
    });
    setSelectedNode((currentNode) => currentNode?.id === id ? { ...currentNode, data: { ...currentNode.data, ...data } } : currentNode);
  }

  return (
    <div className="flex-1 min-h-0 flex">
      <div className="flex-1" onDrop={handleDrop} onDragOver={handleDragOver}>
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={handleNodesChange} onEdgesChange={handleEdgesChange} onConnect={handleConnect} onNodeClick={handleNodeClick} onPaneClick={handlePaneClick} nodeTypes={workflowNodeTypes} defaultEdgeOptions={DEFAULT_EDGE_OPTIONS} fitView deleteKeyCode="Delete" className="bg-muted/30">
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
          <Controls className="border border-border shadow-sm rounded-lg overflow-hidden" />
          <MiniMap className="border border-border shadow-sm rounded-lg overflow-hidden" />
          <Panel position="bottom-center"><div className="bg-card/90 backdrop-blur-sm border border-border rounded-full px-4 py-1.5 shadow-sm flex items-center gap-3 text-dense text-muted-foreground"><span>{nodes.length} node{nodes.length !== 1 ? "s" : ""}</span><span className="w-px h-3 bg-border" /><span>{edges.length} connection{edges.length !== 1 ? "s" : ""}</span><span className="w-px h-3 bg-border" /><span>Delete key removes selected</span></div></Panel>
        </ReactFlow>
      </div>
      {selectedNode && <WorkflowNodeConfigPanel node={selectedNode} onChange={handleNodeDataChange} onClose={handleCloseConfigPanel} />}
    </div>
  );
}

function isDropPayload(value: unknown): value is { nodeType: import("@/hooks/api/workflows").NodeType } {
  if (typeof value !== "object" || value === null || !("nodeType" in value)) return false;
  return isWorkflowNodeType(value.nodeType);
}

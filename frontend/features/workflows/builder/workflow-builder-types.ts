import type { Edge, Node } from "@xyflow/react";
import type { NodeType } from "@/hooks/api/workflows";

export interface WorkflowNodeData {
  label: string;
  nodeType: NodeType;
  configuration: Record<string, unknown>;
  description?: string;
  [key: string]: unknown;
}

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;

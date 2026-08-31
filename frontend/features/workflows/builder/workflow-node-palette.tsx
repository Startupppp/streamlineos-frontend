import type { ReactNode } from "react";
import {
  CheckSquare,
  Clock,
  Code,
  GitBranch,
  Play,
  RefreshCcw,
  Share2,
  Sparkles,
  XCircle,
  Zap,
} from "lucide-react";
import type { NodeType } from "@/hooks/api/workflows";

export interface PaletteItemDefinition {
  nodeType: NodeType;
  label: string;
  description: string;
  icon: ReactNode;
  color: string;
  border: string;
  bg: string;
}

export const NODE_PALETTE: PaletteItemDefinition[] = [
  { nodeType: "trigger", label: "Trigger", description: "Start the workflow", icon: <Zap className="h-4 w-4" />, color: "text-status-warning-ink", border: "border-status-warning-rule", bg: "bg-status-warning-surface" },
  { nodeType: "condition", label: "Condition", description: "Branch on a rule", icon: <GitBranch className="h-4 w-4" />, color: "text-status-info-ink", border: "border-status-info-rule", bg: "bg-status-info-surface" },
  { nodeType: "approval", label: "Approval", description: "Wait for human sign-off", icon: <CheckSquare className="h-4 w-4" />, color: "text-status-success-ink", border: "border-status-success-rule", bg: "bg-status-success-surface" },
  { nodeType: "action", label: "Action", description: "Execute an operation", icon: <Play className="h-4 w-4" />, color: "text-primary", border: "border-primary/30", bg: "bg-primary/10" },
  { nodeType: "delay", label: "Delay", description: "Wait before continuing", icon: <Clock className="h-4 w-4" />, color: "text-status-warning-ink", border: "border-status-warning-rule", bg: "bg-status-warning-surface" },
  { nodeType: "loop", label: "Loop", description: "Repeat a set of steps", icon: <RefreshCcw className="h-4 w-4" />, color: "text-foreground", border: "border-border", bg: "bg-muted" },
  { nodeType: "ai_action", label: "AI Action", description: "Use AI to process data", icon: <Sparkles className="h-4 w-4" />, color: "text-status-warning-ink", border: "border-status-warning-rule", bg: "bg-status-warning-surface" },
  { nodeType: "integration", label: "Integration", description: "Call external service", icon: <Share2 className="h-4 w-4" />, color: "text-status-success-ink", border: "border-status-success-rule", bg: "bg-status-success-surface" },
  { nodeType: "script", label: "Script", description: "Run custom code", icon: <Code className="h-4 w-4" />, color: "text-foreground", border: "border-input", bg: "bg-muted" },
  { nodeType: "end", label: "End", description: "Terminate the workflow", icon: <XCircle className="h-4 w-4" />, color: "text-status-danger-ink", border: "border-status-danger-rule", bg: "bg-status-danger-surface" },
];

export const NODE_PALETTE_MAP = Object.fromEntries(NODE_PALETTE.map((item) => [item.nodeType, item])) as Record<NodeType, PaletteItemDefinition>;

export function isWorkflowNodeType(value: unknown): value is NodeType {
  return typeof value === "string" && value in NODE_PALETTE_MAP;
}



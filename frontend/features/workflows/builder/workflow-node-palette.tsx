import type { DragEvent, ReactNode } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
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

function PaletteItem({ item }: { item: PaletteItemDefinition }) {
  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.setData("application/reactflow", JSON.stringify({ nodeType: item.nodeType }));
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <div draggable onDragStart={handleDragStart} className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing hover:shadow-sm transition-all duration-150 select-none", item.bg, item.border)}>
      <span className={cn("shrink-0", item.color)}>{item.icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground leading-tight">{item.label}</p>
        <TruncatedText text={item.description} className="text-micro text-muted-foreground leading-tight" />
      </div>
    </div>
  );
}

export function WorkflowNodePalette() {
  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card flex flex-col shadow-sm" aria-label="Workflow node palette">
      <div className="px-3 py-3 border-b border-border">
        <p className="text-micro font-semibold text-muted-foreground uppercase tracking-wider mb-1">Node Palette</p>
        <p className="text-micro text-muted-foreground">Drag nodes onto canvas</p>
      </div>
      <ScrollArea hideScrollbar className="min-h-0 flex-1">
        <div className="overscroll-contain space-y-1.5 p-2">
          {NODE_PALETTE.map((item) => <PaletteItem key={item.nodeType} item={item} />)}
        </div>
      </ScrollArea>
    </aside>
  );
}

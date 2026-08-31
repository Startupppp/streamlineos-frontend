import type { NodeTypes } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import { NODE_PALETTE_MAP } from "./workflow-node-palette";
import type { WorkflowNodeData } from "./workflow-builder-types";

function WorkflowFlowNode({ data, selected }: { data: WorkflowNodeData; selected: boolean }) {
  const palette = NODE_PALETTE_MAP[data.nodeType];
  if (!palette) return null;

  return (
    <div className={cn("rounded-xl border-2 bg-card shadow-md min-w-[160px] max-w-[220px] transition-all duration-150", selected ? "border-primary shadow-lg ring-2 ring-primary/20" : palette.border)}>
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-t-lg", palette.bg)}>
        <span className={palette.color}>{palette.icon}</span>
        <TruncatedText text={data.label} className="text-xs font-semibold text-foreground" />
      </div>
      {data.description && <div className="px-3 py-1.5 border-t border-border/60"><TruncatedText text={data.description} className="text-dense text-muted-foreground leading-snug" /></div>}
    </div>
  );
}

export const workflowNodeTypes: NodeTypes = { workflowNode: WorkflowFlowNode };

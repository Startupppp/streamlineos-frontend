import type { ChangeEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { NODE_PALETTE_MAP } from "./workflow-node-palette";
import type { WorkflowNode, WorkflowNodeData } from "./workflow-builder-types";

interface WorkflowNodeConfigPanelProps {
  node: WorkflowNode;
  onChange: (id: string, data: Partial<WorkflowNodeData>) => void;
  onClose: () => void;
}

export function WorkflowNodeConfigPanel({ node, onChange, onClose }: WorkflowNodeConfigPanelProps) {
  const palette = NODE_PALETTE_MAP[node.data.nodeType];

  function handleLabelChange(event: ChangeEvent<HTMLInputElement>) { onChange(node.id, { label: event.target.value }); }
  function handleDescriptionChange(event: ChangeEvent<HTMLTextAreaElement>) { onChange(node.id, { description: event.target.value }); }

  return (
    <aside className="w-72 bg-card border-l border-border flex flex-col h-full shadow-xl" aria-label="Node settings">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">{palette && <span className={palette.color}>{palette.icon}</span>}<p className="text-sm font-semibold">Node Settings</p></div>
        <button type="button" onClick={onClose} className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors" aria-label="Close node settings"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
      </div>
      <ScrollArea hideScrollbar className="min-h-0 flex-1">
        <div className="overscroll-contain space-y-4 p-4">
          <div className="space-y-1.5"><label htmlFor="workflow-node-label" className="text-xs font-medium text-foreground">Label</label><Input id="workflow-node-label" value={node.data.label} onChange={handleLabelChange} className="text-sm" /></div>
          <div className="space-y-1.5"><label htmlFor="workflow-node-description" className="text-xs font-medium text-foreground">Description</label><Textarea id="workflow-node-description" value={node.data.description ?? ""} onChange={handleDescriptionChange} rows={3} className="text-sm resize-none" placeholder="What does this node do?" /></div>
          <div className="space-y-1.5"><p className="text-xs font-medium text-foreground">Node Type</p><p className="text-sm text-muted-foreground capitalize">{node.data.nodeType.replace(/_/g, " ")}</p></div>
        </div>
      </ScrollArea>
    </aside>
  );
}

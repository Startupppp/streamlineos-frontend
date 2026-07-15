"use client";

import { memo, useCallback } from "react";
import { X, GitBranch, StopCircle, Plus, GripVertical } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { BuilderNode, BuilderBranchBranch } from "./builder-types";

const OPERATORS = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "gt", label: "greater than" },
  { value: "lt", label: "less than" },
  { value: "contains", label: "contains" },
  { value: "in", label: "in list" },
  { value: "changed_to", label: "changed to" },
] as const;

interface BranchRowProps {
  branch: BuilderBranchBranch;
  branchIndex: number;
  nodeId: string;
  onUpdateCondition: (nodeId: string, branchIndex: number, field: "field" | "operator" | "value", val: string) => void;
  onRemove: (nodeId: string, branchIndex: number) => void;
  canRemove: boolean;
}

const BranchRow = memo(function BranchRow({ branch, branchIndex, nodeId, onUpdateCondition, onRemove, canRemove }: BranchRowProps) {
  const handleFieldChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onUpdateCondition(nodeId, branchIndex, "field", e.target.value), [nodeId, branchIndex, onUpdateCondition]);
  const handleOperatorChange = useCallback((val: string) => onUpdateCondition(nodeId, branchIndex, "operator", val), [nodeId, branchIndex, onUpdateCondition]);
  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onUpdateCondition(nodeId, branchIndex, "value", e.target.value), [nodeId, branchIndex, onUpdateCondition]);
  const handleRemove = useCallback(() => onRemove(nodeId, branchIndex), [nodeId, branchIndex, onRemove]);
  const { hoverHandlers } = useAnimatedIcon();

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/10 px-3 py-2">
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <span className="text-[10px] font-medium text-muted-foreground w-4 shrink-0">{branchIndex + 1}</span>
        <Input className="h-8 text-xs flex-1 min-w-0" placeholder="field" value={branch.condition.field} onChange={handleFieldChange} />
        <Select value={branch.condition.operator} onValueChange={handleOperatorChange}>
          <SelectTrigger className="h-8 text-xs w-[100px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATORS.map((op) => (
              <SelectItem key={op.value} value={op.value} className="text-xs">{op.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input className="h-8 text-xs flex-1 min-w-0" placeholder="value" value={branch.condition.value} onChange={handleValueChange} />
      </div>
      {canRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={handleRemove}
          {...hoverHandlers}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
});

interface BranchNodeCardProps {
  node: BuilderNode;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  onAddBranch: (nodeId: string) => void;
  onUpdateBranchCondition: (nodeId: string, branchIndex: number, field: "field" | "operator" | "value", val: string) => void;
  onRemoveBranch: (nodeId: string, branchIndex: number) => void;
  onRemoveNode: (nodeId: string) => void;
}

export const BranchNodeCard = memo(function BranchNodeCard({ node, dragHandleProps, onAddBranch, onUpdateBranchCondition, onRemoveBranch, onRemoveNode }: BranchNodeCardProps) {
  const handleAddBranch = useCallback(() => onAddBranch(node.id), [node.id, onAddBranch]);
  const handleRemoveNode = useCallback(() => onRemoveNode(node.id), [node.id, onRemoveNode]);
  const { hoverHandlers: addHoverHandlers } = useAnimatedIcon();
  const { hoverHandlers: removeHoverHandlers } = useAnimatedIcon();

  return (
    <motion.div layout className="rounded-xl border-2 border-primary/20 bg-primary/5 p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <div {...(dragHandleProps ?? {})} className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground shrink-0">
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                <GitBranch className="h-3 w-3" />
              </div>
              <span className="text-xs font-semibold text-primary">Branch</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={handleRemoveNode} {...removeHoverHandlers}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <Label className="text-[10px] text-muted-foreground">Branch conditions — first match wins</Label>
          <div className="space-y-1.5">
            {(node.branches ?? []).map((branch, i) => (
              <BranchRow
                key={i}
                branch={branch}
                branchIndex={i}
                nodeId={node.id}
                onUpdateCondition={onUpdateBranchCondition}
                onRemove={onRemoveBranch}
                canRemove={(node.branches?.length ?? 0) > 1}
              />
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] border-dashed border-primary/30 text-primary hover:bg-primary/5"
            onClick={handleAddBranch}
            {...addHoverHandlers}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add branch
          </Button>
        </div>
      </div>
    </motion.div>
  );
});

interface ExitNodeCardProps {
  nodeId: string;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  onRemove: (nodeId: string) => void;
}

export const ExitNodeCard = memo(function ExitNodeCard({ nodeId, dragHandleProps, onRemove }: ExitNodeCardProps) {
  const handleRemove = useCallback(() => onRemove(nodeId), [nodeId, onRemove]);
  const { hoverHandlers } = useAnimatedIcon();

  return (
    <motion.div layout className="rounded-xl border-2 border-red-200 dark:border-red-500/30 bg-red-50/40 dark:bg-red-500/10 p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <div {...(dragHandleProps ?? {})} className="cursor-grab active:cursor-grabbing text-muted-foreground shrink-0">
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="h-5 w-5 rounded bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-[10px] font-bold text-red-600 dark:text-red-400">
          <StopCircle className="h-3 w-3" />
        </div>
        <span className="text-xs font-semibold text-red-600 dark:text-red-400 flex-1">Exit / Stop</span>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={handleRemove} {...hoverHandlers}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </motion.div>
  );
});

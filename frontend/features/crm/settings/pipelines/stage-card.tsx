"use client";

import { useCallback, useRef } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { CrmStageBadge } from "@/features/crm/shared/metadata";
import { getCrmTokenClasses } from "@/features/crm/shared/metadata/crm-color-tokens";
import { useUpdateStage } from "@/hooks/api/crm";
import type { CrmPipelineStage, CrmStageType } from "@/types/crm/metadata";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { STAGE_TYPES } from "./pipeline-constants";

export function StageCard({
  stage,
  index,
  siblingStages,
  onEditAdvanced,
  onDeleteRequest,
}: {
  stage: CrmPipelineStage;
  index: number;
  siblingStages: CrmPipelineStage[];
  onEditAdvanced: (stage: CrmPipelineStage) => void;
  onDeleteRequest: (id: string) => void;
}) {
  const updateStage = useUpdateStage();
  const { dotClass } = getCrmTokenClasses(stage.color);
  const slaRef = useRef<HTMLInputElement>(null);

  const handleProbChange = useCallback((delta: number) => {
    const next = Math.max(0, Math.min(100, stage.probability + delta));
    updateStage.mutate({ id: stage.id, probability: next }, { onError: (err) => toast.error(getErrorMessage(err)) });
  }, [stage.id, stage.probability, updateStage]);

  const handleDecrease = useCallback(() => handleProbChange(-5), [handleProbChange]);
  const handleIncrease = useCallback(() => handleProbChange(5), [handleProbChange]);

  const handleStageTypeChange = useCallback((val: string) => {
    updateStage.mutate({ id: stage.id, stageType: val as CrmStageType }, { onError: (err) => toast.error(getErrorMessage(err)) });
  }, [stage.id, updateStage]);

  const handleSlaBlur = useCallback(() => {
    const val = slaRef.current?.value;
    const slaHours = val ? Number(val) : null;
    if (slaHours !== stage.slaHours) {
      updateStage.mutate({ id: stage.id, slaHours }, { onError: (err) => toast.error(getErrorMessage(err)) });
    }
  }, [stage.id, stage.slaHours, updateStage]);

  const handleApprovalChange = useCallback((checked: boolean) => {
    updateStage.mutate({ id: stage.id, requiresApproval: checked }, { onError: (err) => toast.error(getErrorMessage(err)) });
  }, [stage.id, updateStage]);

  const handleTerminalChange = useCallback((checked: boolean) => {
    updateStage.mutate({ id: stage.id, isTerminal: checked }, { onError: (err) => toast.error(getErrorMessage(err)) });
  }, [stage.id, updateStage]);

  const handleEditAdvanced = useCallback(() => onEditAdvanced(stage), [stage, onEditAdvanced]);
  const handleDeleteRequest = useCallback(() => onDeleteRequest(stage.id), [stage.id, onDeleteRequest]);

  const stageTypeMeta = STAGE_TYPES.find((t) => t.value === stage.stageType);

  void siblingStages;

  return (
    <Draggable draggableId={stage.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm transition-shadow",
            snapshot.isDragging && "shadow-lg ring-1 ring-primary/30"
          )}
        >
          <div {...provided.dragHandleProps} className="shrink-0 cursor-grab text-muted-foreground hover:text-foreground">
            <GripVertical className="h-4 w-4" />
          </div>
          <span className={cn("size-2.5 rounded-full shrink-0", dotClass)} />
          <span className="font-medium text-sm min-w-[80px] flex-1 truncate">{stage.label}</span>
          <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
            {stage.key}
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleDecrease} disabled={stage.probability <= 0} type="button">
              <span className="text-xs leading-none">−</span>
            </Button>
            <span className="bg-primary/10 text-primary text-xs px-1.5 rounded min-w-[3rem] text-center">
              {stage.probability}%
            </span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleIncrease} disabled={stage.probability >= 100} type="button">
              <span className="text-xs leading-none">+</span>
            </Button>
          </div>
          <Select value={stage.stageType} onValueChange={handleStageTypeChange}>
            <SelectTrigger className="h-6 w-[72px] text-[11px] border-none shadow-none px-1.5">
              <SelectValue>
                <span className={cn("text-[11px]", stageTypeMeta?.className)}>{stageTypeMeta?.label}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STAGE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <span className={t.className}>{t.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input ref={slaRef} type="number" min={1} defaultValue={stage.slaHours ?? ""} placeholder="SLA" className="w-16 text-xs" onBlur={handleSlaBlur} />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-muted-foreground">Appr.</span>
            <Switch checked={stage.requiresApproval} onCheckedChange={handleApprovalChange} className="scale-75" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-muted-foreground">Terminal</span>
            <Switch checked={stage.isTerminal} onCheckedChange={handleTerminalChange} className="scale-75" />
          </div>
          <CrmStageBadge stage={stage} size="table" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={handleEditAdvanced}>
                <Pencil className="h-3.5 w-3.5 mr-2" />
                Edit (advanced)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeleteRequest} className="text-destructive focus:text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </Draggable>
  );
}

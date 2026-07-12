"use client";

import { useState, useCallback } from "react";
import { Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

import { useBlueprintTransitions } from "@/hooks/api/crm";
import type { CrmBlueprint, CrmBlueprintTransition, CrmPipelineStage } from "@/types/crm/metadata";
import { TransitionPopover } from "./transition-popover";
import { TestPanel } from "./test-panel";

interface MatrixCellProps {
  fromStage: CrmPipelineStage;
  toStage: CrmPipelineStage;
  transition: CrmBlueprintTransition | undefined;
  blueprintId: string;
}

function MatrixCell({ fromStage, toStage, transition, blueprintId }: MatrixCellProps) {
  const [open, setOpen] = useState(false);

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {transition ? (
          <button
            type="button"
            className="inline-flex items-center bg-blue-500 text-white text-[9px] px-1.5 h-5 rounded cursor-pointer hover:bg-blue-600 transition-colors"
          >
            {toStage.label.slice(0, 6)}
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center border border-dashed border-border text-muted-foreground text-[9px] px-1.5 h-5 rounded cursor-pointer hover:border-blue-400 transition-colors"
          >
            +
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="p-3 w-auto">
        <TransitionPopover
          fromStage={fromStage}
          toStage={toStage}
          transition={transition}
          blueprintId={blueprintId}
          onClose={handleClose}
        />
      </PopoverContent>
    </Popover>
  );
}

export interface TransitionMatrixProps {
  blueprint: CrmBlueprint;
  stages: CrmPipelineStage[];
}

export function TransitionMatrix({ blueprint, stages }: TransitionMatrixProps) {
  const { data: transitions = [], isLoading } = useBlueprintTransitions(blueprint.id);

  const transitionMap = new Map(
    transitions.map((t) => [`${t.fromStageKey}::${t.toStageKey}`, t])
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>Unconfigured transitions are allowed by default (fail-open)</span>
      </div>

      <div className="overflow-x-auto">
        <table className="text-[10px] border-collapse w-full">
          <thead>
            <tr>
              <th className="text-left text-muted-foreground font-medium px-2 py-1.5 whitespace-nowrap border-b border-border w-24">
                From \ To
              </th>
              {stages.map((s) => (
                <th
                  key={s.key}
                  className="text-center text-muted-foreground font-medium px-1.5 py-1.5 whitespace-nowrap border-b border-border min-w-[60px]"
                >
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stages.map((fromStage) => (
              <tr key={fromStage.key} className="border-b border-border/50 hover:bg-muted/20">
                <td className="px-2 py-1.5 font-medium text-[10px] whitespace-nowrap text-foreground">
                  {fromStage.label}
                </td>
                {stages.map((toStage) => (
                  <td key={toStage.key} className="px-1.5 py-1.5 text-center">
                    {fromStage.key === toStage.key ? (
                      <span className="text-muted-foreground/40">—</span>
                    ) : (
                      <MatrixCell
                        fromStage={fromStage}
                        toStage={toStage}
                        transition={transitionMap.get(`${fromStage.key}::${toStage.key}`)}
                        blueprintId={blueprint.id}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TestPanel blueprintId={blueprint.id} stages={stages} />
    </div>
  );
}

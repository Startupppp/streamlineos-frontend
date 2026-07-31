"use client";

import { memo } from "react";
import { ListChecks } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { METRIC_OPTIONS } from "./constants";
import type { KeyResultMetric, KeyResultInput } from "@/hooks/api/goals";

export interface DraftKeyResult {
  title: string;
  metricType: KeyResultMetric;
  startValue: string;
  targetValue: string;
  unit: string;
}

export const EMPTY_KR: DraftKeyResult = {
  title: "",
  metricType: "number",
  startValue: "0",
  targetValue: "100",
  unit: "",
};

export function buildKeyResults(keyResults: DraftKeyResult[]): KeyResultInput[] {
  return keyResults
    .filter((kr) => kr.title.trim())
    .map((kr) => ({
      title: kr.title.trim(),
      metricType: kr.metricType,
      startValue: Number(kr.startValue) || 0,
      targetValue: Number(kr.targetValue) || 0,
      currentValue: Number(kr.startValue) || 0,
      unit: kr.unit.trim() || undefined,
    }));
}

interface KeyResultRowProps {
  kr: DraftKeyResult;
  index: number;
  onUpdate: (index: number, patch: Partial<DraftKeyResult>) => void;
  onRemove: (index: number) => void;
}

const KeyResultRow = memo(function KeyResultRow({ kr, index, onUpdate, onRemove }: KeyResultRowProps) {
  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onUpdate(index, { title: e.target.value });
  }
  function handleMetricTypeChange(v: string) {
    const found = METRIC_OPTIONS.find((o) => o.value === v);
    if (found) onUpdate(index, { metricType: found.value });
  }
  function handleUnitChange(e: React.ChangeEvent<HTMLInputElement>) {
    onUpdate(index, { unit: e.target.value });
  }
  function handleStartValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    onUpdate(index, { startValue: e.target.value });
  }
  function handleTargetValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    onUpdate(index, { targetValue: e.target.value });
  }
  function handleRemove() {
    onRemove(index);
  }

  return (
    <div className="rounded-lg border border-border/60 p-3 space-y-2.5">
      <div className="flex items-start gap-2">
        <Input
          placeholder="Key result title"
          className="flex-1"
          value={kr.title}
          onChange={handleTitleChange}
        />
        <AnimatedIconButton
          type="button"
          variant="ghost"
          size="icon"
          icon={Trash2Icon}
          iconSize={14}
          className="w-8 text-destructive hover:text-destructive shrink-0"
          onClick={handleRemove}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select value={kr.metricType} onValueChange={handleMetricTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRIC_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Unit (optional)"
          className="text-xs"
          value={kr.unit}
          onChange={handleUnitChange}
        />
        <Input
          type="number"
          placeholder="Start"
          className="text-xs"
          value={kr.startValue}
          onChange={handleStartValueChange}
        />
        <Input
          type="number"
          placeholder="Target"
          className="text-xs"
          value={kr.targetValue}
          onChange={handleTargetValueChange}
        />
      </div>
    </div>
  );
});

interface GoalKeyResultsPanelProps {
  keyResults: DraftKeyResult[];
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<DraftKeyResult>) => void;
  onRemove: (index: number) => void;
}

export function GoalKeyResultsPanel({ keyResults, onAdd, onUpdate, onRemove }: GoalKeyResultsPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ListChecks className="h-4 w-4" />
          <span>Key Results</span>
        </div>
        <AnimatedIconButton
          type="button"
          variant="outline"
          size="sm"
          icon={PlusIcon}
          iconSize={14}
          iconClassName="mr-1"
          onClick={onAdd}
        >
          Add
        </AnimatedIconButton>
      </div>

      {keyResults.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Add measurable key results to track progress.
        </p>
      ) : (
        <div className="space-y-3">
          {keyResults.map((kr, index) => (
            <KeyResultRow
              key={index}
              kr={kr}
              index={index}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

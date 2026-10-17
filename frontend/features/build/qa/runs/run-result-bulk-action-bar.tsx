"use client";

import { useCallback } from "react";
import { useCan } from "@/hooks/api/access";
import { useUpdateTestResult } from "@/hooks/api/build/qa";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import type { TestResultStatus } from "@/types/projects";

const STATUS_OPTIONS: { value: TestResultStatus; label: string }[] = [
  { value: "not_run", label: "Not Run" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "blocked", label: "Blocked" },
  { value: "skipped", label: "Skipped" },
];

function isTestResultStatus(value: string): value is TestResultStatus {
  return STATUS_OPTIONS.some((option) => option.value === value);
}

interface RunResultBulkActionBarProps {
  projectId: number;
  runId: number;
  selectedIds: Set<string | number>;
  onClear: () => void;
}

export function RunResultBulkActionBar({
  projectId,
  runId,
  selectedIds,
  onClear,
}: RunResultBulkActionBarProps) {
  const canExecute = useCan("build:qa:execute");
  const updateResult = useUpdateTestResult();

  const handleStatusChange = useCallback(
    (status: string) => {
      if (!isTestResultStatus(status)) return;
      for (const resultId of selectedIds) {
        if (typeof resultId !== "number") continue;
        updateResult.mutate(
          { projectId, runId, resultId, status },
          { onError: (e) => toast.error(getErrorMessage(e)) },
        );
      }
    },
    [selectedIds, projectId, runId, updateResult],
  );

  if (!canExecute) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">
        {selectedIds.size} selected
      </span>
      <Select onValueChange={handleStatusChange}>
        <SelectTrigger className="h-7 w-[130px] text-xs">
          <SelectValue placeholder="Set status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={onClear}
        aria-label="Clear selection"
        type="button"
      >
        ✕
      </Button>
    </div>
  );
}

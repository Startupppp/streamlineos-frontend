"use client";

import { useCallback } from "react";
import { useCan } from "@/hooks/api/access";
import { useUpdateTestCase, useDeleteTestCase } from "@/hooks/api/build/qa";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import type { TestCasePriority } from "@/types/projects";

const PRIORITY_OPTIONS: { value: TestCasePriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

interface QaBulkActionBarProps {
  projectId: number;
  selectedIds: Set<string | number>;
  onClear: () => void;
}

export function QaBulkActionBar({
  projectId,
  selectedIds,
  onClear,
}: QaBulkActionBarProps) {
  const canManage = useCan("build:qa:manage");
  const updateTestCase = useUpdateTestCase();
  const deleteTestCase = useDeleteTestCase();

  const handlePriorityChange = useCallback(
    (priority: string) => {
      const ids = Array.from(selectedIds) as number[];
      ids.forEach((id) => {
        updateTestCase.mutate(
          { projectId, id, priority: priority as TestCasePriority },
          { onError: (e) => toast.error(getErrorMessage(e)) },
        );
      });
    },
    [selectedIds, projectId, updateTestCase],
  );

  const handleArchive = useCallback(() => {
    const ids = Array.from(selectedIds) as number[];
    ids.forEach((id) => {
      deleteTestCase.mutate(
        { projectId, id },
        {
          onSuccess: onClear,
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    });
  }, [selectedIds, projectId, deleteTestCase, onClear]);

  if (!canManage) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">
        {selectedIds.size} selected
      </span>
      <Select onValueChange={handlePriorityChange}>
        <SelectTrigger className="h-7 w-[130px] text-xs">
          <SelectValue placeholder="Set priority" />
        </SelectTrigger>
        <SelectContent>
          {PRIORITY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="destructive"
        size="sm"
        className="h-7 text-xs"
        onClick={handleArchive}
        type="button"
      >
        Archive
      </Button>
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

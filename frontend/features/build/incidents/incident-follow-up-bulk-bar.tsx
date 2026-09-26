"use client";

import { useCallback } from "react";
import { useCan } from "@/hooks/api/access";
import { useUpdateIncidentFollowUpAction } from "@/hooks/api/build/incidents";
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
import type { IncidentFollowUpStatus } from "@/hooks/api/build/incidents-schema";

const STATUS_OPTIONS: { value: IncidentFollowUpStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

function isIncidentFollowUpStatus(value: string): value is IncidentFollowUpStatus {
  return STATUS_OPTIONS.some((option) => option.value === value);
}

interface IncidentFollowUpBulkBarProps {
  projectId: number;
  incidentId: number;
  selectedIds: Set<string | number>;
  onClear: () => void;
}

export function IncidentFollowUpBulkBar({
  projectId,
  incidentId,
  selectedIds,
  onClear,
}: IncidentFollowUpBulkBarProps) {
  const canManage = useCan("build:incidents:manage");
  const updateAction = useUpdateIncidentFollowUpAction();

  const handleStatusChange = useCallback(
    (status: string) => {
      if (!isIncidentFollowUpStatus(status)) return;
      for (const followUpActionId of selectedIds) {
        if (typeof followUpActionId !== "number") continue;
        updateAction.mutate(
          { projectId, incidentId, followUpActionId, status },
          { onError: (e) => toast.error(getErrorMessage(e)) },
        );
      }
    },
    [selectedIds, projectId, incidentId, updateAction],
  );

  if (!canManage) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">
        {selectedIds.size} selected
      </span>
      <Select onValueChange={handleStatusChange}>
        <SelectTrigger className="h-7 w-[140px] text-xs">
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

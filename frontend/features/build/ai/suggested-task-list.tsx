"use client";

import { memo, useState, useMemo, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useTickets, useCreateTicket } from "@/hooks/api/build/tickets";
import type { AiSeverity } from "@/types/projects/ai";
import type { TicketPriority } from "@/types/projects/shared";

export interface SuggestedTaskListItem {
  title: string;
  priority: AiSeverity;
  badge?: string;
  group?: string;
}

interface SuggestedTaskListProps {
  items: SuggestedTaskListItem[];
  projectId: number;
}

const PRIORITY_MAP: Record<AiSeverity, TicketPriority> = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

function severityClasses(s: AiSeverity): string {
  if (s === "high") return "bg-status-danger-surface text-status-danger-ink border-status-danger-rule";
  if (s === "medium") return "bg-status-warning-surface text-status-warning-ink border-status-warning-rule";
  return "bg-muted text-muted-foreground border-border/70";
}

type TaskGroup = { label: string; indices: number[] };

interface TaskItemProps {
  task: SuggestedTaskListItem;
  idx: number;
  projectId: number;
  isChecked: boolean;
  onToggle: (idx: number) => void;
}

const TaskItem = memo(function TaskItem({ task, idx, projectId, isChecked, onToggle }: TaskItemProps) {
  const handleChange = useCallback(() => onToggle(idx), [idx, onToggle]);
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 transition-colors">
      <Checkbox
        id={`stl-task-${projectId}-${idx}`}
        checked={isChecked}
        onCheckedChange={handleChange}
        className="shrink-0"
      />
      <label
        htmlFor={`stl-task-${projectId}-${idx}`}
        className="flex-1 min-w-0 cursor-pointer"
      >
        <span className="text-label text-foreground block truncate">{task.title}</span>
        {task.badge && (
          <span className="text-dense text-muted-foreground">{task.badge}</span>
        )}
      </label>
      <span
        className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded border text-micro font-semibold uppercase tracking-wide ${severityClasses(task.priority)}`}
      >
        {task.priority}
      </span>
    </div>
  );
});

export function SuggestedTaskList({ items, projectId }: SuggestedTaskListProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  const { data: ticketsData } = useTickets(projectId, { limit: 100 });
  const createMutation = useCreateTicket();

  const existingTitles = useMemo(
    () => new Set((ticketsData?.data ?? []).map((t) => t.title.toLowerCase())),
    [ticketsData],
  );

  const groupedItems = useMemo<TaskGroup[]>(() => {
    const hasGroups = items.some((t) => t.group);
    if (!hasGroups) {
      return [{ label: "", indices: items.map((_, i) => i) }];
    }
    const seen = new Map<string, number[]>();
    items.forEach((t, i) => {
      const key = t.group ?? "";
      const bucket = seen.get(key) ?? [];
      bucket.push(i);
      seen.set(key, bucket);
    });
    return Array.from(seen.entries()).map(([label, indices]) => ({ label, indices }));
  }, [items]);

  const handleToggle = useCallback((idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelected((prev) =>
      prev.size === items.length ? new Set() : new Set(items.map((_, i) => i)),
    );
  }, [items]);

  const handleCreate = useCallback(async () => {
    const selectedItems = items.filter((_, i) => selected.has(i));
    const dupes = selectedItems.filter((t) => existingTitles.has(t.title.toLowerCase()));
    const toCreate = selectedItems.filter((t) => !existingTitles.has(t.title.toLowerCase()));

    if (dupes.length > 0) {
      toast.info(`Skipped ${dupes.length} duplicate title${dupes.length > 1 ? "s" : ""}.`);
    }
    if (toCreate.length === 0) return;

    setIsCreating(true);
    try {
      for (const task of toCreate) {
        await createMutation.mutateAsync({
          projectId,
          title: task.title,
          type: "TASK",
          priority: PRIORITY_MAP[task.priority],
        });
      }
      toast.success(`Created ${toCreate.length} task${toCreate.length > 1 ? "s" : ""}.`);
      setSelected(new Set());
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setIsCreating(false);
    }
  }, [items, selected, existingTitles, createMutation, projectId]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleSelectAll}
          className="text-dense text-muted-foreground hover:text-foreground transition-colors"
        >
          {selected.size === items.length ? "Deselect all" : "Select all"}
        </button>
        <p className="text-dense text-muted-foreground italic">
          Suggestions only — nothing is created until you click Create
        </p>
      </div>

      <div className="border border-border rounded-lg divide-y divide-border/60 overflow-hidden">
        {groupedItems.map(({ label, indices }) => (
          <div key={label || "__flat__"}>
            {label && (
              <div className="px-3 py-1.5 bg-muted/40">
                <p className="text-dense font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {label}
                </p>
              </div>
            )}
            {indices.map((idx) => {
              const task = items[idx];
              if (!task) return null;
              return (
                <TaskItem
                  key={idx}
                  task={task}
                  idx={idx}
                  projectId={projectId}
                  isChecked={selected.has(idx)}
                  onToggle={handleToggle}
                />
              );
            })}
          </div>
        ))}
      </div>

      <LoadingButton
        size="sm"
        onClick={handleCreate}
        disabled={selected.size === 0}
        isPending={isCreating}
        className="gap-1.5 text-xs"
      >
        Create {selected.size > 0 ? selected.size : ""} selected task{selected.size !== 1 ? "s" : ""}
      </LoadingButton>
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecordList, type RecordValue } from "@/components/renderer";
import type { RecordLayout } from "@/lib/renderer/layout";
import type { DensityMode } from "@/lib/design-tokens";
import { type TaskBucket } from "@/hooks/api/tasks";
import { cn } from "@/lib/utils";

const BUCKET_CONFIG: Record<TaskBucket, { label: string; badgeClass: string }> = {
  OVERDUE: {
    label: "Overdue",
    badgeClass: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  },
  TODAY: {
    label: "Today",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
  },
  THIS_WEEK: {
    label: "This Week",
    badgeClass: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  },
  UPCOMING: {
    label: "Upcoming",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
  },
  NO_DATE: {
    label: "No Date",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
};

const DEFAULT_OPEN_BUCKETS: TaskBucket[] = ["OVERDUE", "TODAY"];

interface TaskCompleteCheckboxProps {
  taskId: number;
  completed: boolean;
  onComplete: (taskId: number) => void;
}

function TaskCompleteCheckbox({ taskId, completed, onComplete }: TaskCompleteCheckboxProps) {
  const handleChange = useCallback(() => onComplete(taskId), [onComplete, taskId]);

  return (
    <Checkbox
      checked={completed}
      disabled={completed}
      onCheckedChange={handleChange}
      aria-label={completed ? "Task completed" : "Mark task complete"}
    />
  );
}

interface TaskRowActionsProps {
  taskId: number;
  onEdit: (taskId: number) => void;
  onDelete: (taskId: number) => void;
}

function TaskRowActions({ taskId, onEdit, onDelete }: TaskRowActionsProps) {
  const handleEdit = useCallback(() => onEdit(taskId), [onEdit, taskId]);
  const handleDelete = useCallback(() => onDelete(taskId), [onDelete, taskId]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AnimatedIconButton
          icon={EllipsisIcon}
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label="Task actions"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={handleEdit} className="gap-2">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleDelete} className="gap-2">
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface TaskBucketSectionProps {
  bucket: TaskBucket;
  layout: RecordLayout;
  rows: RecordValue[];
  density: DensityMode;
  onComplete: (taskId: number) => void;
  onEdit: (taskId: number) => void;
  onDelete: (taskId: number) => void;
}

/**
 * One bucket of the queue.
 *
 * The rows are not drawn here. The columns, the status and urgency badges, the
 * link to whatever the task is attached to, the assignee's name and the mobile
 * card all come from `TASK_LAYOUT`; what is left is the collapsible header, the
 * tick that closes a task, and the menu that edits or deletes one — the two
 * controls the description deliberately does not carry, because what a row can
 * do depends on the caller rather than on what a task is.
 */
export function TaskBucketSection({
  bucket,
  layout,
  rows,
  density,
  onComplete,
  onEdit,
  onDelete,
}: TaskBucketSectionProps) {
  const [isOpen, setIsOpen] = useState(() => DEFAULT_OPEN_BUCKETS.includes(bucket));
  const shouldReduceMotion = useReducedMotion();
  const config = BUCKET_CONFIG[bucket];

  const handleToggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const renderLeading = useCallback(
    (row: RecordValue) => (
      <TaskCompleteCheckbox
        taskId={Number(row.id)}
        completed={row.status === "completed"}
        onComplete={onComplete}
      />
    ),
    [onComplete],
  );

  const renderActions = useCallback(
    (row: RecordValue) => (
      <TaskRowActions taskId={Number(row.id)} onEdit={onEdit} onDelete={onDelete} />
    ),
    [onEdit, onDelete],
  );

  if (rows.length === 0) return null;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        className="flex items-center gap-2 w-full px-1 py-1.5 rounded hover:bg-muted/30 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="text-xs font-semibold text-foreground">{config.label}</span>
        <span
          className={cn(
            "text-micro font-medium px-1.5 py-0.5 rounded-full border tabular-nums",
            config.badgeClass,
          )}
        >
          {rows.length}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="bucket-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: "easeOut" }}
          >
            <RecordList
              layout={layout}
              rows={rows}
              getRowKey={(row) => String(row.id)}
              leading={renderLeading}
              actions={renderActions}
              density={density}
              minWidth="1000px"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

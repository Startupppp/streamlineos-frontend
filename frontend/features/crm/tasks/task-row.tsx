"use client";

import { useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { format, isToday, isPast } from "date-fns";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { type Task, type TaskEntityType } from "@/hooks/api/tasks";
import { TaskTypeIcon } from "./task-type-icon";

const ENTITY_PATHS: Record<TaskEntityType, string> = {
  LEAD: "/crm/leads",
  DEAL: "/crm/deals",
  CONTACT: "/crm/contacts",
  PROJECT: "/projects/all",
};

const ENTITY_LABELS: Record<TaskEntityType, string> = {
  LEAD: "Lead",
  DEAL: "Deal",
  CONTACT: "Contact",
  PROJECT: "Project",
};

interface TaskRowProps {
  task: Task;
  isOptimisticallyCompleted: boolean;
  onComplete: (taskId: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  index: number;
}

function formatDueDate(dueDate: string): string {
  const date = new Date(dueDate);
  if (isToday(date)) return "Today";
  return format(date, "MMM d");
}

function getDueDateClass(dueDate: string | null, status: string): string {
  if (!dueDate) return "text-muted-foreground";
  if (status === "completed") return "text-muted-foreground";
  const date = new Date(dueDate);
  if (isPast(date) && !isToday(date)) return "text-red-500";
  if (isToday(date)) return "text-amber-600";
  return "text-muted-foreground";
}

export function TaskRow({
  task,
  isOptimisticallyCompleted,
  onComplete,
  onEdit,
  onDelete,
  index,
}: TaskRowProps) {
  const shouldReduceMotion = useReducedMotion();
  const isCompleted = task.status === "completed" || isOptimisticallyCompleted;
  const isOverdue =
    task.dueDate != null &&
    isPast(new Date(task.dueDate)) &&
    !isToday(new Date(task.dueDate)) &&
    !isCompleted;

  const handleComplete = useCallback(() => onComplete(task.id), [onComplete, task.id]);
  const handleEdit = useCallback(() => onEdit(task), [onEdit, task]);
  const handleDelete = useCallback(() => onDelete(task.id), [onDelete, task.id]);

  const assigneeInitials = task.assigneeId
    ? task.assigneeId.slice(0, 2).toUpperCase()
    : null;

  const motionProps = shouldReduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
    : { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.15, delay: index * 0.03 } };

  return (
    <motion.div
      {...motionProps}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors group",
        isOverdue && "border-l-2 border-l-red-400 pl-2.5",
      )}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={handleComplete}
        disabled={isCompleted}
        className="shrink-0"
      />

      <TaskTypeIcon
        type={task.type}
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          isCompleted ? "text-muted-foreground/40" : "text-muted-foreground",
        )}
      />

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm truncate",
            isCompleted && "line-through text-muted-foreground",
          )}
        >
          {task.title}
        </p>
        {task.entityType && task.entityId != null && (
          <Link
            href={`${ENTITY_PATHS[task.entityType]}/${task.entityId}`}
            className="text-[11px] text-primary hover:underline truncate"
          >
            {ENTITY_LABELS[task.entityType]} #{task.entityId}
          </Link>
        )}
      </div>

      {task.dueDate && (
        <span
          className={cn(
            "text-[11px] shrink-0 tabular-nums",
            getDueDateClass(task.dueDate, task.status),
          )}
        >
          {formatDueDate(task.dueDate)}
        </span>
      )}

      {assigneeInitials && (
        <Avatar className="h-5 w-5 shrink-0">
          <AvatarImage src={undefined} />
          <AvatarFallback className="text-[9px]">{assigneeInitials}</AvatarFallback>
        </Avatar>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Task actions"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted/50"
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={handleEdit} className="text-xs gap-2">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive"
            onClick={handleDelete} className="text-xs gap-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}

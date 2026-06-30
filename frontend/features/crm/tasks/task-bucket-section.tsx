"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Task, type TaskBucket } from "@/hooks/api/tasks";
import { TaskRow } from "./task-row";

const BUCKET_CONFIG: Record<
  TaskBucket,
  { label: string; badgeClass: string; borderClass: string }
> = {
  OVERDUE: {
    label: "Overdue",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    borderClass: "border-l-red-400",
  },
  TODAY: {
    label: "Today",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    borderClass: "border-l-blue-400",
  },
  THIS_WEEK: {
    label: "This Week",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    borderClass: "border-l-amber-400",
  },
  UPCOMING: {
    label: "Upcoming",
    badgeClass: "bg-violet-100 text-violet-700 border-violet-200",
    borderClass: "border-l-violet-400",
  },
  NO_DATE: {
    label: "No Date",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    borderClass: "border-l-slate-300",
  },
};

const DEFAULT_OPEN_BUCKETS: TaskBucket[] = ["OVERDUE", "TODAY"];

interface TaskBucketSectionProps {
  bucket: TaskBucket;
  tasks: Task[];
  optimisticCompletedIds: Set<number>;
  onComplete: (taskId: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
}

export function TaskBucketSection({
  bucket,
  tasks,
  optimisticCompletedIds,
  onComplete,
  onEdit,
  onDelete,
}: TaskBucketSectionProps) {
  const [isOpen, setIsOpen] = useState(() => DEFAULT_OPEN_BUCKETS.includes(bucket));
  const config = BUCKET_CONFIG[bucket];

  const handleToggle = useCallback(() => setIsOpen((prev) => !prev), []);

  if (tasks.length === 0) return null;

  return (
    <div className="space-y-0.5">
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 w-full px-1 py-1.5 rounded hover:bg-slate-50 transition-colors group"
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        )}
        <span className="text-xs font-semibold text-slate-700">{config.label}</span>
        <span
          className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
            config.badgeClass,
          )}
        >
          {tasks.length}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="bucket-content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 pt-0.5">
              {tasks.map((task, idx) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isOptimisticallyCompleted={optimisticCompletedIds.has(task.id)}
                  onComplete={onComplete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  index={idx}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

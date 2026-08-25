"use client";

import { useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Plus, CheckCircle2, Clock, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { TaskTypeIcon } from "@/features/crm/tasks/task-type-icon";
import { useTasks } from "@/hooks/api/tasks";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  completed: { icon: CheckCircle2, color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  pending: { icon: Clock, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-500/10" },
  cancelled: { icon: XCircle, color: "text-muted-foreground", bg: "bg-muted" },
} as const;

interface ContactTimelineProps {
  contactId: number;
  onLogActivity: () => void;
}

export function ContactTimeline({ contactId, onLogActivity }: ContactTimelineProps) {
  const { data, isLoading } = useTasks({
    entityType: "CONTACT",
    entityId: contactId,
    limit: 20,
  });

  const handleLogActivity = useCallback(() => onLogActivity(), [onLogActivity]);

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="px-4 py-3 border-b">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="px-4 py-3 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const tasks = data?.tasks ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: 0.04 }}
    >
      <Card className="shadow-sm">
        <CardHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Activity Timeline</CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs h-7"
            onClick={handleLogActivity}
          >
            <Plus className="h-3 w-3" />
            Log Activity
          </Button>
        </CardHeader>
        <CardContent className="px-4 py-3">
          {tasks.length === 0 ? (
            <EmptyState
              illustration={<EmptyActivityIllustration />}
              title="No activities yet"
              description="Log a call, email, or meeting to get started."
              compact
            />
          ) : (
            <ol className="relative border-l border-border/60 ml-2 space-y-4">
              {tasks.map((task, idx) => {
                const config = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
                const StatusIcon = config.icon;
                return (
                  <motion.li
                    key={task.id}
                    className="ml-4"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.18, delay: idx * 0.04 }}
                  >
                    <span
                      className={cn(
                        "absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-background",
                        config.bg,
                      )}
                    >
                      <TaskTypeIcon type={task.type} className={cn("h-3 w-3", config.color)} />
                    </span>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <TruncatedText text={task.title} className="text-xs font-medium text-foreground" />
                        {task.notes && (
                          <p className="text-dense text-muted-foreground mt-0.5 line-clamp-2">
                            {task.notes}
                          </p>
                        )}
                        <time className="text-micro text-muted-foreground">
                          {task.createdAt
                            ? formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })
                            : "—"}
                        </time>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge
                          variant="secondary"
                          className={cn("text-[9px] px-1.5 py-0 h-4 capitalize border-0", config.bg, config.color)}
                        >
                          <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

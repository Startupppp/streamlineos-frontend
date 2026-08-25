"use client";

import { useCallback } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  CheckCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { ActivityTypeBadge } from "./activity-type-badge";
import { useCompleteCrmActivity } from "@/hooks/api/crm/crm-activities";
import type { CrmActivity, CrmActivityEntityType } from "@/hooks/api/crm/crm-activities";
import { toast } from "sonner";
import { format, isPast, isToday } from "date-fns";
import { getErrorMessage } from "@/lib/get-error-message";

const ENTITY_PATHS: Record<CrmActivityEntityType, string> = {
  LEAD:    "/crm/leads",
  DEAL:    "/crm/deals",
  CONTACT: "/crm/contacts",
};

const ENTITY_LABELS: Record<CrmActivityEntityType, string> = {
  LEAD:    "Lead",
  DEAL:    "Deal",
  CONTACT: "Contact",
};

type StatusConfig = {
  label: string;
  color: string;
  bg: string;
  icon: React.ComponentType<{ className?: string }>;
};

function getStatusConfig(activity: CrmActivity): StatusConfig {
  if (activity.status === "completed") {
    return { label: "Completed", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2 };
  }
  if (activity.status === "cancelled") {
    return { label: "Cancelled", color: "text-muted-foreground", bg: "bg-muted", icon: XCircle };
  }
  if (
    activity.dueDate &&
    isPast(new Date(activity.dueDate)) &&
    !isToday(new Date(activity.dueDate))
  ) {
    return { label: "Overdue", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", icon: XCircle };
  }
  return { label: "Pending", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", icon: Clock };
}

interface ActivityCardProps {
  activity: CrmActivity;
  index: number;
}

export function ActivityCard({ activity, index }: ActivityCardProps) {
  const complete = useCompleteCrmActivity();
  const shouldReduceMotion = useReducedMotion();
  const statusCfg = getStatusConfig(activity);
  const StatusIcon = statusCfg.icon;

  const handleComplete = useCallback(() => {
    complete.mutate(activity.id, {
      onSuccess: () => toast.success("Activity marked as complete"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [activity.id, complete]);

  const entityPath =
    activity.entityType && activity.entityId
      ? `${ENTITY_PATHS[activity.entityType]}/${activity.entityId}`
      : null;

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={
        shouldReduceMotion
          ? { duration: 0.15 }
          : { duration: 0.22, ease: "easeOut", delay: Math.min(index * 0.05, 0.4) }
      }
      className="bg-card rounded-xl border border-border shadow-sm p-4 hover:shadow-md transition-shadow duration-150 group"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="shrink-0 mt-0.5">
          <ActivityTypeBadge type={activity.type} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <TruncatedText text={activity.title} className="text-sm font-semibold text-foreground max-w-sm" />
            <Badge
              className={cn(
                "text-micro border-0 gap-1 font-medium shrink-0",
                statusCfg.bg,
                statusCfg.color,
              )}
            >
              <StatusIcon className="h-2.5 w-2.5" />
              {statusCfg.label}
            </Badge>
          </div>

          {activity.notes && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {activity.notes}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {entityPath && activity.entityType && (
              <Link
                href={entityPath}
                className="inline-flex items-center gap-1 text-micro text-primary hover:text-primary/80 font-medium transition-colors"
              >
                {ENTITY_LABELS[activity.entityType]}
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            )}

            {activity.dueDate && (
              <span className="text-micro text-muted-foreground tabular-nums">
                Due {format(new Date(activity.dueDate), "MMM d, yyyy")}
              </span>
            )}

            {activity.completedAt && (
              <span className="text-micro text-emerald-600 dark:text-emerald-400 tabular-nums">
                Completed {format(new Date(activity.completedAt), "MMM d, yyyy")}
              </span>
            )}

            {activity.createdAt && (
              <span className="text-micro text-muted-foreground/60 tabular-nums">
                Created {format(new Date(activity.createdAt), "MMM d")}
              </span>
            )}
          </div>
        </div>

        {activity.status === "pending" && (
          <motion.div
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          >
            <LoadingButton
              variant="ghost"
              size="sm"
              onClick={handleComplete}
              isPending={complete.isPending}
              className="px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Done
            </LoadingButton>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

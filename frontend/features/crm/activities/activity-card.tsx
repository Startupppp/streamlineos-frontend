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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ActivityTypeBadge } from "./activity-type-badge";
import { useCompleteCrmActivity } from "@/hooks/api/crm/crm-activities";
import type { CrmActivity, CrmActivityEntityType } from "@/hooks/api/crm/crm-activities";
import { toast } from "sonner";
import { format, isPast, isToday } from "date-fns";

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
    return { label: "Completed", color: "text-emerald-600", bg: "bg-emerald-500/10", icon: CheckCircle2 };
  }
  if (activity.status === "cancelled") {
    return { label: "Cancelled", color: "text-slate-500", bg: "bg-slate-500/10", icon: XCircle };
  }
  if (
    activity.dueDate &&
    isPast(new Date(activity.dueDate)) &&
    !isToday(new Date(activity.dueDate))
  ) {
    return { label: "Overdue", color: "text-red-600", bg: "bg-red-500/10", icon: XCircle };
  }
  return { label: "Pending", color: "text-amber-600", bg: "bg-amber-500/10", icon: Clock };
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
      onError: (err) => toast.error(err.message),
    });
  }, [activity.id, complete]);

  const entityPath =
    activity.entityType && activity.entityId
      ? `${ENTITY_PATHS[activity.entityType]}/${activity.entityId}`
      : null;

  const motionProps = shouldReduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.22, ease: "easeOut", delay: Math.min(index * 0.05, 0.4) },
      };

  return (
    <motion.div
      {...motionProps}
      className="bg-card rounded-lg border border-border shadow-sm p-4 hover:shadow-md transition-shadow duration-150 group"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="shrink-0 mt-0.5">
          <ActivityTypeBadge type={activity.type} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate max-w-sm">
              {activity.title}
            </p>
            <Badge
              className={cn(
                "text-[10px] border-0 gap-1 font-medium shrink-0",
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
                className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                {ENTITY_LABELS[activity.entityType]} #{activity.entityId}
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            )}

            {activity.dueDate && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                Due {format(new Date(activity.dueDate), "MMM d, yyyy")}
              </span>
            )}

            {activity.completedAt && (
              <span className="text-[10px] text-emerald-600 tabular-nums">
                Completed {format(new Date(activity.completedAt), "MMM d, yyyy")}
              </span>
            )}

            {activity.createdAt && (
              <span className="text-[10px] text-muted-foreground/60 tabular-nums">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleComplete}
              disabled={complete.isPending}
              className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Done
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

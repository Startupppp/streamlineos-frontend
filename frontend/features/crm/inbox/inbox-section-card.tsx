"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Mail,
  ShieldAlert,
  TrendingDown,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { format, isPast, formatDistanceToNowStrict } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import type { CrmInboxItem } from "@/types/crm";
import { SnoozePopover } from "./snooze-popover";

const SECTION_LABELS: Record<string, string> = {
  dueTasks: "Due Today",
  overdueTasks: "Overdue",
  followUpsDue: "Follow-ups Due",
  newReplies: "New Replies",
  meetingsToday: "Meetings Today",
  slaRisk: "SLA Risk",
  stuckDeals: "Stuck Deals",
  newlyAssigned: "Newly Assigned",
};

const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dueTasks: Clock,
  overdueTasks: AlertCircle,
  followUpsDue: UserCheck,
  newReplies: Mail,
  meetingsToday: Calendar,
  slaRisk: ShieldAlert,
  stuckDeals: TrendingDown,
  newlyAssigned: UserPlus,
};

function entityHref(item: CrmInboxItem): string {
  if (item.entityType === "lead") return `/crm/leads/${item.entityId}`;
  if (item.entityType === "deal") return `/crm/deals/${item.entityId}`;
  return "/crm/tasks";
}

function DueChip({ dueAt }: { dueAt: string | null }) {
  if (!dueAt) return null;
  const date = new Date(dueAt);
  const overdue = isPast(date);
  if (overdue) {
    return (
      <span className="text-dense text-status-danger-ink shrink-0">
        {formatDistanceToNowStrict(date, { addSuffix: true })}
      </span>
    );
  }
  return (
    <span className="text-dense text-muted-foreground shrink-0">
      {format(date, "MMM d, h:mm a")}
    </span>
  );
}

/**
 * Mirrors `InboxSectionCard`'s box exactly — same shell, a 32px header row and
 * the same 1px divider over a 40px body — so the section list is laid out at
 * its real size before the items land. Rendering the card itself with no items
 * instead painted eight "All clear" sections and then reflowed the stack when
 * the read resolved: on the mobile profile one section grew 75px -> 355px and
 * pushed the five below it down 280px, which was the whole of this route's
 * 0.109 CLS.
 */
export function InboxSectionCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex h-8 items-center gap-2.5 px-3">
        <Skeleton className="h-3.5 w-3.5 shrink-0 rounded-sm" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="border-t border-border/50">
        <div className="flex h-10 items-center px-3">
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

interface InboxSectionCardProps {
  sectionKey: string;
  items: CrmInboxItem[];
  total: number;
  onComplete: (taskId: number) => void;
  onSnooze: (taskId: number, until: string) => void;
  isSnoozePending: boolean;
  isCompletePending: boolean;
}

export function InboxSectionCard({
  sectionKey,
  items,
  total,
  onComplete,
  onSnooze,
  isSnoozePending,
  isCompletePending,
}: InboxSectionCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const Icon = SECTION_ICONS[sectionKey] ?? Clock;
  const label = SECTION_LABELS[sectionKey] ?? sectionKey;

  const handleToggle = useCallback(() => setIsOpen((v) => !v), []);
  const handleComplete = useCallback(
    (taskId: number) => () => onComplete(taskId),
    [onComplete],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-muted/30 transition-colors text-left"
      >
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-foreground flex-1">{label}</span>
        {total > 0 && (
          <Badge className="h-4 min-w-[1.25rem] px-1 text-micro bg-primary/10 text-foreground border-0">
            {total}
          </Badge>
        )}
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-border/50">
          {items.length === 0 ? (
            <div className="px-3 py-2">
              <span className="text-xs text-muted-foreground italic">All clear</span>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-2 px-3 h-8 hover:bg-muted/20 transition-colors",
                  "border-b border-border/30 last:border-b-0",
                )}
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Link
                  href={entityHref(item)}
                  className="text-xs font-medium text-foreground flex-1 hover:text-primary transition-colors"
                >
                  <TruncatedText text={item.title} />
                </Link>
                <DueChip dueAt={item.dueAt} />
                {item.entityType === "task" ? (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7"
                      onClick={handleComplete(item.id)}
                      disabled={isCompletePending}
                      aria-label="Complete task"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <SnoozePopover
                      taskId={item.id}
                      onSnooze={onSnooze}
                      isPending={isSnoozePending}
                    />
                  </div>
                ) : (
                  <Link href={entityHref(item)}>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}

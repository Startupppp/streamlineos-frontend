"use client";

import { memo, useDeferredValue, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Trash2,
} from "lucide-react";

import type { MyWorkItem } from "@/types/projects/my-work";

import { cn } from "@/lib/utils";
import { PriorityBadge } from "@/features/build/shared/priority-badge";
import { StatusBadge } from "@/components/shared/ticket-status-badge";
import { PmPanel, PM_ROW } from "@/components/pm-chrome";
import { FLEX_TITLE_SLOT, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { getMyWorkTicketHref } from "@/features/build/ticket-details/build-ticket-detail-url";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import { formatTicketKey } from "@/components/shared/format-ticket-key";
import { formatCalendarDate } from "@/lib/date-utils";
import { getUserDisplayName } from "@/lib/person-display";

export type DueBucket = "overdue" | "today" | "upcoming" | "none";

interface WorkRowShape {
  id: number;
  projectId: number | null;
  projectKey: string;
  projectName: string;
  ticketNumber?: number;
  title: string;
  status: string;
  priority: string | null;
  type: string;
  dueDate: string | null;
  assignee?: MyWorkItem["assignee"];
}

export const BUCKET_ORDER: DueBucket[] = [
  "overdue",
  "today",
  "upcoming",
  "none",
];

export const BUCKET_CONFIG: Record<
  DueBucket,
  {
    label: string;
    icon: ComponentType<{ className?: string }>;
    iconClass: string;
  }
> = {
  overdue: {
    label: "Overdue",
    icon: AlertCircle,
    iconClass: "text-status-danger-ink",
  },
  today: {
    label: "Due Today",
    icon: CalendarClock,
    iconClass: "text-status-warning-ink",
  },
  upcoming: { label: "Upcoming", icon: Clock, iconClass: "text-primary" },
  none: {
    label: "No Due Date",
    icon: CheckCircle2,
    iconClass: "text-muted-foreground",
  },
};

export const BUCKET_SYNC_LIMIT = 20;

export const WorkItemRow = memo(function WorkItemRow({
  item,
  returnHref = "/build/my-work",
  isBlocked,
  isOverdue,
  density = "comfortable",
  onDelete,
}: {
  item: WorkRowShape;
  returnHref?: string;
  index?: number;
  isBlocked?: boolean;
  isOverdue?: boolean;
  density?: "compact" | "comfortable";
  onDelete?: () => void;
}) {
  const router = useRouter();
  const requestLeave = useNavigationLeave();

  if (item.projectId === null) {
    function handleDeleteClick() {
      onDelete?.();
    }

    return (
      <div className={cn(PM_ROW, "gap-2.5 opacity-60")} data-unavailable>
        <PriorityBadge priority={item.priority} size="sm" />
        <div className={FLEX_TITLE_SLOT}>
          <p
            className={cn(
              TEXT_ONE_LINE,
              "text-label font-medium leading-tight text-muted-foreground",
            )}
            title={item.title}
          >
            {item.title}
          </p>
          <span className="text-micro text-status-danger-ink">
            Unavailable — project was deleted
          </span>
        </div>
        <button
          type="button"
          onClick={handleDeleteClick}
          aria-label="Delete draft"
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-status-danger-ink"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const href =
    item.ticketNumber != null
      ? getMyWorkTicketHref(
          item.projectId,
          item.projectKey,
          item.ticketNumber,
          returnHref,
        )
      : `/build/${item.projectId}`;

  function handlePrimaryClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
      return;
    e.preventDefault();
    requestLeave(() => router.push(href, { scroll: false }));
  }

  return (
    <div
      className={cn(
        "transition-transform duration-150 hover:translate-x-0.5",
        isBlocked && "border-l-2 border-status-danger",
        isOverdue && "border-l-2 border-status-warning",
      )}
      data-blocked={isBlocked ? true : undefined}
      data-overdue={isOverdue ? true : undefined}
    >
      <Link
        href={href}
        onClick={handlePrimaryClick}
        className={cn(PM_ROW, "flex-wrap gap-x-3 gap-y-1.5 md:flex-nowrap")}
      >
        <PriorityBadge priority={item.priority} size="sm" />
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          {formatTicketKey(item.projectKey, item.ticketNumber)}
        </span>
        <div className={cn(FLEX_TITLE_SLOT, "basis-1/2 md:basis-0")}>
          <p
            className={cn(
              TEXT_ONE_LINE,
              "text-label font-medium leading-tight text-foreground transition-colors group-hover:text-primary",
            )}
            title={item.title}
          >
            {item.title}
          </p>
        </div>
        <span
          className="max-w-32 truncate text-xs text-muted-foreground"
          title={item.projectName}
        >
          {item.projectName}
        </span>
        {density !== "compact" ? (
          <span
            className="hidden shrink-0 text-micro text-muted-foreground lg:inline"
            data-optional-fields
          >
            {item.type}
          </span>
        ) : null}
        {item.dueDate ? (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            Due {formatCalendarDate(item.dueDate)}
          </span>
        ) : null}
        <span
          className="max-w-24 truncate text-xs text-muted-foreground"
          title={
            item.assignee ? getUserDisplayName(item.assignee) : "Unassigned"
          }
        >
          {item.assignee ? getUserDisplayName(item.assignee) : "Unassigned"}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusBadge status={item.status} compact />
          <ChevronRight className="h-3 w-3 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100" />
        </div>
      </Link>
    </div>
  );
});

export const BucketSection = memo(function BucketSection({
  bucket,
  items,
  returnHref = "/build/my-work",
}: {
  bucket: DueBucket;
  items: MyWorkItem[];
  returnHref?: string;
}) {
  const cfg = BUCKET_CONFIG[bucket];
  const deferredItems = useDeferredValue(items);

  return (
    <PmPanel>
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/20 px-3 py-2">
        <cfg.icon className={cn("h-3.5 w-3.5 shrink-0", cfg.iconClass)} />
        <span className="text-dense font-medium uppercase tracking-wider text-muted-foreground">
          {cfg.label}
        </span>
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-micro font-normal tabular-nums text-primary">
          {items.length}
        </span>
      </div>
      <div>
        {deferredItems.map((item) => (
          <WorkItemRow key={item.id} item={item} returnHref={returnHref} />
        ))}
      </div>
    </PmPanel>
  );
});

export function AllWorkListSkeleton() {
  return (
    <PmPanel className="p-2">
      <div className="space-y-1.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </PmPanel>
  );
}

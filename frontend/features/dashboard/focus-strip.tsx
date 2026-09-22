"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Bell,
  Mail,
  ClipboardList,
  CalendarClock,
  ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useFocusStrip,
  type AttentionItem,
  type AttentionPriority,
} from "./use-focus-strip";
import type { DashboardAccess } from "./use-dashboard-access";

const PRIORITY_CLASSES: Record<AttentionPriority, string> = {
  critical:
    "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  warning:
    "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  info: "bg-primary/5 text-primary border-primary/20",
};

type IconComponent = React.ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

const ITEM_ICONS: Record<string, IconComponent> = {
  approvals: ClipboardList,
  timesheet: ClipboardList,
  meetings: CalendarClock,
  notifications: Bell,
  mail: Mail,
};

interface FocusStripItemProps {
  item: AttentionItem;
}

function FocusStripItem({ item }: FocusStripItemProps) {
  const Icon: IconComponent = ITEM_ICONS[item.id] ?? Bell;
  const classes = PRIORITY_CLASSES[item.priority];

  return (
    <Link
      href={item.href}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${classes}`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{item.label}</span>
      <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
    </Link>
  );
}

interface FocusStripProps {
  access: DashboardAccess;
}

export function FocusStrip({ access }: FocusStripProps) {
  const { items, isLoading } = useFocusStrip(access);

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2"
        role="status"
        aria-label="Loading your attention items"
      >
        <Skeleton className="h-7 w-36 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-7 w-32 rounded-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="flex items-center gap-2 text-xs text-muted-foreground"
        aria-label="No items need your attention"
      >
        <CheckCircle2
          className="h-3.5 w-3.5 shrink-0 text-status-success-ink"
          aria-hidden="true"
        />
        <span>You&apos;re all caught up</span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Items needing your attention"
    >
      {items.map((item) => (
        <FocusStripItem key={item.id} item={item} />
      ))}
    </div>
  );
}

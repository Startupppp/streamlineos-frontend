"use client";

import Link from "next/link";
import { HrIconWell, HrStatusBadge } from "@/features/hr/shared/hr-ui";
import {
  kindIcon,
  kindTone,
  sourceBadgeLabel,
  ageBadge,
  primaryText,
  secondaryText,
  type ActivityRow,
} from "./activity-rows";

export function ActivityRowItem({ row }: { row: ActivityRow }) {
  const Icon = kindIcon(row);
  const tone = kindTone(row);
  const age = ageBadge(row);
  const primary = primaryText(row);
  const secondary = secondaryText(row);
  const sourceLabel = sourceBadgeLabel(row);
  const isUrgent =
    row.kind === "ops" && (row.slaBreached || row.urgency >= 30);

  return (
    <Link
      href={row.href}
      className="group flex items-center gap-2.5 px-3.5 py-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <HrIconWell tone={tone} size="sm">
        <Icon className="h-3.5 w-3.5" />
      </HrIconWell>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{primary}</p>
          <span className="shrink-0 text-[9px] font-medium px-1.5 py-px rounded-full bg-muted text-muted-foreground">
            {sourceLabel}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{secondary}</p>
      </div>
      {age && (
        <HrStatusBadge
          status={isUrgent ? "rejected" : "pending"}
          label={age}
          className="shrink-0 text-[9px]"
        />
      )}
    </Link>
  );
}

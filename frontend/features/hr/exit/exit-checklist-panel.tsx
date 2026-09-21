"use client";

import Link from "next/link";
import { memo, useState } from "react";
import { ArrowUpRight, CalendarClock, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { useCan } from "@/hooks/api/access";
import { formatShortDate } from "@/lib/date-utils";
import { getUserDisplayName } from "@/lib/person-display";
import { cn } from "@/lib/utils";
import type { ExitChecklistItem, ResignationDetail } from "@/hooks/api/hr/exit";
import { ExitChecklistItemDialog } from "./exit-checklist-item-dialog";
import {
  EXIT_CHECKLIST_KIND_ICONS,
  EXIT_CHECKLIST_STATUS_LABELS,
  EXIT_CHECKLIST_STATUS_TONES,
  exitChecklistSurface,
  isExitChecklistOverdue,
} from "./exit-checklist-surfaces";

interface ExitChecklistPanelProps {
  resignationId: number;
  checklist: ResignationDetail["checklist"];
  exitStatus: string;
  canReassign: boolean;
}

interface ChecklistRowProps {
  item: ExitChecklistItem;
  today: string;
  frozen: boolean;
  onEdit: (item: ExitChecklistItem) => void;
}

function ownerLabel(owner: ExitChecklistItem["owner"]): string {
  return owner.type === "member" ? getUserDisplayName(owner) : owner.label;
}

function SurfaceLink({ item }: { item: ExitChecklistItem }) {
  const surface = exitChecklistSurface(item.kind);
  const allowed = useCan(surface?.permission ?? "hr:exit:view");
  if (!surface || !allowed) return null;
  return (
    <Button asChild variant="ghost" size="sm" className="gap-1">
      <Link href={surface.href}>
        {surface.label}
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </Button>
  );
}

const ChecklistRow = memo(function ChecklistRow({ item, today, frozen, onEdit }: ChecklistRowProps) {
  const Icon = EXIT_CHECKLIST_KIND_ICONS[item.kind];
  const overdue = isExitChecklistOverdue(item.status, item.dueDate, today);

  function handleEdit() {
    onEdit(item);
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start">
      <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md", item.status === "DONE" ? "bg-status-success-surface text-status-success-ink" : "bg-muted text-muted-foreground")}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{item.title}</p>
          <SemanticBadge tone={overdue ? "danger" : EXIT_CHECKLIST_STATUS_TONES[item.status]} label={overdue ? "Overdue" : EXIT_CHECKLIST_STATUS_LABELS[item.status]} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-dense text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <UserRound className="h-3 w-3" />
            {ownerLabel(item.owner)}
          </span>
          {item.dueDate ? (
            <span className={cn("inline-flex items-center gap-1 tabular-nums", overdue && "font-medium text-status-danger-ink")}>
              <CalendarClock className="h-3 w-3" />
              Due {formatShortDate(item.dueDate)}
            </span>
          ) : null}
          {item.completedAt ? (
            <span className="tabular-nums">
              {item.status === "WAIVED" ? "Waived" : "Closed"} {formatShortDate(item.completedAt)}
              {item.completedBy?.name ? ` by ${item.completedBy.name}` : ""}
            </span>
          ) : null}
        </div>
        {item.evidence ? <p className="mt-1.5 text-dense text-foreground/80">{item.evidence}</p> : null}
        {item.notes ? <p className="mt-1 text-dense text-muted-foreground">{item.notes}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:self-center">
        <SurfaceLink item={item} />
        {item.viewerCanUpdate && !frozen ? (
          <Button type="button" variant={item.status === "PENDING" ? "outline" : "ghost"} size="sm" onClick={handleEdit}>
            {item.status === "PENDING" ? "Close item" : "Update"}
          </Button>
        ) : null}
      </div>
    </li>
  );
});

export function ExitChecklistPanel({ resignationId, checklist, exitStatus, canReassign }: ExitChecklistPanelProps) {
  const [editing, setEditing] = useState<ExitChecklistItem | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const frozen = exitStatus === "COMPLETED";

  function handleCloseDialog() {
    setEditing(null);
  }

  if (checklist.items.length === 0) {
    return (
      <EmptyState
        className="flex-1 min-h-0"
        title="No checklist yet"
        description="The offboarding checklist is created when the resignation receives final approval. Each item then carries an owner and a due date."
        compact
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <StatCardGrid cols={4}>
        <StatCard label="Open" value={checklist.summary.open} tone="amber" />
        <StatCard label="Overdue" value={checklist.summary.overdue} tone={checklist.summary.overdue > 0 ? "red" : "default"} />
        <StatCard label="Done" value={checklist.summary.done} tone="emerald" />
        <StatCard label="Not applicable" value={checklist.summary.waived} />
      </StatCardGrid>
      <ul className={cn(CONTENT_PANEL_SOLID, "divide-y divide-border/60 overflow-hidden")}>
        {checklist.items.map((item) => (
          <ChecklistRow key={item.id} item={item} today={today} frozen={frozen} onEdit={setEditing} />
        ))}
      </ul>
      <ExitChecklistItemDialog resignationId={resignationId} item={editing} canReassign={canReassign} onClose={handleCloseDialog} />
    </div>
  );
}

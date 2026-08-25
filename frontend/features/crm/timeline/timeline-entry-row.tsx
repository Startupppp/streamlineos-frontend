"use client";

import { Phone, Mail, CalendarDays, StickyNote, CheckSquare, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { formatTime } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import type { ActivityKind, TimelineEntry } from "@/types/crm/activities";

/** Surface, ink and rule together — the tone's three halves are always used as one. */
function tone(name: StatusTone): string {
  const classes = statusToneClasses(name);
  return cn(classes.surface, classes.ink, classes.rule);
}

const KIND_ICON: Record<ActivityKind, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: CalendarDays,
  note: StickyNote,
  task: CheckSquare,
};

const KIND_LABEL: Record<ActivityKind, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
  task: "Task",
};

/** Stated once — the timeline, the task list and the mobile card all need it. */
function isOverdue(entry: TimelineEntry): boolean {
  if (entry.kind !== "task" || entry.completedAt || !entry.dueAt) return false;
  return new Date(entry.dueAt).getTime() < Date.now();
}

function describe(entry: TimelineEntry): string {
  return entry.subject?.trim() || KIND_LABEL[entry.kind];
}

/** Who did it, in a reader's words. Never an identifier. */
function actorText(entry: TimelineEntry): string {
  if (entry.actorKind === "system") return entry.actorLabel ?? "The system";
  return entry.actorName ?? "A team member";
}

export interface TimelineEntryRowProps {
  entry: TimelineEntry;
  onComplete?: (activityId: string) => void;
  isCompleting?: boolean;
}

/**
 * One entry.
 *
 * The autonomous ones are marked rather than styled loudly: the PRD requires a
 * reader to see plainly which fields the system set, and a wall of highlighted
 * rows communicates less than a quiet, consistent mark on the ones that are.
 */
export function TimelineEntryRow({ entry, onComplete, isCompleting = false }: TimelineEntryRowProps) {
  const Icon = entry.actorKind === "system" ? Sparkles : KIND_ICON[entry.kind];
  const overdue = isOverdue(entry);
  const done = entry.kind === "task" && !!entry.completedAt;

  function handleComplete() {
    onComplete?.(entry.activityId);
  }

  return (
    <li className="flex min-w-0 gap-3">
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
          entry.actorKind === "system"
            ? tone("info")
            : "border-border bg-muted/50 text-muted-foreground",
        )}
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1 pb-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn("min-w-0 break-words text-sm font-medium", done && "line-through opacity-70")}>
            {describe(entry)}
          </span>

          <Badge variant="outline" className="h-5 shrink-0 px-2 py-0.5 text-micro">
            {KIND_LABEL[entry.kind]}
          </Badge>

          {entry.actorKind === "system" ? (
            <Badge
              variant="outline"
              className={cn("h-5 shrink-0 px-2 py-0.5 text-micro", tone("info"))}
            >
              Automatic
            </Badge>
          ) : null}

          {overdue ? (
            <Badge
              variant="outline"
              className={cn("h-5 shrink-0 px-2 py-0.5 text-micro", tone("danger"))}
            >
              Overdue
            </Badge>
          ) : null}
        </div>

        {entry.body ? (
          // Wrapped, not truncated: the ticket asks for the same information on a
          // phone with nothing silently cut off.
          <p className="min-w-0 whitespace-pre-wrap break-words text-label text-muted-foreground">
            {entry.body}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-dense text-muted-foreground">
          <span className="tabular-nums">{formatTime(entry.occurredAt)}</span>
          <span aria-hidden="true">·</span>
          <span className="min-w-0 break-words">{actorText(entry)}</span>
          {entry.dueAt && !done ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">Due {formatTime(entry.dueAt)}</span>
            </>
          ) : null}
        </div>

        {entry.kind === "task" && !done && onComplete ? (
          <LoadingButton
            size="sm"
            variant="outline"
            className="mt-1 w-fit"
            isPending={isCompleting}
            onClick={handleComplete}
          >
            Mark done
          </LoadingButton>
        ) : null}
      </div>
    </li>
  );
}

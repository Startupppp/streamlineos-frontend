"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Phone,
  Mail,
  CalendarDays,
  StickyNote,
  CheckSquare,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { CallAnalysisPanel } from "@/components/call-intelligence/call-analysis-panel";
import { callIntelligenceHref } from "@/components/call-intelligence/call-intelligence-href";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { formatTime } from "@/lib/format-utils";
import { formatShortDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import type { ActivityKind, TaskAnchorRef, TimelineEntry } from "@/types/crm/activities";
import { taskAnchorHref, taskAnchorLabel } from "./task-anchor";

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

function isOverdue(entry: TimelineEntry): boolean {
  if (entry.kind !== "task" || entry.completedAt || !entry.dueAt) return false;
  return new Date(entry.dueAt).getTime() < Date.now();
}

function describe(entry: TimelineEntry): string {
  return entry.subject?.trim() || KIND_LABEL[entry.kind];
}

function actorText(entry: TimelineEntry): string {
  if (entry.actorKind === "system") return entry.actorLabel ?? "The system";
  return entry.actorName ?? "A team member";
}

export interface TimelineEntryRowProps {
  entry: TimelineEntry;
  anchor?: TaskAnchorRef | null;
  withDates?: boolean;
  onComplete?: (activityId: string) => void;
  isCompleting?: boolean;
}

export function TimelineEntryRow({
  entry,
  anchor = null,
  withDates = false,
  onComplete,
  isCompleting = false,
}: TimelineEntryRowProps) {
  const stamp = (value: string): string =>
    withDates ? `${formatShortDate(value)}, ${formatTime(value)}` : formatTime(value);
  const Icon = entry.actorKind === "system" ? Sparkles : KIND_ICON[entry.kind];
  const overdue = isOverdue(entry);
  const done = entry.kind === "task" && !!entry.completedAt;

  const [analysisOpen, setAnalysisOpen] = useState(false);

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
          <p className="min-w-0 whitespace-pre-wrap break-words text-label text-muted-foreground">
            {entry.body}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-dense text-muted-foreground">
          {anchor ? (
            <>
              <Link
                href={taskAnchorHref(anchor)}
                className="min-w-0 break-words font-medium text-foreground hover:underline"
              >
                {taskAnchorLabel(anchor)}
              </Link>
              <span aria-hidden="true">·</span>
            </>
          ) : null}
          <span className="tabular-nums">{stamp(entry.occurredAt)}</span>
          <span aria-hidden="true">·</span>
          <span className="min-w-0 break-words">{actorText(entry)}</span>
          {entry.dueAt && !done ? (
            <>
              <span aria-hidden="true">·</span>
              <span className={cn("tabular-nums", overdue && "font-medium text-foreground")}>
                Due {stamp(entry.dueAt)}
              </span>
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

        {entry.kind === "call" ? (
          <div className="mt-1 flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="w-fit px-2 text-muted-foreground"
                aria-expanded={analysisOpen}
                onClick={() => setAnalysisOpen((open) => !open)}
              >
                {analysisOpen ? (
                  <ChevronDown className="mr-1 h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="mr-1 h-3.5 w-3.5" />
                )}
                Call analysis
              </Button>
              <Button size="sm" variant="ghost" className="w-fit px-2 text-muted-foreground" asChild>
                <Link href={callIntelligenceHref(entry.activityId)}>Open</Link>
              </Button>
            </div>
            {analysisOpen ? <CallAnalysisPanel activityId={entry.activityId} /> : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

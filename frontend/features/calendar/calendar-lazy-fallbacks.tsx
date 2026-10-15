"use client";

import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { formatEventDate, formatEventTimeRange } from "@/lib/date-utils";
import { EVENT_COLORS } from "./calendar-event-constants";

function agendaWhen(event: CalendarListItem): string {
  if (event.allDay)
    return `${event.time.kind === "date"
      ? formatEventDate(`${event.time.startDate}T12:00:00.000Z`, "UTC")
      : formatEventDate(event.start, event.timezone ?? "UTC")} · All day`;
  return formatEventTimeRange(event.start, event.end, event.timezone);
}

export function CalendarAgendaPreview({
  events,
  maxEvents = 6,
  onSelectEvent,
}: {
  events: CalendarListItem[];
  maxEvents?: number;
  onSelectEvent?: (event: CalendarListItem) => void;
}) {
  const upcoming = events
    .slice()
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, maxEvents);

  if (upcoming.length === 0)
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">No events in this period</p>
      </div>
    );

  return (
    <ScrollArea className="min-h-0 flex-1">
    <div className="flex flex-col gap-1.5 p-3">
      {upcoming.map((event) => (
        <button
          type="button"
          key={event.id}
          onClick={() => onSelectEvent?.(event)}
          disabled={!event.actions.view}
          className="flex w-full items-start gap-3 rounded-md border border-border/50 bg-card px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div
            className="mt-1 h-2 w-2 shrink-0 rounded-full"
            style={{
              backgroundColor: EVENT_COLORS[event.color ?? "blue"] ?? EVENT_COLORS.blue,
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {event.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {agendaWhen(event)}
            </p>
          </div>
        </button>
      ))}
    </div>
    </ScrollArea>
  );
}

export function CalendarSheetFallback({ label }: { label: string }) {
  return (
    <Sheet open>
      <SheetContent showCloseButton={false}>
        <SheetHeader>
          <SheetTitle className="sr-only">{label}</SheetTitle>
          <SheetDescription className="sr-only">Calendar panel is loading</SheetDescription>
        </SheetHeader>
        <div role="status" aria-live="polite" aria-label={label} className="flex flex-col gap-3">
          <Skeleton className="h-6 w-3/5" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function CalendarEventDetailFallback({ label }: { label: string }) {
  return (
    <Dialog open>
      <DialogContent className="gap-0 overflow-hidden p-0" showCloseButton={false}>
        <DialogHeader className="shrink-0 border-b px-5 py-4 text-left">
          <DialogTitle className="sr-only">{label}</DialogTitle>
          <DialogDescription className="sr-only">Event details are loading</DialogDescription>
          <div role="status" aria-live="polite" aria-label={label} className="space-y-2">
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-4 w-2/5" />
          </div>
        </DialogHeader>
        <div className="space-y-4 px-5 py-4" aria-hidden>
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CalendarLoadingStatus({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="inline-flex size-3.5 shrink-0 animate-spin motion-reduce:animate-none">
        <Image
          src="/logo.svg"
          alt=""
          width={14}
          height={14}
          className="size-3.5 rounded-sm"
        />
      </span>
      {label}
    </span>
  );
}

export function CalendarListFallback({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-0 flex-1 items-center justify-center"
    >
      <CalendarLoadingStatus label={label} />
    </div>
  );
}

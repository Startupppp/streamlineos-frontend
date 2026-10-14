"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarDays, ExternalLink, MapPin, Video } from "lucide-react";
import { formatEventDate, formatEventTimeRange } from "@/lib/date-utils";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BigCalEvent } from "./big-calendar-wrapper";

const DOCK_EASE = [0.22, 1, 0.36, 1] as const;

function JoinMeetingLink({ href }: { href: string }) {
  const reduceMotion = useReducedMotion() === true;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl bg-primary px-3 py-2.5 text-left text-primary-foreground shadow-xs transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transition-none"
    >
      {reduceMotion ? null : (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-1/3 bg-primary-foreground/20"
          initial={{ x: "-130%" }}
          animate={{ x: "340%" }}
          transition={{ duration: 0.85, ease: DOCK_EASE, delay: 0.12 }}
        />
      )}
      <motion.span
        aria-hidden
        className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15"
        initial={reduceMotion ? false : { scale: 0.7, rotate: -16 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 520, damping: 28 }
        }
      >
        <Video className="size-4" />
      </motion.span>
      <span className="relative min-w-0 flex-1">
        <span className="block text-sm font-medium">Join meeting</span>
        <span className="block text-xs font-normal text-primary-foreground">
          Opens in a new tab
        </span>
      </span>
      <ArrowRight className="relative size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" />
    </a>
  );
}

export type ExternalBigCalEvent = Omit<BigCalEvent, "resource"> & {
  resource?: NonNullable<BigCalEvent["resource"]> & { timezone?: string | null };
};

interface ExternalEventDetailSheetProps {
  event: ExternalBigCalEvent | null;
  onClose: () => void;
}

export function ExternalEventDetailSheet({ event, onClose }: ExternalEventDetailSheetProps) {
  return (
    <Sheet open={event !== null} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0 flex flex-col gap-0 overflow-hidden">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle className="text-base font-semibold leading-snug truncate">{event?.title ?? ""}</SheetTitle>
          {event?.resource?.accountEmail && (
            <Badge variant="secondary" className="w-fit text-micro truncate max-w-full">
              {event.resource.accountEmail}
            </Badge>
          )}
        </SheetHeader>
        {event && (
          <SheetBody className="px-5 py-4 space-y-3">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                {event.allDay
                  ? `${formatEventDate(event.start, "UTC")} · All day`
                  : formatEventTimeRange(event.start, event.end, event.resource?.timezone)}
              </span>
            </div>
            {event.resource?.location && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="break-all">{event.resource.location}</span>
              </div>
            )}
            <p className="text-dense text-muted-foreground">
              Read-only event from a connected account. Edit it in its own calendar.
            </p>
          </SheetBody>
        )}
        <SheetFooter className="flex-col items-stretch gap-2 bg-muted px-3 py-3">
          {event?.resource?.meetingUrl ? (
            <JoinMeetingLink href={event.resource.meetingUrl} />
          ) : null}
          <div className="grid gap-2">
            {event?.resource?.webLink ? (
              <Button variant="outline" size="sm" className="w-full" asChild>
                <a href={event.resource.webLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  Open in calendar
                </a>
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" className="w-full hover:bg-background" onClick={onClose}>
              Close
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

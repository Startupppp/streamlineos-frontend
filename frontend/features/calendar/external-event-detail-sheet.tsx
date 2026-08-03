"use client";

import { format } from "date-fns";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ExternalLink, MapPin, Video } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { BigCalEvent } from "./big-calendar-wrapper";

interface ExternalEventDetailSheetProps {
  event: BigCalEvent | null;
  onClose: () => void;
}

export function ExternalEventDetailSheet({ event, onClose }: ExternalEventDetailSheetProps) {
  return (
    <Sheet open={event !== null} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0 flex flex-col gap-0 overflow-hidden">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <TruncatedText text={event?.title ?? ""} className="text-base font-semibold leading-snug" />
          {event?.resource?.accountEmail && (
            <Badge variant="secondary" className="w-fit text-[10px] truncate max-w-full">
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
                  ? format(event.start, "EEE, MMM d, yyyy")
                  : `${format(event.start, "EEE, MMM d · h:mm a")} – ${format(event.end, "h:mm a")}`}
              </span>
            </div>
            {event.resource?.location && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="break-all">{event.resource.location}</span>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Read-only event from a connected account. Edit it in its own calendar.
            </p>
          </SheetBody>
        )}
        <SheetFooter className="px-5 py-3 flex flex-wrap items-center justify-end gap-2 border-t">
          {event?.resource?.meetingUrl && (
            <Button size="sm" asChild>
              <a href={event.resource.meetingUrl} target="_blank" rel="noopener noreferrer">
                <Video className="h-3.5 w-3.5 mr-1.5" />
                Join meeting
              </a>
            </Button>
          )}
          {event?.resource?.webLink && (
            <Button variant="outline" size="sm" asChild>
              <a href={event.resource.webLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open in calendar
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

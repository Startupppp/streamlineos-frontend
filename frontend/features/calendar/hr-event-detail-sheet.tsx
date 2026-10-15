"use client";

import { formatEventDate } from "@/lib/date-utils";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { HR_CALENDAR_TYPE_LABELS, HR_CALENDAR_TYPE_COLORS } from "@/hooks/api/hr/hr-calendar";
import type { HrCalendarEventType } from "@/hooks/api/hr/hr-calendar";
import { cn } from "@/lib/utils";
import type { BigCalEvent } from "./big-calendar-wrapper";

interface HrEventDetailSheetProps {
  event: BigCalEvent | null;
  onClose: () => void;
}

export function HrEventDetailSheet({ event, onClose }: HrEventDetailSheetProps) {
  const type = event?.resource?.hrEventType as HrCalendarEventType | undefined;

  return (
    <Dialog open={event !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-5 py-4 text-left">
          <DialogTitle className="truncate text-base font-semibold leading-snug">{event?.title ?? ""}</DialogTitle>
          {type && (
            <Badge
              variant="outline"
              className={cn("w-fit text-micro", HR_CALENDAR_TYPE_COLORS[type])}
            >
              {HR_CALENDAR_TYPE_LABELS[type]}
            </Badge>
          )}
        </DialogHeader>
        {event && (
          <DialogBody className="space-y-3 px-5 py-4">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{`${formatEventDate(event.start, "UTC")} · All day`}</span>
            </div>
            <p className="text-dense text-muted-foreground">
              Read-only HR event. Manage it from the HR module.
            </p>
          </DialogBody>
        )}
        <div className="flex shrink-0 justify-end border-t px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

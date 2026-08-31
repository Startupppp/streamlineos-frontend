"use client";

import { format } from "date-fns";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
    <Sheet open={event !== null} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle className="text-base font-semibold leading-snug truncate">{event?.title ?? ""}</SheetTitle>
          {type && (
            <Badge
              variant="outline"
              className={cn("w-fit text-micro", HR_CALENDAR_TYPE_COLORS[type])}
            >
              {HR_CALENDAR_TYPE_LABELS[type]}
            </Badge>
          )}
        </SheetHeader>
        {event && (
          <SheetBody className="px-5 py-4 space-y-3">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{format(event.start, "EEE, MMM d, yyyy")}</span>
            </div>
            <p className="text-dense text-muted-foreground">
              Read-only HR event. Manage it from the HR module.
            </p>
          </SheetBody>
        )}
        <div className="px-5 py-3 border-t shrink-0 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

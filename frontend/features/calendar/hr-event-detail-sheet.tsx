"use client";

import { formatEventDate } from "@/lib/date-utils";
import { AppSheet } from "@/components/shared/app-sheet";
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
    <AppSheet
      open={event !== null}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={event?.title ?? "Event details"}
      footer={event ? <Button variant="outline" size="sm" onClick={onClose}>Close</Button> : null}
    >
        <div className="space-y-3">
          {type && (
            <Badge
              variant="outline"
              className={cn("w-fit text-micro", HR_CALENDAR_TYPE_COLORS[type])}
            >
              {HR_CALENDAR_TYPE_LABELS[type]}
            </Badge>
          )}
        {event && (
          <>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{`${formatEventDate(event.start, "UTC")} · All day`}</span>
            </div>
            <p className="text-dense text-muted-foreground">
              Read-only HR event. Manage it from the HR module.
            </p>
          </>
        )}
        </div>
    </AppSheet>
  );
}

"use client";

import { useCallback, useState } from "react";
import { addDays, addHours, format, nextMonday, setHours, setMinutes } from "date-fns";
import { Clock, AlarmClockOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSnoozeTicket, useUnsnoozeTicket } from "@/hooks/api/support/productivity";

function atNineAm(date: Date): Date {
  return setMinutes(setHours(date, 9), 0);
}

interface TicketSnoozeControlProps {
  ticketId: number;
  snoozedUntil: string | Date | null;
}

export function TicketSnoozeControl({ ticketId, snoozedUntil }: TicketSnoozeControlProps) {
  const [open, setOpen] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const snooze = useSnoozeTicket();
  const unsnooze = useUnsnoozeTicket();

  const handleSnooze = useCallback(
    (date: Date) => {
      snooze.mutate(
        { ticketId, snoozedUntil: date },
        {
          onSuccess: () => {
            setOpen(false);
            setCustomDate("");
            toast.success(`Snoozed until ${format(date, "MMM d, h:mm a")}`);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [ticketId, snooze],
  );

  const handleSnoozeTomorrow = useCallback(() => handleSnooze(atNineAm(addDays(new Date(), 1))), [handleSnooze]);
  const handleSnoozeNextWeek = useCallback(
    () => handleSnooze(atNineAm(nextMonday(new Date()))),
    [handleSnooze],
  );
  const handleSnoozeThreeHours = useCallback(() => handleSnooze(addHours(new Date(), 3)), [handleSnooze]);

  const handleCustomDateChange = useCallback((value: string) => setCustomDate(value), []);
  const handleCustomDateConfirm = useCallback(() => {
    if (!customDate) return;
    handleSnooze(atNineAm(new Date(customDate)));
  }, [customDate, handleSnooze]);

  const handleUnsnooze = useCallback(() => {
    unsnooze.mutate(ticketId, { onError: (err) => toast.error(getErrorMessage(err)) });
  }, [ticketId, unsnooze]);

  const handleOpenChange = useCallback((v: boolean) => setOpen(v), []);

  if (snoozedUntil) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className="text-xs gap-1">
          <Clock className="h-3 w-3" />
          Snoozed until {format(new Date(snoozedUntil), "MMM d, h:mm a")}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleUnsnooze}
          disabled={unsnooze.isPending}
          aria-label="Unsnooze ticket"
        >
          <AlarmClockOff className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
          <Clock className="h-3 w-3" /> Snooze
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="sm" className="justify-start h-9 text-sm" onClick={handleSnoozeThreeHours}>
            In 3 hours
          </Button>
          <Button variant="ghost" size="sm" className="justify-start h-9 text-sm" onClick={handleSnoozeTomorrow}>
            Tomorrow, 9:00 AM
          </Button>
          <Button variant="ghost" size="sm" className="justify-start h-9 text-sm" onClick={handleSnoozeNextWeek}>
            Next Monday, 9:00 AM
          </Button>
          <div className="border-t border-border/60 mt-1 pt-2 flex items-center gap-1.5">
            <DatePicker value={customDate} onChange={handleCustomDateChange} className="h-9 text-sm flex-1" />
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-sm shrink-0"
              disabled={!customDate || snooze.isPending}
              onClick={handleCustomDateConfirm}
            >
              Set
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

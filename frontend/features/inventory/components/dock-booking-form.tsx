"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useBookAppointment, type DockDoor } from "@/hooks/api/inventory/stock-types-dock";

interface DockBookingFormProps {
  day: string;
  doors: DockDoor[];
}

export function DockBookingForm({ day, doors }: DockBookingFormProps) {
  const book = useBookAppointment();
  const [doorId, setDoorId] = useState("");
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [carrierName, setCarrierName] = useState("");

  const openDoors = useMemo(
    () => doors.filter((door) => door.isActive),
    [doors],
  );

  const handleBook = useCallback(() => {
    const door = Number(doorId);
    if (!Number.isInteger(door) || door <= 0) {
      toast.error("Choose a door");
      return;
    }
    if (windowStart === "" || windowEnd === "") {
      toast.error("Enter the window");
      return;
    }
    book.mutate(
      {
        doorId: door,
        direction: "INBOUND",
        windowStart: new Date(`${day}T${windowStart}`).toISOString(),
        windowEnd: new Date(`${day}T${windowEnd}`).toISOString(),
        ...(carrierName ? { carrierName } : {}),
      },
      {
        onSuccess: () => {
          toast.success("Slot booked");
          setWindowStart("");
          setWindowEnd("");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [book, carrierName, day, doorId, windowEnd, windowStart]);

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <p className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
        Book a slot
      </p>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="dock-door">Door</Label>
          <Select value={doorId} onValueChange={setDoorId}>
            <SelectTrigger id="dock-door" className="w-full">
              <SelectValue placeholder="Choose a door" />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              {openDoors.map((door) => (
                <SelectItem key={door.id} value={String(door.id)}>
                  {door.name ? `${door.code} — ${door.name}` : door.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dock-from">From</Label>
          <Input
            id="dock-from"
            type="time"
            value={windowStart}
            onChange={(e) => setWindowStart(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dock-to">To</Label>
          <Input
            id="dock-to"
            type="time"
            value={windowEnd}
            onChange={(e) => setWindowEnd(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dock-carrier">Carrier</Label>
          <Input
            id="dock-carrier"
            value={carrierName}
            onChange={(e) => setCarrierName(e.target.value)}
          />
        </div>
      </div>
      <LoadingButton size="sm" onClick={handleBook} isPending={book.isPending} loadingText="Booking…">
        <CalendarClock className="h-3.5 w-3.5" />
        Book
      </LoadingButton>
    </div>
  );
}

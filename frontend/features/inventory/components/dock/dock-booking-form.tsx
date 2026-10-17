"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import {
  RecordForm,
  type RecordFieldControl,
  type RecordFormValues,
} from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { getErrorMessage } from "@/lib/get-error-message";
import { DOCK_APPOINTMENT_LAYOUT } from "@/lib/renderer/inventory/dock-appointment-layout";
import { useBookAppointment, type DockDoor } from "@/hooks/api/inventory/stock-types-dock";

interface DockBookingFormProps {
  day: string;
  doors: DockDoor[];
}

function TimeControl(control: RecordFieldControl) {
  return (
    <Input
      type="time"
      value={control.value}
      onChange={(event) => control.onChange(event.target.value)}
      disabled={control.disabled}
    />
  );
}

/**
 * Books a door for a window on the day being viewed, rendered from the
 * description. The door picker and the two time inputs are supplied as
 * controls; after a booking the form reopens on the same door and carrier with
 * the window cleared, so the next slot at that door is two fields away.
 */
export function DockBookingForm({ day, doors }: DockBookingFormProps) {
  const layout = useTenantLayout(DOCK_APPOINTMENT_LAYOUT);
  const book = useBookAppointment();
  const [kept, setKept] = useState<{ round: number; doorId: string; carrierName: string }>({
    round: 0,
    doorId: "",
    carrierName: "",
  });

  const openDoors = useMemo(() => doors.filter((door) => door.isActive), [doors]);

  const controls = useMemo<Record<string, (control: RecordFieldControl) => ReactNode>>(
    () => ({
      doorId: (control) => (
        <Select value={control.value} onValueChange={control.onChange} disabled={control.disabled}>
          <SelectTrigger className="w-full" aria-label="Door">
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
      ),
      windowStart: TimeControl,
      windowEnd: TimeControl,
    }),
    [openDoors],
  );

  const initial = useMemo(
    () => ({ doorId: kept.doorId, carrierName: kept.carrierName }),
    [kept.doorId, kept.carrierName],
  );

  const handleBook = useCallback(
    (values: RecordFormValues) => {
      const doorId = values.doorId ?? "";
      const carrierName = (values.carrierName ?? "").trim();
      book.mutate(
        {
          doorId: Number(doorId),
          direction: "INBOUND",
          windowStart: new Date(`${day}T${values.windowStart}`).toISOString(),
          windowEnd: new Date(`${day}T${values.windowEnd}`).toISOString(),
          ...(carrierName ? { carrierName } : {}),
        },
        {
          onSuccess: () => {
            toast.success("Slot booked");
            setKept((previous) => ({
              round: previous.round + 1,
              doorId,
              carrierName: values.carrierName ?? "",
            }));
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [book, day],
  );

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <RecordForm
        key={kept.round}
        layout={layout}
        mode="create"
        initial={initial}
        controls={controls}
        onSubmit={handleBook}
        isSubmitting={book.isPending}
        submitLabel="Book"
      />
    </div>
  );
}

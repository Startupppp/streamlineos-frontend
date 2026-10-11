"use client";

import { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useBookAppointment, type DockDoor } from "@/hooks/api/inventory/stock-types-dock";
import { dockBookingSchema, type DockBookingValues } from "@/features/inventory/lib/dock-booking-schema";

const DEFAULT_VALUES: DockBookingValues = {
  doorId: "",
  windowStart: "",
  windowEnd: "",
  carrierName: "",
};

interface DockBookingFormProps {
  day: string;
  doors: DockDoor[];
}

export function DockBookingForm({ day, doors }: DockBookingFormProps) {
  const book = useBookAppointment();
  const form = useForm<DockBookingValues>({
    resolver: zodResolver(dockBookingSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const openDoors = useMemo(() => doors.filter((door) => door.isActive), [doors]);

  const handleBook = useCallback(
    (values: DockBookingValues) => {
      const carrierName = values.carrierName.trim();
      book.mutate(
        {
          doorId: Number(values.doorId),
          direction: "INBOUND",
          windowStart: new Date(`${day}T${values.windowStart}`).toISOString(),
          windowEnd: new Date(`${day}T${values.windowEnd}`).toISOString(),
          ...(carrierName ? { carrierName } : {}),
        },
        {
          onSuccess: () => {
            toast.success("Slot booked");
            form.reset({ ...values, windowStart: "", windowEnd: "" });
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [book, day, form],
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleBook)}
        className="rounded-lg border border-border bg-muted/30 p-4 space-y-3"
      >
        <p className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
          Book a slot
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          <FormField
            control={form.control}
            name="doorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Door</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a door" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    {openDoors.map((door) => (
                      <SelectItem key={door.id} value={String(door.id)}>
                        {door.name ? `${door.code} — ${door.name}` : door.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="windowStart"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="windowEnd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>To</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="carrierName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Carrier</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <LoadingButton type="submit" size="sm" isPending={book.isPending} loadingText="Booking…">
          <CalendarClock className="h-3.5 w-3.5" />
          Book
        </LoadingButton>
      </form>
    </Form>
  );
}

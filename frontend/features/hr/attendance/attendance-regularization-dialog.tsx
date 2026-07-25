"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateRegularization } from "@/hooks/api/hr/attendance";
import { FilePen } from "lucide-react";

const regularizationSchema = z
  .object({
    attendanceDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid date"),
    requestedCheckIn: z.string().optional(),
    requestedCheckOut: z.string().optional(),
    reason: z
      .string()
      .trim()
      .min(10, "Reason must be at least 10 characters")
      .max(500, "Reason must be at most 500 characters")
      .refine((v) => !/\s{2,}/.test(v), "Reason cannot have consecutive spaces"),
  })
  .superRefine((values, ctx) => {
    const checkIn = values.requestedCheckIn?.trim();
    const checkOut = values.requestedCheckOut?.trim();
    if (!checkIn && !checkOut) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least a check-in or check-out time",
        path: ["requestedCheckIn"],
      });
    }
    if (checkIn && checkOut && checkIn >= checkOut) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Check-out must be after check-in",
        path: ["requestedCheckOut"],
      });
    }
  });

type RegularizationFormValues = z.infer<typeof regularizationSchema>;

function toIsoOnDate(date: string, time: string): string {
  const [h, m] = time.split(":");
  const d = new Date(`${date}T00:00:00`);
  d.setHours(Number(h), Number(m), 0, 0);
  return d.toISOString();
}

export function AttendanceRegularizationDialog({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const mutation = useCreateRegularization();

  const defaultValues = useMemo<RegularizationFormValues>(
    () => ({
      attendanceDate: new Date().toISOString().slice(0, 10),
      requestedCheckIn: "",
      requestedCheckOut: "",
      reason: "",
    }),
    [],
  );

  async function onSubmit(values: RegularizationFormValues) {
    try {
      const payload: Parameters<typeof mutation.mutateAsync>[0] = {
        attendanceDate: values.attendanceDate,
        reason: values.reason.trim(),
      };
      const checkIn = values.requestedCheckIn?.trim();
      const checkOut = values.requestedCheckOut?.trim();
      if (checkIn) {
        payload.requestedCheckIn = toIsoOnDate(values.attendanceDate, checkIn);
      }
      if (checkOut) {
        payload.requestedCheckOut = toIsoOnDate(values.attendanceDate, checkOut);
      }
      await mutation.mutateAsync(payload);
      toast.success("Regularization request submitted");
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="justify-start gap-1.5 px-0 h-auto py-0 font-normal text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        {children ?? (
          <>
            <FilePen className="h-4 w-4" />
            Request Correction
          </>
        )}
      </Button>

      <EntityFormSheet<RegularizationFormValues>
        open={open}
        onOpenChange={setOpen}
        title="Request Attendance Correction"
        description="Submit corrected check-in or check-out times for review."
        resolver={zodResolver(regularizationSchema)}
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        isSubmitting={mutation.isPending}
        submitLabel="Submit Request"
        className="sm:max-w-md"
        resetOnOpen
      >
        {(form) => (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="attendanceDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="requestedCheckIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-in Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requestedCheckOut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-out Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Explain why this correction is needed..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </EntityFormSheet>
    </>
  );
}

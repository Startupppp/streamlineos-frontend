"use client";

import { DatePicker } from "@/components/ui/date-picker";

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
import { useCan } from "@/hooks/api/access";
import { useOrgTimeZone } from "@/hooks/api/org-display";
import {
  formatDateOnly,
  todayInOrgTz,
  toIsoOnDateInOrgTz,
} from "@/lib/date-utils";
import { FilePen } from "lucide-react";

export const REGULARIZATION_WINDOW_DAYS = 30;

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return formatDateOnly(d);
}

function isRealCalendarDate(iso: string): boolean {
  const d = new Date(`${iso}T00:00:00`);
  return !Number.isNaN(d.getTime()) && formatDateOnly(d) === iso;
}

function buildSchema(orgTz: string | null) {
  return z
    .object({
      attendanceDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid date")
        .refine(isRealCalendarDate, "That date does not exist")
        .refine(
          (v) => v <= todayInOrgTz(orgTz),
          "You cannot request a correction for a future date",
        )
        .refine(
          (v) =>
            v >= shiftDays(todayInOrgTz(orgTz), -REGULARIZATION_WINDOW_DAYS),
          `Corrections are only allowed within the last ${REGULARIZATION_WINDOW_DAYS} days`,
        ),
      requestedCheckIn: z.string().optional(),
      requestedCheckOut: z.string().optional(),
      reason: z
        .string()
        .trim()
        .min(10, "Reason must be at least 10 characters")
        .max(500, "Reason must be at most 500 characters")
        .refine(
          (v) => !/\s{2,}/.test(v),
          "Reason cannot have consecutive spaces",
        ),
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
      if (values.attendanceDate === todayInOrgTz(orgTz)) {
        const nowIso = new Date().toISOString();
        if (
          checkIn &&
          toIsoOnDateInOrgTz(values.attendanceDate, checkIn, orgTz) > nowIso
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Check-in cannot be later than the current time",
            path: ["requestedCheckIn"],
          });
        }
        if (
          checkOut &&
          toIsoOnDateInOrgTz(values.attendanceDate, checkOut, orgTz) > nowIso
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Check-out cannot be later than the current time",
            path: ["requestedCheckOut"],
          });
        }
      }
    });
}

type RegularizationFormValues = z.infer<ReturnType<typeof buildSchema>>;

export function AttendanceRegularizationDialog({
  children,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const mutation = useCreateRegularization();
  const canRequest = useCan("self:attendance");
  const orgTz = useOrgTimeZone();

  const regularizationSchema = useMemo(() => buildSchema(orgTz), [orgTz]);

  const defaultValues = useMemo<RegularizationFormValues>(
    () => ({
      attendanceDate: todayInOrgTz(orgTz),
      requestedCheckIn: "",
      requestedCheckOut: "",
      reason: "",
    }),
    [orgTz],
  );

  async function onSubmit(values: RegularizationFormValues) {
    try {
      const payload: Parameters<typeof mutation.mutateAsync>[0] = {
        attendanceDate: values.attendanceDate,
        reason: values.reason.trim(),
      };
      const checkIn = values.requestedCheckIn?.trim();
      const checkOut = values.requestedCheckOut?.trim();
      if (checkIn)
        payload.requestedCheckIn = toIsoOnDateInOrgTz(
          values.attendanceDate,
          checkIn,
          orgTz,
        );

      if (checkOut)
        payload.requestedCheckOut = toIsoOnDateInOrgTz(
          values.attendanceDate,
          checkOut,
          orgTz,
        );

      await mutation.mutateAsync(payload);
      toast.success("Regularization request submitted");
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function handleOpen() {
    setOpen(true);
  }

  const today = todayInOrgTz(orgTz);
  const windowStart = shiftDays(today, -REGULARIZATION_WINDOW_DAYS);

  return (
    <>
      {!hideTrigger && canRequest ? (
        <Button
          type="button"
          variant="ghost"
          className="h-auto justify-start gap-1.5 px-0 py-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
          onClick={handleOpen}
        >
          {children ?? (
            <>
              <FilePen className="h-4 w-4" />
              Request Correction
            </>
          )}
        </Button>
      ) : null}

      <EntityFormSheet<RegularizationFormValues>
        open={open}
        onOpenChange={setOpen}
        title="Request Attendance Correction"
        description={`Submit corrected check-in or check-out times for review. You can request corrections for the last ${REGULARIZATION_WINDOW_DAYS} days.`}
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
                    <DatePicker
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      ariaLabel="Date"
                      placeholder="Pick a date"
                      dateFormat="dd MMM yyyy"
                      fromDate={new Date(`${windowStart}T00:00:00`)}
                      toDate={new Date(`${today}T00:00:00`)}
                    />
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

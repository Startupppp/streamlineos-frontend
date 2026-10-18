"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { HrSheet } from "@/components/shared/hr-sheet";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateShift,
  useUpdateShift,
  type ShiftTemplate,
} from "@/hooks/api/hr/shifts";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { numericFieldChange } from "@/lib/numeric-field";
import { formatTime } from "@/lib/format-utils";

const SHIFT_TYPES = ["FIXED", "ROTATIONAL", "NIGHT", "FLEXIBLE"] as const;

const END_BEFORE_START_MESSAGE =
  "End time must be after start time, or turn on Night Shift";

function toMinutes(value: string | undefined): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? "");
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function describeShift(values: {
  startTime: string;
  endTime: string;
  isNightShift: boolean;
  breakMinutes: number;
}): string {
  const start = toMinutes(values.startTime);
  const end = toMinutes(values.endTime);
  if (start === null || end === null) return "";
  const span = end > start ? end - start : end + 1440 - start;
  const hours = Math.floor(span / 60);
  const minutes = span % 60;
  const duration = `${hours}h${minutes ? ` ${minutes}m` : ""}`;
  const crossing = values.isNightShift && end <= start ? ", ends the next day" : "";
  const breakWarning =
    values.breakMinutes >= span ? " Warning: the break is as long as the whole shift." : "";
  return ` Duration ${duration}${crossing}.${breakWarning}`;
}

function describeChanges(original: ShiftTemplate, next: FormValues): string {
  const parts: string[] = [];
  if (original.name !== next.name) parts.push(`Name: "${original.name}" → "${next.name}"`);
  if (original.startTime !== next.startTime)
    parts.push(`Start: ${formatTime(original.startTime)} → ${formatTime(next.startTime)}`);
  if (original.endTime !== next.endTime)
    parts.push(`End: ${formatTime(original.endTime)} → ${formatTime(next.endTime)}`);
  if (original.breakMinutes !== next.breakMinutes)
    parts.push(`Break: ${original.breakMinutes} min → ${next.breakMinutes} min`);
  if (original.gracePeriodMinutes !== next.gracePeriodMinutes)
    parts.push(
      `Grace period: ${original.gracePeriodMinutes} min → ${next.gracePeriodMinutes} min`,
    );
  if (original.isNightShift !== next.isNightShift)
    parts.push(`Night shift: ${original.isNightShift ? "on" : "off"} → ${next.isNightShift ? "on" : "off"}`);
  if (parts.length === 0) return "";
  return ` Changes: ${parts.join("; ")}.`;
}

const schema = z.object({
  name: z
    .string()
    .transform((v) => v.trim().replace(/\s+/g, " "))
    .pipe(
      z
        .string()
        .min(3, "Name must be at least 3 characters")
        .max(100, "Name must be at most 100 characters")
        .refine(
          (v) => /^[\p{L}\p{N}\s'.-]+$/u.test(v),
          "Name can only use letters, numbers, spaces, apostrophes, periods, and hyphens",
        )
        .refine(
          (v) => !/[^\p{L}\p{N}\s]{2,}/u.test(v),
          "Name cannot have consecutive special characters",
        )
        .refine(
          (v) => (v.match(/[a-zA-Z]/g) ?? []).length >= 3,
          "Name must contain at least 3 letters",
        ),
    ),
  type: z.enum(SHIFT_TYPES),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  breakMinutes: z.number().int().min(0).max(480),
  gracePeriodMinutes: z.number().int().min(0).max(120),
  isNightShift: z.boolean(),
}).refine(
  (d) => {
    if (d.isNightShift) return true;
    const start = toMinutes(d.startTime);
    const end = toMinutes(d.endTime);
    return start === null || end === null || end > start;
  },
  { message: END_BEFORE_START_MESSAGE, path: ["endTime"] },
);

type FormValues = z.infer<typeof schema>;

const EMPTY_VALUES: FormValues = {
  name: "",
  type: "FIXED",
  startTime: "09:00",
  endTime: "18:00",
  breakMinutes: 60,
  gracePeriodMinutes: 15,
  isNightShift: false,
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shift?: ShiftTemplate | null;
}

export function ShiftFormSheet({ open, onOpenChange, shift }: Props) {
  const isEdit = Boolean(shift);
  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      shift
        ? {
            name: shift.name,
            type: SHIFT_TYPES.includes(
              shift.type as (typeof SHIFT_TYPES)[number],
            )
              ? (shift.type as (typeof SHIFT_TYPES)[number])
              : "FIXED",
            startTime: shift.startTime,
            endTime: shift.endTime,
            breakMinutes: shift.breakMinutes,
            gracePeriodMinutes: shift.gracePeriodMinutes,
            isNightShift: shift.isNightShift,
          }
        : EMPTY_VALUES,
    );
    setConfirmOpen(false);
    setPendingValues(null);
  }, [open, shift, form]);

  const requestConfirm = useCallback((data: FormValues) => {
    setPendingValues(data);
    setConfirmOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!pendingValues) return;
    const handlers = {
      onSuccess: () => {
        toast.success(isEdit ? "Shift updated" : "Shift created");
        form.reset(EMPTY_VALUES);
        setConfirmOpen(false);
        setPendingValues(null);
        onOpenChange(false);
      },
      onError: (err: unknown) => toast.error(getErrorMessage(err)),
    };
    if (shift) updateShift.mutate({ shiftId: shift.id, ...pendingValues }, handlers);
    else createShift.mutate(pendingValues, handlers);
  }, [
    pendingValues,
    shift,
    isEdit,
    createShift,
    updateShift,
    form,
    onOpenChange,
  ]);

  function handleTypeChange(value: string) {
    const next = SHIFT_TYPES.find((t) => t === value);
    if (!next) return;
    const options = { shouldDirty: true, shouldTouch: true };
    form.setValue("type", next, options);
    if (next !== "NIGHT") return;
    form.setValue("isNightShift", true, options);
    if (form.getFieldState("endTime").error) void form.trigger("endTime");
  }

  const isPending = createShift.isPending || updateShift.isPending;

  return (
    <>
      <HrSheet
        open={open}
        onOpenChange={onOpenChange}
        title={isEdit ? "Edit Shift Template" : "Create Shift Template"}
        description="Define a shift schedule for your organization"
        onSubmit={form.handleSubmit(requestConfirm)}
        submitLabel={isEdit ? "Save Changes" : "Create Shift"}
        isPending={isPending}
        isDirty={form.formState.isDirty}
        onDiscard={() => form.reset()}
      >
        <Form {...form}>
          <div className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                    Shift Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Morning Shift"
                      className="text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                    Type
                  </FormLabel>
                  <Select onValueChange={handleTypeChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SHIFT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                      Start Time
                    </FormLabel>
                    <FormControl>
                      <Input type="time" className="text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                      End Time
                    </FormLabel>
                    <FormControl>
                      <Input type="time" className="text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="breakMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                      Break (min)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={480}
                        className="text-sm"
                        {...field}
                        onChange={numericFieldChange(field.onChange)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gracePeriodMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                      Grace (min)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={120}
                        className="text-sm"
                        {...field}
                        onChange={numericFieldChange(field.onChange)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isNightShift"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="text-sm font-medium cursor-pointer">
                    Night Shift
                  </FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </Form>
      </HrSheet>

      <ConfirmSheet
        open={confirmOpen}
        onOpenChange={(next) => {
          setConfirmOpen(next);
          if (!next) setPendingValues(null);
        }}
        title={isEdit ? "Save shift changes?" : "Create this shift?"}
        description={
          isEdit
            ? `Update "${shift?.name ?? "this shift"}"?${pendingValues && shift ? describeChanges(shift, pendingValues) : pendingValues ? describeShift(pendingValues) : ""} Existing assignments keep using this template.`
            : `Create shift template "${pendingValues?.name ?? "this shift"}" (${formatTime(pendingValues?.startTime) || "—"} – ${formatTime(pendingValues?.endTime) || "—"}).${pendingValues ? describeShift(pendingValues) : ""} Create it?`
        }
        confirmLabel={isEdit ? "Save Changes" : "Create Shift"}
        isPending={isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}

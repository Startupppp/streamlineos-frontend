"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { HrSheet } from "@/features/hr/hr-sheet";
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

const SHIFT_TYPES = ["FIXED", "ROTATIONAL", "NIGHT", "FLEXIBLE"] as const;

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
});

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
    if (shift) updateShift.mutate({ id: shift.id, ...pendingValues }, handlers);
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
            ? `Update "${pendingValues?.name ?? shift?.name ?? "this shift"}"? Existing assignments keep using this template.`
            : `Create shift template "${pendingValues?.name ?? "this shift"}" (${pendingValues?.startTime ?? "—"} – ${pendingValues?.endTime ?? "—"})?`
        }
        confirmLabel={isEdit ? "Save Changes" : "Create Shift"}
        isPending={isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}

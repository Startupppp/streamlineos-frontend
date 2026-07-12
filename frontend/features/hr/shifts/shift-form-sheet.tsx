"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { HrSheet } from "@/features/hr/hr-sheet";
import { getErrorMessage } from "@/lib/api-client";
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

const SHIFT_TYPES = ["FIXED", "ROTATIONAL", "NIGHT", "FLEXIBLE"] as const;

const MEANINGFUL_RE = /[a-zA-Z]{3}/;

const schema = z.object({
  name: z
    .string()
    .transform((v) => v.trim())
    .pipe(
      z
        .string()
        .min(3, "Name must be at least 3 characters")
        .max(100, "Name must be at most 100 characters")
        .refine((v) => /[a-zA-Z]/.test(v), "Name must contain at least one letter")
        .refine((v) => MEANINGFUL_RE.test(v), "Name must contain at least 3 letters")
        .refine((v) => !/\s{2,}/.test(v), "Name cannot have consecutive spaces"),
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
            type: SHIFT_TYPES.includes(shift.type as (typeof SHIFT_TYPES)[number])
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
  }, [open, shift, form]);

  const onSubmit = useCallback(
    (data: FormValues) => {
      const handlers = {
        onSuccess: () => {
          toast.success(isEdit ? "Shift updated" : "Shift created");
          form.reset(EMPTY_VALUES);
          onOpenChange(false);
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err)),
      };
      if (shift) updateShift.mutate({ id: shift.id, ...data }, handlers);
      else createShift.mutate(data, handlers);
    },
    [shift, isEdit, createShift, updateShift, form, onOpenChange],
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Shift Template" : "Create Shift Template"}
      description="Define a shift schedule for your organization"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={isEdit ? "Save Changes" : "Create Shift"}
      isPending={createShift.isPending || updateShift.isPending}
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
                  <Input placeholder="e.g. Morning Shift" className="h-9 text-sm" {...field} />
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
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SHIFT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
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
                    <Input type="time" className="h-9 text-sm" {...field} />
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
                    <Input type="time" className="h-9 text-sm" {...field} />
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
                      className="h-9 text-sm"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
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
                      className="h-9 text-sm"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
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
                <FormLabel className="text-sm font-medium cursor-pointer">Night Shift</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </Form>
    </HrSheet>
  );
}

"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { HrSheet } from "@/features/hr/hr-sheet";
import { getErrorMessage } from "@/lib/api-client";
import { useCreateShift } from "@/hooks/api/hr/shifts";
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

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(SHIFT_TYPES),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  breakMinutes: z.number().int().min(0).max(480),
  gracePeriodMinutes: z.number().int().min(0).max(120),
  isNightShift: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ShiftFormSheet({ open, onOpenChange }: Props) {
  const createShift = useCreateShift();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      type: "FIXED",
      startTime: "09:00",
      endTime: "18:00",
      breakMinutes: 60,
      gracePeriodMinutes: 15,
      isNightShift: false,
    },
  });

  const onSubmit = useCallback(
    (data: FormValues) => {
      createShift.mutate(
        { ...data, breakMinutes: data.breakMinutes, gracePeriodMinutes: data.gracePeriodMinutes },
        {
          onSuccess: () => {
            toast.success("Shift created");
            form.reset();
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createShift, form, onOpenChange],
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create Shift Template"
      description="Define a new shift schedule for your organization"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Create Shift"
      isPending={createShift.isPending}
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

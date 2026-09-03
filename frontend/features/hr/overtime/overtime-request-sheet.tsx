"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { HrSheet } from "@/components/shared/hr-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateOvertimeRequest } from "@/hooks/api/hr/overtime";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";

const hoursSchema = z
  .string()
  .min(1, "Hours worked overtime is required")
  .refine(
    (v) => {
      const trimmed = v.trim();
      if (!trimmed) return false;
      const n = Number(trimmed);
      return !isNaN(n) && isFinite(n);
    },
    { message: "Hours must be a valid number" },
  )
  .refine(
    (v) => {
      const n = parseFloat(v);
      return n > 0;
    },
    { message: "Hours must be greater than 0" },
  )
  .refine(
    (v) => {
      const n = parseFloat(v);
      return n <= 24;
    },
    { message: "Hours cannot exceed 24 per day" },
  );

const schema = z.object({
  date: z.string().min(1, "Date is required"),
  hours: hoursSchema,
  reason: z.string().optional(),
  convertToCompOff: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function OvertimeRequestSheet({ open, onOpenChange }: Props) {
  const createRequest = useCreateOvertimeRequest();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: "",
      hours: "1",
      reason: "",
      convertToCompOff: false,
    },
  });

  const onSubmit = useCallback(
    (data: FormValues) => {
      createRequest.mutate(data, {
        onSuccess: () => {
          toast.success("Overtime request submitted");
          form.reset();
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [createRequest, form, onOpenChange],
  );

  const { isValid, isDirty } = form.formState;

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Request Overtime"
      description="Submit an overtime request for approval"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Submit Request"
      isPending={createRequest.isPending}
      submitDisabled={isDirty && !isValid}
      isDirty={isDirty}
      onDiscard={() => form.reset()}
    >
      <Form {...form}>
        <div className="space-y-5">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Date <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} placeholder="Select date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Hours Worked Overtime <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="number" min="0.5" max="24" step="0.5" className="text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Reason{" "}
                  <span className="normal-case font-normal text-muted-foreground tracking-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe why overtime was needed..."
                    className="resize-none text-sm min-h-[80px]"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="convertToCompOff"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <FormLabel className="text-sm font-medium cursor-pointer">Convert to Comp-Off</FormLabel>
                  <p className="text-xs text-muted-foreground mt-0.5">Earn a compensatory day off instead of payout</p>
                </div>
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

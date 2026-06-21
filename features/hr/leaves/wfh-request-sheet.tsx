"use client";

import React, { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, startOfDay } from "date-fns";
import { toast } from "sonner";
import { useCreateWfhRequest } from "@/lib/api/hooks/hr";

import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { HrSheet } from "@/features/hr/hr-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Approver } from "@/app/(dashboard)/hr/leaves/leaves-shared";

const WFH_REASONS = [
  "Personal commitment",
  "Health / Medical",
  "Home maintenance",
  "Childcare",
  "Weather conditions",
  "Internet / Utility work",
  "Other",
] as const;

const wfhFormSchema = z.object({
  date: z
    .string()
    .min(1, "Date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .refine((v) => v >= format(new Date(), "yyyy-MM-dd"), "Date cannot be in the past"),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
  approverId: z.string().min(1, "Approver is required"),
});
type WfhFormValues = z.infer<typeof wfhFormSchema>;

interface WfhRequestSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  approvers: Approver[];
}

export function WfhRequestSheet({ open, onOpenChange, approvers }: WfhRequestSheetProps) {
  const createWfhRequest = useCreateWfhRequest();

  const form = useForm<WfhFormValues>({
    resolver: zodResolver(wfhFormSchema),
    defaultValues: {
      date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      reason: "",
      notes: "",
      approverId: "",
    },
  });

  const onSubmit = useCallback((data: WfhFormValues) => {
    createWfhRequest.mutate(
      {
        date: data.date,
        reason: `${data.reason}${data.notes ? ` — ${data.notes}` : ""}`,
        approverId: data.approverId,
      },
      {
        onSuccess: () => {
          toast.success("WFH request submitted successfully");
          form.reset({
            date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
            reason: "",
            notes: "",
            approverId: "",
          });
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  }, [createWfhRequest, form, onOpenChange]);

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Request Work From Home"
      description="Submit a WFH request for approval"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Submit Request"
      isPending={createWfhRequest.isPending}
    >
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">Date</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    fromDate={startOfDay(new Date())}
                    placeholder="Select date"
                  />
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
                <FormLabel className="text-xs font-medium">Reason</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {WFH_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="approverId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">Approver</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select approver" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {approvers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email}
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
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">
                  Notes <span className="text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any additional details..."
                    className="resize-none text-sm"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </HrSheet>
  );
}

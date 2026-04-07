"use client";

import React, { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, isBefore, startOfDay } from "date-fns";
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

const wfhFormSchema = z
  .object({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    reason: z.string().min(1, "Reason is required"),
    notes: z.string().optional(),
    approverId: z.string().min(1, "Approver is required"),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return !isBefore(new Date(data.endDate), new Date(data.startDate));
    },
    { message: "End date cannot be before start date", path: ["endDate"] }
  );
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
      startDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      endDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      reason: "",
      notes: "",
      approverId: "",
    },
  });

  const watchedStartDate = form.watch("startDate");

  const onSubmit = useCallback((data: WfhFormValues) => {
    createWfhRequest.mutate(
      {
        date: new Date(data.startDate),
        reason: `${data.reason}${data.notes ? ` — ${data.notes}` : ""}`,
        approverId: data.approverId,
      },
      {
        onSuccess: () => {
          toast.success("WFH request submitted successfully");
          form.reset({
            startDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
            endDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
            reason: "",
            notes: "",
            approverId: "",
          });
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to submit WFH request");
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
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Start Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      fromDate={startOfDay(new Date())}
                      placeholder="Start date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">End Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      fromDate={watchedStartDate ? new Date(watchedStartDate) : startOfDay(new Date())}
                      placeholder="End date"
                    />
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
                <FormLabel className="text-xs">Reason</FormLabel>
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
                <FormLabel className="text-xs">Approver</FormLabel>
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
                <FormLabel className="text-xs">
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

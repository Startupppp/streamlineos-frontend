"use client";

import React, { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, startOfDay, format } from "date-fns";
import { toast } from "sonner";
import { useCreateWfhRequest } from "@/hooks/api/hr";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { HrSheet } from "@/features/hr/hr-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { wfhFormSchema, type WfhFormValues } from "./wfh-request-schema";
import type { Approver } from "@/features/hr/leaves/components/leaves-shared";

const WFH_REASONS = [
  "Personal commitment",
  "Health / Medical",
  "Home maintenance",
  "Childcare",
  "Weather conditions",
  "Internet / Utility work",
  "Other",
] as const;

const isSunday = (d: Date) => d.getDay() === 0;

interface WfhRequestSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  approvers: Approver[];
}

export function WfhRequestSheet({
  open,
  onOpenChange,
  approvers,
}: WfhRequestSheetProps) {
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

  useEffect(() => {
    if (!open) {
      form.reset({
        date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
        reason: "",
        notes: "",
        approverId: "",
      });
    }
  }, [open, form]);

  useEffect(() => {
    if (approvers.length === 1 && !form.getValues("approverId")) {
      form.setValue("approverId", approvers[0].id);
    }
  }, [approvers, form]);

  const onSubmit = useCallback(
    (data: WfhFormValues) => {
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
        },
      );
    },
    [createWfhRequest, form, onOpenChange],
  );

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
        <div className="space-y-5">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Date
                </FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    fromDate={startOfDay(new Date())}
                    placeholder="Select date"
                    disabledDays={isSunday}
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
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Reason
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    {WFH_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
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
            name="approverId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Approver
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select approver" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    {approvers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name ||
                          `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
                          u.email}
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
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Notes{" "}
                  <span className="normal-case font-normal text-muted-foreground tracking-normal">
                    (optional)
                  </span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any additional details..."
                    className="resize-none text-sm min-h-[80px]"
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

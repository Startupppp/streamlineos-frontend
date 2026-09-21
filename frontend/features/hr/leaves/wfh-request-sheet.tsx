"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, startOfDay, format } from "date-fns";
import { toast } from "sonner";
import { useCreateWfhRequest } from "@/hooks/api/hr";
import { useMyApprover } from "@/hooks/api/hr/approvers";
import { ApprovalRoutePanel } from "@/components/shared/approval-route-panel";

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
import { HrSheet } from "@/components/shared/hr-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { wfhFormSchema, WFH_NOTES_MAX_LENGTH, type WfhFormValues } from "./wfh-request-schema";

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
}

export function WfhRequestSheet({
  open,
  onOpenChange,
}: WfhRequestSheetProps) {
  const createWfhRequest = useCreateWfhRequest();
  const { data: approvalRoute, isLoading: routeLoading, error: routeError } = useMyApprover("wfh", { enabled: open });
  const approverAvailable = approvalRoute !== undefined && approvalRoute.rung !== null;

  const form = useForm<WfhFormValues>({
    resolver: zodResolver(wfhFormSchema),
    defaultValues: {
      date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      reason: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({
        date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
        reason: "",
        notes: "",
      });
    }
  }, [open, form]);

  const onSubmit = useCallback(
    (data: WfhFormValues) => {
      createWfhRequest.mutate(
        {
          date: data.date,
          reason: `${data.reason}${data.notes ? ` — ${data.notes}` : ""}`,
        },
        {
          onSuccess: () => {
            toast.success("WFH request submitted successfully");
            form.reset({
              date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
              reason: "",
              notes: "",
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
      submitLabel={approverAvailable ? "Submit Request" : "No approver available"}
      submitDisabled={!approverAvailable}
      isPending={createWfhRequest.isPending}
      isDirty={form.formState.isDirty}
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

          <ApprovalRoutePanel route={approvalRoute} isLoading={routeLoading} error={routeError} />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-baseline justify-between">
                  <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                    Notes{" "}
                    <span className="normal-case font-normal text-muted-foreground tracking-normal">
                      (optional)
                    </span>
                  </FormLabel>
                  <span className="text-xs text-muted-foreground">
                    {field.value?.length ?? 0} / {WFH_NOTES_MAX_LENGTH}
                  </span>
                </div>
                <FormControl>
                  <Textarea
                    placeholder="Any additional details..."
                    className="resize-none text-sm min-h-[80px]"
                    rows={3}
                    maxLength={WFH_NOTES_MAX_LENGTH}
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

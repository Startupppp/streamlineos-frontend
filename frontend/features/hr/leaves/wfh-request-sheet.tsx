"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, UserX } from "lucide-react";
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
import { wfhFormSchema, WFH_NOTES_MAX_LENGTH, type WfhFormValues } from "./wfh-request-schema";
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
      submitLabel={approvers.length === 0 ? "No approver available" : "Submit Request"}
      submitDisabled={approvers.length === 0}
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

          {approvers.length === 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2.5 dark:border-amber-500/25 dark:bg-amber-500/10">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <UserX className="h-3.5 w-3.5 shrink-0" />
                Approver not configured
              </div>
              <p className="text-xs text-amber-800/80 dark:text-amber-200/80">
                WFH requests need an approver. Grant a teammate leave-approval access first.
              </p>
              <Link
                href="/settings/roles"
                className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-amber-800 hover:underline dark:text-amber-300"
              >
                Configure roles
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {approvers.length > 1 && (
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
          )}

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

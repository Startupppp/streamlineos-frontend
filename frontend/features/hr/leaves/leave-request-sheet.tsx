"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfDay } from "date-fns";
import { toast } from "sonner";

import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUpload } from "@/components/storage/file-upload";
import { HrSheet } from "@/features/hr/hr-sheet";
import { AlertCircle } from "lucide-react";
import { useRequestLeave } from "@/lib/api/hooks/hr";
import { LEAVE_MAX_DAYS } from "@/lib/leave-policy";
import type { LeaveType, Approver, LeaveBalance } from "@/app/(dashboard)/hr/leaves/leaves-shared";

const isSunday = (d: Date) => d.getDay() === 0;

function countNonSundayDays(startStr: string, endStr: string): number {
  const end = new Date(endStr);
  const current = new Date(startStr);
  let count = 0;
  while (current <= end) {
    if (current.getDay() !== 0) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

const leaveFormSchema = z
  .object({
    leaveTypeId: z.string().min(1, "Leave type is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    halfDay: z.boolean(),
    halfDayPeriod: z.enum(["AM", "PM"]),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
    reason: z
      .string()
      .trim()
      .min(10, "Reason must be at least 10 characters")
      .max(500, "Reason must be at most 500 characters"),
    approverId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "To date must be on or after From date",
          path: ["endDate"],
        });
      }
      if (data.halfDay && data.startDate !== data.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Half day leave cannot span multiple dates",
          path: ["endDate"],
        });
      }
    }
  });
type LeaveFormValues = z.infer<typeof leaveFormSchema>;

interface LeaveRequestSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leaveTypes: LeaveType[];
  approvers: Approver[];
  joiningDate: string | null;
  balances?: LeaveBalance[];
}

export function LeaveRequestSheet({
  open, onOpenChange, leaveTypes, approvers, joiningDate, balances = [],
}: LeaveRequestSheetProps) {
  const requestLeaveMutation = useRequestLeave();
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  const minDate = joiningDate
    ? format(new Date(joiningDate), "yyyy-MM-dd")
    : format(startOfDay(new Date()), "yyyy-MM-dd");

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      leaveTypeId: "",
      startDate: "",
      endDate: "",
      halfDay: false,
      halfDayPeriod: "AM" as const,
      priority: "MEDIUM",
      reason: "",
      approverId: "",
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
      setAttachmentUrl(null);
    }
  }, [open, form]);

  const watchedLeaveTypeId = form.watch("leaveTypeId");
  const watchedStartDate = form.watch("startDate");
  const watchedEndDate = form.watch("endDate");
  const watchedHalfDay = form.watch("halfDay");

  const { requestedDays, balancePreview } = useMemo(() => {
    if (!watchedLeaveTypeId || !watchedStartDate || !watchedEndDate) {
      return { requestedDays: 0, balancePreview: null };
    }
    const days = watchedHalfDay
      ? 0.5
      : countNonSundayDays(watchedStartDate, watchedEndDate);
    const selectedType = leaveTypes.find((t) => t.id.toString() === watchedLeaveTypeId);
    if (!selectedType) return { requestedDays: days, balancePreview: null };

    const matchedBal = balances.find((b) => b.leaveTypeId === selectedType.id);
    if (!matchedBal) return { requestedDays: days, balancePreview: null };

    const available = Number(matchedBal.balance ?? 0);
    return {
      requestedDays: days,
      balancePreview: {
        available,
        after: available - days,
        typeName: selectedType.name,
      },
    };
  }, [watchedLeaveTypeId, watchedStartDate, watchedEndDate, watchedHalfDay, leaveTypes, balances]);

  const leaveDayLimitError = useMemo(() => {
    if (!watchedLeaveTypeId || !watchedStartDate || !watchedEndDate) return null;
    const selectedType = leaveTypes.find((t) => t.id.toString() === watchedLeaveTypeId);
    if (!selectedType) return null;
    const maxDays = LEAVE_MAX_DAYS[selectedType.name];
    if (maxDays === undefined) return null;
    if (requestedDays > maxDays) {
      return `${selectedType.name} cannot exceed ${maxDays} days. You selected ${requestedDays} day${requestedDays !== 1 ? "s" : ""}.`;
    }
    return null;
  }, [watchedLeaveTypeId, watchedStartDate, watchedEndDate, requestedDays, leaveTypes]);

  const handleAttachmentUpload = useCallback((url: string) => setAttachmentUrl(url), []);

  const onSubmit = useCallback((data: LeaveFormValues) => {
    if (leaveDayLimitError) { toast.error(leaveDayLimitError); return; }
    const approverId = data.approverId || approvers[0]?.id;
    if (!approverId) { toast.error("No approver available"); return; }

    requestLeaveMutation.mutate(
      {
        leaveTypeId: parseInt(data.leaveTypeId),
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
        priority: data.priority,
        approverId,
        attachmentUrl: attachmentUrl || undefined,
        isHalfDay: data.halfDay,
        halfDayPeriod: data.halfDay ? data.halfDayPeriod : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Leave requested successfully!");
          form.reset();
          setAttachmentUrl(null);
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message || "Failed to submit request"),
      },
    );
  }, [leaveDayLimitError, approvers, attachmentUrl, form, onOpenChange, requestLeaveMutation]);

  const { isValid, isDirty } = form.formState;

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Request Leave"
      description="Fill in the details to submit a leave request"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Submit Request"
      isPending={requestLeaveMutation.isPending}
      submitDisabled={!isValid && isDirty}
    >
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="leaveTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">Leave Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    {leaveTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">From</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      fromDate={minDate ? new Date(minDate) : undefined}
                      placeholder="Start date"
                      disabledDays={isSunday}
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
                  <FormLabel className="text-xs font-medium">To</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      fromDate={watchedStartDate ? new Date(watchedStartDate) : (minDate ? new Date(minDate) : undefined)}
                      placeholder="End date"
                      disabledDays={isSunday}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="halfDay"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-xs font-normal text-muted-foreground !mt-0">
                  Half Day Request
                </FormLabel>
              </FormItem>
            )}
          />

          {watchedHalfDay && (
            <FormField
              control={form.control}
              name="halfDayPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Half Day Period</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="AM">AM (Morning — first half)</SelectItem>
                      <SelectItem value="PM">PM (Afternoon — second half)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">Priority</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="LOW">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />Low
                      </span>
                    </SelectItem>
                    <SelectItem value="MEDIUM">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />Medium
                      </span>
                    </SelectItem>
                    <SelectItem value="HIGH">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />High
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {approvers.length > 1 && (
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
                    <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
          )}

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">Reason</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="E.g. Family function, Doctor appointment..."
                    className="resize-none text-sm"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <label className="text-xs font-medium mb-1 block">
              Attach Document <span className="text-muted-foreground">(Optional)</span>
            </label>
            <FileUpload
              folder="leave-attachments"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              maxSize={5 * 1024 * 1024}
              onUploadComplete={handleAttachmentUpload}
            />
          </div>

          {balancePreview && requestedDays > 0 && (
            <div className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${
              balancePreview.after < 0
                ? "bg-destructive/10 border-destructive/20 text-destructive"
                : "bg-muted/50 border-border text-foreground"
            }`}>
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                This will consume{" "}
                <strong>{requestedDays} day{requestedDays !== 1 ? "s" : ""}</strong>{" "}
                of your{" "}
                <strong>{balancePreview.available} remaining {balancePreview.typeName} days.</strong>
                {balancePreview.after >= 0 ? (
                  <> You will have <strong>{balancePreview.after} day{balancePreview.after !== 1 ? "s" : ""}</strong> left.</>
                ) : (
                  <> This exceeds your balance by <strong>{Math.abs(balancePreview.after)} day{Math.abs(balancePreview.after) !== 1 ? "s" : ""}.</strong></>
                )}
              </span>
            </div>
          )}

          {leaveDayLimitError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{leaveDayLimitError}</p>
            </div>
          )}
        </div>
      </Form>
    </HrSheet>
  );
}

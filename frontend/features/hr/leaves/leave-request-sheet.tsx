"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfDay } from "date-fns";
import { toast } from "sonner";

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
import { Checkbox } from "@/components/ui/checkbox";
import { FileUpload } from "@/components/storage/file-upload";
import { HrSheet } from "@/features/hr/hr-sheet";
import { AlertCircle } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRequestLeave, useLeavePolicy } from "@/hooks/api/hr";
import { leaveFormSchema, type LeaveFormValues } from "./leave-request-schema";
import type {
  LeaveType,
  Approver,
  LeaveBalance,
} from "@/features/hr/leaves/components/leaves-shared";

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

/** Match backend leave-days.ts countWorkdays (Mon–Fri). */
function countWorkdays(startStr: string, endStr: string): number {
  const end = new Date(`${endStr}T00:00:00`);
  const current = new Date(`${startStr}T00:00:00`);
  let count = 0;
  while (current <= end) {
    if (!isWeekend(current)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

interface LeaveRequestSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leaveTypes: LeaveType[];
  approvers: Approver[];
  joiningDate: string | null;
  balances?: LeaveBalance[];
}

export function LeaveRequestSheet({
  open,
  onOpenChange,
  leaveTypes,
  approvers,
  joiningDate,
  balances = [],
}: LeaveRequestSheetProps) {
  const requestLeaveMutation = useRequestLeave();
  const { data: policy } = useLeavePolicy();
  const leaveMaxDays: Record<string, number> = Object.fromEntries(
    (policy?.leaveTypes ?? [])
      .filter((t) => t.daysPerYear > 0)
      .map((t) => [t.name, t.daysPerYear]),
  );
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
      : countWorkdays(watchedStartDate, watchedEndDate);
    const selectedType = leaveTypes.find(
      (t) => t.id.toString() === watchedLeaveTypeId,
    );
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
  }, [
    watchedLeaveTypeId,
    watchedStartDate,
    watchedEndDate,
    watchedHalfDay,
    leaveTypes,
    balances,
  ]);

  const leaveDayLimitError = useMemo(() => {
    if (!watchedLeaveTypeId || !watchedStartDate || !watchedEndDate)
      return null;
    const selectedType = leaveTypes.find(
      (t) => t.id.toString() === watchedLeaveTypeId,
    );
    if (!selectedType) return null;
    const maxDays = leaveMaxDays[selectedType.name];
    if (maxDays === undefined) return null;
    if (requestedDays > maxDays) {
      return `${selectedType.name} cannot exceed ${maxDays} days. You selected ${requestedDays} day${requestedDays !== 1 ? "s" : ""}.`;
    }
    return null;
  }, [
    watchedLeaveTypeId,
    watchedStartDate,
    watchedEndDate,
    requestedDays,
    leaveTypes,
    leaveMaxDays,
  ]);

  const handleAttachmentUpload = useCallback(
    (url: string) => setAttachmentUrl(url),
    [],
  );

  const onSubmit = useCallback(
    (data: LeaveFormValues) => {
      if (leaveDayLimitError) {
        toast.error(leaveDayLimitError);
        return;
      }
      const approverId = data.approverId || approvers[0]?.id;
      if (!approverId) {
        toast.error("No approver available");
        return;
      }

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
          onError: (err) =>
            toast.error(getErrorMessage(err)),
        },
      );
    },
    [
      leaveDayLimitError,
      approvers,
      attachmentUrl,
      form,
      onOpenChange,
      requestLeaveMutation,
    ],
  );

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
        <div className="space-y-5">
          <FormField
            control={form.control}
            name="leaveTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Leave Type
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    {leaveTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
              Date Range
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-muted-foreground">
                      From
                    </FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        fromDate={minDate ? new Date(minDate) : undefined}
                        placeholder="Start date"
                        disabledDays={isWeekend}
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
                    <FormLabel className="text-xs font-medium text-muted-foreground">
                      To
                    </FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        fromDate={
                          watchedStartDate
                            ? new Date(watchedStartDate)
                            : minDate
                              ? new Date(minDate)
                              : undefined
                        }
                        placeholder="End date"
                        disabledDays={isWeekend}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <FormField
              control={form.control}
              name="halfDay"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2.5">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-xs font-medium text-foreground !mt-0 cursor-pointer">
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
                    <FormLabel className="text-xs font-medium text-muted-foreground">
                      Period
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                        <SelectItem value="AM">
                          AM (Morning — first half)
                        </SelectItem>
                        <SelectItem value="PM">
                          PM (Afternoon — second half)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Priority
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="LOW">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Low
                      </span>
                    </SelectItem>
                    <SelectItem value="MEDIUM">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Medium
                      </span>
                    </SelectItem>
                    <SelectItem value="HIGH">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        High
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
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Reason
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="E.g. Family function, Doctor appointment..."
                    className="resize-none text-sm min-h-[80px]"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider block">
              Attach Document{" "}
              <span className="normal-case font-normal text-muted-foreground tracking-normal">
                (Optional)
              </span>
            </label>
            <FileUpload
              folder="leave-attachments"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              maxSize={5 * 1024 * 1024}
              onUploadComplete={handleAttachmentUpload}
            />
          </div>

          {balancePreview && requestedDays > 0 && (
            <div
              className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${
                balancePreview.after < 0
                  ? "bg-destructive/10 border-destructive/20 text-destructive"
                  : "bg-muted/50 border-border text-foreground"
              }`}
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                This will consume{" "}
                <strong>
                  {requestedDays} day{requestedDays !== 1 ? "s" : ""}
                </strong>{" "}
                of your{" "}
                <strong>
                  {balancePreview.available} remaining {balancePreview.typeName}{" "}
                  days.
                </strong>
                {balancePreview.after >= 0 ? (
                  <>
                    {" "}
                    You will have{" "}
                    <strong>
                      {balancePreview.after} day
                      {balancePreview.after !== 1 ? "s" : ""}
                    </strong>{" "}
                    left.
                  </>
                ) : (
                  <>
                    {" "}
                    This exceeds your balance by{" "}
                    <strong>
                      {Math.abs(balancePreview.after)} day
                      {Math.abs(balancePreview.after) !== 1 ? "s" : ""}.
                    </strong>
                  </>
                )}
              </span>
            </div>
          )}

          {leaveDayLimitError && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{leaveDayLimitError}</p>
            </div>
          )}
        </div>
      </Form>
    </HrSheet>
  );
}

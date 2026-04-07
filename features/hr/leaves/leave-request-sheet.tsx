"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfDay, differenceInCalendarDays } from "date-fns";
import { useRouter } from "next/navigation";
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
import { submitLeaveRequest } from "@/server/actions/leave-actions";
import { LEAVE_MAX_DAYS } from "@/lib/leave-policy";
import { getErrorMessage } from "@/lib/get-error-message";
import type { LeaveType, Approver } from "@/app/(dashboard)/hr/leaves/leaves-shared";

const leaveFormSchema = z.object({
  leaveTypeId: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  halfDay: z.boolean(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  reason: z.string().min(1, "Reason is required"),
  approverId: z.string().optional(),
});
type LeaveFormValues = z.infer<typeof leaveFormSchema>;

interface LeaveRequestSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leaveTypes: LeaveType[];
  approvers: Approver[];
  joiningDate: string | null;
}

export function LeaveRequestSheet({
  open, onOpenChange, leaveTypes, approvers, joiningDate,
}: LeaveRequestSheetProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
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
      priority: "MEDIUM",
      reason: "",
      approverId: "",
    },
  });

  const watchedLeaveTypeId = form.watch("leaveTypeId");
  const watchedStartDate = form.watch("startDate");
  const watchedEndDate = form.watch("endDate");
  const watchedHalfDay = form.watch("halfDay");

  const leaveDayLimitError = useMemo(() => {
    if (!watchedLeaveTypeId || !watchedStartDate || !watchedEndDate) return null;
    const selectedType = leaveTypes.find((t) => t.id.toString() === watchedLeaveTypeId);
    if (!selectedType) return null;
    const maxDays = LEAVE_MAX_DAYS[selectedType.name];
    if (maxDays === undefined) return null;
    const days = watchedHalfDay
      ? 0.5
      : differenceInCalendarDays(new Date(watchedEndDate), new Date(watchedStartDate)) + 1;
    if (days > maxDays) {
      return `${selectedType.name} cannot exceed ${maxDays} days. You selected ${days} day${days !== 1 ? "s" : ""}.`;
    }
    return null;
  }, [watchedLeaveTypeId, watchedStartDate, watchedEndDate, watchedHalfDay, leaveTypes]);

  const handleAttachmentUpload = useCallback((url: string) => setAttachmentUrl(url), []);

  const onSubmit = useCallback(async (data: LeaveFormValues) => {
    if (leaveDayLimitError) { toast.error(leaveDayLimitError); return; }
    const approverId = data.approverId || approvers[0]?.id;
    if (!approverId) { toast.error("No approver available"); return; }
    setIsLoading(true);
    try {
      const result = await submitLeaveRequest({
        leaveTypeId: parseInt(data.leaveTypeId),
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
        priority: data.priority,
        approverId,
        attachmentUrl: attachmentUrl || undefined,
      });
      if (result.success) {
        toast.success("Leave requested successfully!");
        form.reset();
        setAttachmentUrl(null);
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to submit request");
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [leaveDayLimitError, approvers, attachmentUrl, form, onOpenChange, router]);

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Request Leave"
      description="Fill in the details to submit a leave request"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Submit Request"
      isPending={isLoading}
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
                  <SelectContent>
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
                  <SelectContent>
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

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Attach Document <span className="text-muted-foreground/60">(Optional)</span>
            </label>
            <FileUpload
              folder="leave-attachments"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onUploadComplete={handleAttachmentUpload}
            />
          </div>

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

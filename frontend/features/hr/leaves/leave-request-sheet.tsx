"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfDay } from "date-fns";
import { toast } from "sonner";

import { Form } from "@/components/ui/form";
import { leaveSetupBlocker } from "./leave-setup-blocker";
import { HrSheet } from "@/components/shared/hr-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  parseDateOnly,
  startOfLocalDay,
} from "@/lib/date-constraints";
import { useRequestLeave, useLeavePolicy } from "@/hooks/api/hr";
import { leaveFormSchema, type LeaveFormValues } from "./leave-request-schema";
import { countWorkdays } from "./leave-date-helpers";
import { LeaveRequestFormFields } from "./leave-request-form-fields";
import type {
  LeaveType,
  Approver,
  LeaveBalance,
} from "@/features/hr/leaves/components/leaves-shared";

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

  const leaveStartFloor = parseDateOnly(minDate) ?? startOfLocalDay();
  const leaveStartBounds = {
    fromDate: leaveStartFloor,
    fromYear: leaveStartFloor.getFullYear(),
    toYear: startOfLocalDay().getFullYear() + 10,
  };
  const leaveEndBounds = planningEndPickerProps({
    startDate: watchedStartDate,
    mode: "onOrAfter",
    floorDate: leaveStartFloor,
    enforceTodayFloor: false,
  });

  function handleLeaveStartDateChange(value: string) {
    form.setValue("startDate", value, { shouldValidate: true });
    const currentEnd = form.getValues("endDate") ?? "";
    const nextEnd = clearEndIfInvalid(value, currentEnd, "onOrAfter");
    if (nextEnd !== currentEnd) {
      form.setValue("endDate", nextEnd, { shouldValidate: true });
    }
  }

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
      balancePreview: { available, after: available - days, typeName: selectedType.name },
    };
  }, [watchedLeaveTypeId, watchedStartDate, watchedEndDate, watchedHalfDay, leaveTypes, balances]);

  const leaveDayLimitError = useMemo(() => {
    if (!watchedLeaveTypeId || !watchedStartDate || !watchedEndDate) return null;
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
  }, [watchedLeaveTypeId, watchedStartDate, watchedEndDate, requestedDays, leaveTypes, leaveMaxDays]);

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
      requestLeaveMutation.mutate(
        {
          leaveTypeId: parseInt(data.leaveTypeId),
          startDate: data.startDate,
          endDate: data.endDate,
          reason: data.reason,
          priority: data.priority,
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
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [leaveDayLimitError, attachmentUrl, form, onOpenChange, requestLeaveMutation],
  );

  const { isValid, isDirty } = form.formState;

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Request Leave"
      description="Fill in the details to submit a leave request"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={leaveSetupBlocker(leaveTypes, approvers)?.submitLabel ?? "Submit Request"}
      isPending={requestLeaveMutation.isPending}
      submitDisabled={
        (!isValid && isDirty) ||
        leaveSetupBlocker(leaveTypes, approvers) !== null
      }
      isDirty={isDirty}
      onDiscard={() => form.reset()}
    >
      <Form {...form}>
        <LeaveRequestFormFields
          form={form}
          leaveTypes={leaveTypes}
          approvers={approvers}
          balances={balances}
          leaveStartBounds={leaveStartBounds}
          leaveEndBounds={leaveEndBounds}
          onStartDateChange={handleLeaveStartDateChange}
          onAttachmentUpload={handleAttachmentUpload}
          requestedDays={requestedDays}
          balancePreview={balancePreview}
          leaveDayLimitError={leaveDayLimitError}
        />
      </Form>
    </HrSheet>
  );
}

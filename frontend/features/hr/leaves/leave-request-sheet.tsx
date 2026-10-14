"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Form } from "@/components/ui/form";
import { HrSheet } from "@/components/shared/hr-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  parseDateOnly,
  startOfLocalDay,
} from "@/lib/date-constraints";
import { useRequestLeave, useLeavePolicy } from "@/hooks/api/hr";
import { useCan } from "@/hooks/api/access";
import { leaveStartFloor } from "./leave-date-helpers";
import { effectiveLeaveEnd, leaveFormSchema, type LeaveFormValues } from "./leave-request-schema";
import { LeaveRequestFormFields } from "./leave-request-form-fields";
import { useLeaveRequestValidation } from "./use-leave-request-validation";
import type { LeaveSpan } from "./leave-overlap";
import type {
  LeaveType,
  LeaveBalance,
} from "@/features/hr/leaves/components/leaves-shared";
import type { ApprovalRoute } from "@/hooks/api/hr/approval-route-schema";

interface LeaveRequestSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leaveTypes: LeaveType[];
  approvalRoute: ApprovalRoute | undefined;
  joiningDate: string | null;
  balances?: LeaveBalance[];
  existingRequests?: LeaveSpan[];
}

const NO_EXISTING_REQUESTS: LeaveSpan[] = [];

export function LeaveRequestSheet({
  open,
  onOpenChange,
  leaveTypes,
  approvalRoute,
  joiningDate,
  balances = [],
  existingRequests = NO_EXISTING_REQUESTS,
}: LeaveRequestSheetProps) {
  // A sole owner's leave has no other approver yet (ownerSelfApproval with no
  // rung) but is still accepted and waits pending; the route panel says why.
  const approverAvailable =
    approvalRoute !== undefined && (approvalRoute.rung !== null || approvalRoute.ownerSelfApproval);
  const requestLeaveMutation = useRequestLeave();
  const { data: policy } = useLeavePolicy();
  const leaveMaxDays = useMemo<Record<string, number>>(
    () =>
      Object.fromEntries(
        (policy?.leaveTypes ?? [])
          .filter((t) => t.daysPerYear > 0)
          .map((t) => [t.name, t.daysPerYear]),
      ),
    [policy?.leaveTypes],
  );
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  const canApprove = useCan("hr:leaves:approve");
  const canManage = useCan("hr:leaves:manage");
  const canBackdate = canApprove || canManage;

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    mode: "onTouched",
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

  const startFloor = leaveStartFloor(
    parseDateOnly(joiningDate?.slice(0, 10)),
    canBackdate,
    startOfLocalDay(),
  );
  const leaveStartBounds = {
    fromDate: startFloor,
    fromYear: startFloor.getFullYear(),
    toYear: startOfLocalDay().getFullYear() + 10,
  };
  const leaveEndBounds = planningEndPickerProps({
    startDate: watchedStartDate,
    mode: "onOrAfter",
    floorDate: startFloor,
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

  const validation = useLeaveRequestValidation({
    leaveTypeId: watchedLeaveTypeId,
    startDate: watchedStartDate,
    endDate: effectiveLeaveEnd({ halfDay: watchedHalfDay, startDate: watchedStartDate, endDate: watchedEndDate }),
    halfDay: watchedHalfDay,
    leaveTypes,
    balances,
    existingRequests,
    leaveMaxDays,
  });

  const handleAttachmentUpload = useCallback(
    (url: string) => setAttachmentUrl(url),
    [],
  );

  const onSubmit = useCallback(
    (data: LeaveFormValues) => {
      if (validation.overlapMessage) {
        toast.error(validation.overlapMessage);
        return;
      }
      if (validation.dayLimitError) {
        toast.error(validation.dayLimitError);
        return;
      }
      requestLeaveMutation.mutate(
        {
          leaveTypeId: parseInt(data.leaveTypeId),
          startDate: data.startDate,
          endDate: effectiveLeaveEnd(data),
          reason: data.reason,
          priority: data.priority,
          attachmentUrl: attachmentUrl || undefined,
          isHalfDay: data.halfDay,
          halfDayPeriod: data.halfDay ? data.halfDayPeriod : undefined,
        },
        {
          onSuccess: () => {
            toast.success("Leave request submitted");
            form.reset();
            setAttachmentUrl(null);
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [validation, attachmentUrl, form, onOpenChange, requestLeaveMutation],
  );

  const { isDirty } = form.formState;

  const submitLabel =
    leaveTypes.length === 0
      ? "Set up leave types first"
      : !approverAvailable
        ? "No approver available"
        : validation.overlapMessage
          ? "Dates overlap approved leave"
          : "Submit leave request";

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Request leave"
      description="Fill in the details to submit a leave request"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={submitLabel}
      isPending={requestLeaveMutation.isPending}
      submitDisabled={
        leaveTypes.length === 0 ||
        !approverAvailable ||
        validation.overlapMessage !== null
      }
      isDirty={isDirty}
      onDiscard={form.reset}
    >
      <Form {...form}>
        <LeaveRequestFormFields
          form={form}
          leaveTypes={leaveTypes}
          approvalRoute={approvalRoute}
          balances={balances}
          leaveStartBounds={leaveStartBounds}
          leaveEndBounds={leaveEndBounds}
          onStartDateChange={handleLeaveStartDateChange}
          onAttachmentUpload={handleAttachmentUpload}
          validation={validation}
          pastDatesBlocked={!canBackdate}
        />
      </Form>
    </HrSheet>
  );
}

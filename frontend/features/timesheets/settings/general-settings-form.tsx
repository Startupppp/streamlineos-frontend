"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { generalSettingsSchema, type GeneralSettingsFormValues } from "./general-settings-schema";
import { GeneralSettingsFormFields } from "./general-settings-form-fields";
import {
  useTimesheetSettings,
  useUpdateTimesheetSettings,
} from "@/hooks/api/timesheets-core/settings";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  TimesheetSettings,
  UpdateTimesheetSettingsInput,
} from "@/features/timesheets/types";
import { describeMaterialChanges, materialChangesIn } from "./settings-material-changes";

function toFormValues(s: TimesheetSettings): GeneralSettingsFormValues {
  return {
    workWeekStart: String(s.workWeekStart),
    maxHoursPerDay: s.maxHoursPerDay,
    allowOverlappingEntries: s.allowOverlappingEntries,
    allowBackdatedEntries: s.allowBackdatedEntries,
    backdateLimitDays: s.backdateLimitDays != null ? String(s.backdateLimitDays) : "",
    roundingRule: s.roundingRule,
    requiredFields: s.requiredFields ?? [],
    approvalMode: s.approvalMode === "AUTO" ? "AUTO" : "MANAGER",
    approverSource: s.approverSource,
    clientApprovalEnabled: s.clientApprovalEnabled,
    lockAfterApproval: s.lockAfterApproval,
    lockAfterInvoice: s.lockAfterInvoice,
    allowFutureEntries: s.allowFutureEntries,
    expectedDailyHours: s.expectedDailyHours != null ? String(parseFloat(s.expectedDailyHours)) : "",
    expectedWeeklyHours: s.expectedWeeklyHours != null ? String(parseFloat(s.expectedWeeklyHours)) : "",
    submissionGraceDays: s.submissionGraceDays != null ? String(s.submissionGraceDays) : "",
    changeReason: "",
  };
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function buildChanges(
  values: GeneralSettingsFormValues,
  orig: TimesheetSettings,
): UpdateTimesheetSettingsInput {
  const changes: UpdateTimesheetSettingsInput = {};

  if (String(orig.workWeekStart) !== values.workWeekStart)
    changes.workWeekStart = parseInt(values.workWeekStart);
  if (parseFloat(orig.maxHoursPerDay) !== Number(values.maxHoursPerDay))
    changes.maxHoursPerDay = Number(values.maxHoursPerDay);
  if (orig.allowOverlappingEntries !== values.allowOverlappingEntries)
    changes.allowOverlappingEntries = values.allowOverlappingEntries;
  if (orig.allowBackdatedEntries !== values.allowBackdatedEntries)
    changes.allowBackdatedEntries = values.allowBackdatedEntries;

  const newBackdate =
    values.allowBackdatedEntries && values.backdateLimitDays
      ? parseInt(values.backdateLimitDays) || null
      : null;
  if (orig.backdateLimitDays !== newBackdate)
    changes.backdateLimitDays = newBackdate;

  if (orig.roundingRule !== values.roundingRule)
    changes.roundingRule = values.roundingRule;

  const origFields = orig.requiredFields ?? [];
  const newFields = values.requiredFields;
  const fieldsChanged =
    origFields.length !== newFields.length ||
    origFields.some((f) => !newFields.includes(f)) ||
    newFields.some((f) => !origFields.includes(f));
  if (fieldsChanged) changes.requiredFields = newFields;

  if (orig.approvalMode !== values.approvalMode)
    changes.approvalMode = values.approvalMode;
  if (orig.approverSource !== values.approverSource)
    changes.approverSource = values.approverSource;
  if (orig.clientApprovalEnabled !== values.clientApprovalEnabled)
    changes.clientApprovalEnabled = values.clientApprovalEnabled;
  if (orig.lockAfterApproval !== values.lockAfterApproval)
    changes.lockAfterApproval = values.lockAfterApproval;
  if (orig.lockAfterInvoice !== values.lockAfterInvoice)
    changes.lockAfterInvoice = values.lockAfterInvoice;
  if (orig.allowFutureEntries !== values.allowFutureEntries)
    changes.allowFutureEntries = values.allowFutureEntries;

  const newExpectedDaily = parseOptionalNumber(values.expectedDailyHours);
  if ((orig.expectedDailyHours != null ? parseFloat(orig.expectedDailyHours) : null) !== newExpectedDaily)
    changes.expectedDailyHours = newExpectedDaily;

  const newExpectedWeekly = parseOptionalNumber(values.expectedWeeklyHours);
  if ((orig.expectedWeeklyHours != null ? parseFloat(orig.expectedWeeklyHours) : null) !== newExpectedWeekly)
    changes.expectedWeeklyHours = newExpectedWeekly;

  const newGraceDays = values.submissionGraceDays.trim()
    ? parseInt(values.submissionGraceDays) || null
    : null;
  if (orig.submissionGraceDays !== newGraceDays)
    changes.submissionGraceDays = newGraceDays;

  return changes;
}

export function GeneralSettingsForm() {
  const canManage = useCan("timesheets:settings:manage");
  const { data: settings, isLoading, isError, refetch } = useTimesheetSettings();
  const update = useUpdateTimesheetSettings();

  const form = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      workWeekStart: "1",
      maxHoursPerDay: "8",
      allowOverlappingEntries: false,
      allowBackdatedEntries: false,
      backdateLimitDays: "",
      roundingRule: "NONE",
      requiredFields: [],
      approvalMode: "MANAGER",
      approverSource: "REPORTING_MANAGER",
      clientApprovalEnabled: false,
      lockAfterApproval: false,
      lockAfterInvoice: false,
      allowFutureEntries: false,
      expectedDailyHours: "",
      expectedWeeklyHours: "",
      submissionGraceDays: "",
      changeReason: "",
    },
  });

  const { control, reset, setError, clearErrors } = form;

  const watched = useWatch({ control });
  const pendingMaterial = useMemo(() => {
    if (!settings) return [];
    return materialChangesIn(
      buildChanges(watched as GeneralSettingsFormValues, settings),
    );
  }, [watched, settings]);

  useEffect(() => {
    if (settings) form.reset(toFormValues(settings));
  }, [settings, form]);

  const handleSave = form.handleSubmit((values) => {
    if (!settings) return;
    const changes = buildChanges(values, settings);
    if (Object.keys(changes).length === 0) return;

    const material = materialChangesIn(changes);
    const reason = values.changeReason.trim();
    if (material.length > 0 && !reason) {
      setError("changeReason", {
        type: "required",
        message: `Say why you are changing ${describeMaterialChanges(material)}.`,
      });
      return;
    }
    clearErrors("changeReason");

    update.mutate(
      { ...changes, ...(reason ? { changeReason: reason } : {}) },
      {
        onSuccess: () => reset({ ...values, changeReason: "" }),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  });

  const handleRetry = () => { void refetch(); };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[144, 200, 96, 112, 180].map((h, i) => (
          <Skeleton key={i} className="w-full rounded-xl" style={{ height: h }} />
        ))}
      </div>
    );
  }

  if (isError || !settings) {
    return (
      <ErrorState
        title="Failed to load settings"
        onRetry={handleRetry}
        className="flex-1 min-h-[30dvh]"
      />
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <GeneralSettingsFormFields
        form={form}
        canManage={canManage}
        isPending={update.isPending}
        pendingMaterial={pendingMaterial}
      />
    </form>
  );
}

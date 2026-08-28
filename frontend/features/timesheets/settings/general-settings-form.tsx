"use client";

import { useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoadingButton } from "@/components/ui/loading-button";
import { generalSettingsSchema, type GeneralSettingsFormValues } from "./general-settings-schema";
import {
  useTimesheetSettings,
  useUpdateTimesheetSettings,
} from "@/hooks/api/timesheets-core/settings";
import { useCan } from "@/hooks/api/access";
import type {
  RoundingRule,
  ApprovalMode,
  TimesheetSettings,
  UpdateTimesheetSettingsInput,
} from "@/features/timesheets/types";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";

const WORK_WEEK_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
] as const;

const ROUNDING_OPTIONS: { value: RoundingRule; label: string }[] = [
  { value: "NONE", label: "No rounding" },
  { value: "NEAREST_5", label: "Nearest 5 min" },
  { value: "NEAREST_6", label: "Nearest 6 min" },
  { value: "NEAREST_10", label: "Nearest 10 min" },
  { value: "NEAREST_15", label: "Nearest 15 min" },
  { value: "ROUND_UP", label: "Always round up" },
  { value: "ROUND_DOWN", label: "Always round down" },
];

const APPROVAL_OPTIONS: { value: ApprovalMode; label: string }[] = [
  { value: "AUTO", label: "No approval (auto-approve)" },
  { value: "MANAGER", label: "Manager approval" },
  { value: "MULTI_LEVEL", label: "Multi-level approval" },
];

const REQUIRED_FIELD_OPTIONS = [
  { key: "project", label: "Project" },
  { key: "ticket", label: "Ticket" },
  { key: "description", label: "Description" },
  { key: "billable", label: "Billable flag" },
  { key: "workLink", label: "Work link" },
];

function toFormValues(s: TimesheetSettings): GeneralSettingsFormValues {
  return {
    workWeekStart: String(s.workWeekStart),
    maxHoursPerDay: s.maxHoursPerDay,
    allowOverlappingEntries: s.allowOverlappingEntries,
    allowBackdatedEntries: s.allowBackdatedEntries,
    backdateLimitDays: s.backdateLimitDays != null ? String(s.backdateLimitDays) : "",
    roundingRule: s.roundingRule,
    requiredFields: s.requiredFields ?? [],
    approvalMode: s.approvalMode,
    clientApprovalEnabled: s.clientApprovalEnabled,
    lockAfterApproval: s.lockAfterApproval,
    lockAfterInvoice: s.lockAfterInvoice,
    allowFutureEntries: s.allowFutureEntries,
    expectedDailyHours: s.expectedDailyHours != null ? String(parseFloat(s.expectedDailyHours)) : "",
    expectedWeeklyHours: s.expectedWeeklyHours != null ? String(parseFloat(s.expectedWeeklyHours)) : "",
    submissionGraceDays: s.submissionGraceDays != null ? String(s.submissionGraceDays) : "",
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

  const { control, handleSubmit, reset, register, formState: { isDirty, errors } } = useForm<GeneralSettingsFormValues>({
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
      clientApprovalEnabled: false,
      lockAfterApproval: false,
      lockAfterInvoice: false,
      allowFutureEntries: false,
      expectedDailyHours: "",
      expectedWeeklyHours: "",
      submissionGraceDays: "",
    },
  });

  const allowBackdated = useWatch({ control, name: "allowBackdatedEntries" });

  useEffect(() => {
    if (settings) reset(toFormValues(settings));
  }, [settings, reset]);

  const handleSave = handleSubmit((values) => {
    if (!settings) return;
    const changes = buildChanges(values, settings);
    if (Object.keys(changes).length > 0) {
      update.mutate(changes, {
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    }
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
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-medium">Work week</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Week starts on</Label>
            <Controller
              control={control}
              name="workWeekStart"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!canManage}
                >
                  <SelectTrigger className="h-9 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_WEEK_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-medium">Time entry rules</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Max hours per day</Label>
            <Input
              type="number"
              min={0}
              max={24}
              step={0.5}
              className="w-28"
              disabled={!canManage}
              {...register("maxHoursPerDay")}
            />
            {errors.maxHoursPerDay && <p className="text-xs text-destructive">{errors.maxHoursPerDay.message}</p>}
          </div>
          <div className="flex items-center justify-between py-0.5">
            <Label className="text-xs font-medium">Allow overlapping entries</Label>
            <Controller
              control={control}
              name="allowOverlappingEntries"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!canManage}
                />
              )}
            />
          </div>
          <div className="flex items-center justify-between py-0.5">
            <Label className="text-xs font-medium">Allow future-dated entries</Label>
            <Controller
              control={control}
              name="allowFutureEntries"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!canManage}
                />
              )}
            />
          </div>
          <div className="flex items-center justify-between py-0.5">
            <Label className="text-xs font-medium">Allow backdated entries</Label>
            <Controller
              control={control}
              name="allowBackdatedEntries"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!canManage}
                />
              )}
            />
          </div>
          {allowBackdated && (
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-medium">Backdate limit (days, blank = no limit)</Label>
              <Input
                type="number"
                min={0}
                className="w-28"
                placeholder="No limit"
                disabled={!canManage}
                {...register("backdateLimitDays")}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-medium">Expected hours</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Expected hours per day (blank = not enforced)</Label>
              <Input
                type="number"
                min={0}
                max={24}
                step={0.5}
                className="w-28"
                placeholder="e.g. 8"
                disabled={!canManage}
                {...register("expectedDailyHours")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Expected hours per week (blank = not enforced)</Label>
              <Input
                type="number"
                min={0}
                max={168}
                step={0.5}
                className="w-28"
                placeholder="e.g. 40"
                disabled={!canManage}
                {...register("expectedWeeklyHours")}
              />
            </div>
          </div>
          <p className="text-dense text-muted-foreground">
            Used to detect missing and under-logged timesheets in the exceptions queue.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-medium">Time rounding</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Rounding rule</Label>
            <Controller
              control={control}
              name="roundingRule"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!canManage}
                >
                  <SelectTrigger className="h-9 w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUNDING_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-medium">Required fields</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <Controller
            control={control}
            name="requiredFields"
            render={({ field }) => (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {REQUIRED_FIELD_OPTIONS.map((opt) => {
                  const isChecked = field.value.includes(opt.key);
                  const handleChange = (checked: boolean | "indeterminate") => {
                    if (typeof checked !== "boolean") return;
                    field.onChange(
                      checked
                        ? [...field.value, opt.key]
                        : field.value.filter((k) => k !== opt.key),
                    );
                  };
                  return (
                    <div key={opt.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`req-${opt.key}`}
                        checked={isChecked}
                        onCheckedChange={handleChange}
                        disabled={!canManage}
                      />
                      <Label
                        htmlFor={`req-${opt.key}`}
                        className="text-xs font-normal cursor-pointer"
                      >
                        {opt.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-medium">Approval workflow</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Approval mode</Label>
            <Controller
              control={control}
              name="approvalMode"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!canManage}
                >
                  <SelectTrigger className="h-9 w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPROVAL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex items-center justify-between py-0.5">
            <Label className="text-xs font-medium">Enable client approval</Label>
            <Controller
              control={control}
              name="clientApprovalEnabled"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!canManage}
                />
              )}
            />
          </div>
          <div className="flex items-center justify-between py-0.5">
            <Label className="text-xs font-medium">Lock timesheets after approval</Label>
            <Controller
              control={control}
              name="lockAfterApproval"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!canManage}
                />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Submission grace period (days after week end)</Label>
            <Input
              type="number"
              min={0}
              max={30}
              className="w-28"
              placeholder="e.g. 3"
              disabled={!canManage}
              {...register("submissionGraceDays")}
            />
          </div>
          <div className="flex items-center justify-between py-0.5">
            <Label className="text-xs font-medium">Lock timesheets after invoice</Label>
            <Controller
              control={control}
              name="lockAfterInvoice"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!canManage}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      {canManage && (
        <div className="flex justify-end pb-2">
          <LoadingButton
            type="submit"
            isPending={update.isPending}
            disabled={!isDirty || update.isPending}
            loadingText="Saving…"
          >
            Save changes
          </LoadingButton>
        </div>
      )}
    </form>
  );
}

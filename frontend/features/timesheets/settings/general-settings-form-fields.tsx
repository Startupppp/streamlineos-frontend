"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { RoundingRule, ApprovalMode, ApproverSource } from "@/features/timesheets/types";
import type { GeneralSettingsFormValues } from "./general-settings-schema";
import { CREATE_REQUIRED_FIELDS, requiredFieldLabel } from "./required-fields";
import {
  describeMaterialChanges,
  type materialChangesIn,
} from "./settings-material-changes";

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
];

const APPROVER_SOURCE_OPTIONS: { value: ApproverSource; label: string; description: string }[] = [
  {
    value: "REPORTING_MANAGER",
    label: "Reporting manager",
    description: "The employee's reporting manager approves; if they cannot, it goes to their manager, then the department head, then the timesheet approvals queue.",
  },
  {
    value: "PROJECT_MANAGER",
    label: "Project manager",
    description: "The manager of the project with most of the period's hours approves; periods without a usable project manager fall back to the reporting manager.",
  },
];

const REQUIRED_FIELD_OPTIONS = CREATE_REQUIRED_FIELDS.map((key) => ({
  key,
  label: requiredFieldLabel(key),
}));

interface GeneralSettingsFormFieldsProps {
  form: UseFormReturn<GeneralSettingsFormValues>;
  canManage: boolean;
  isPending: boolean;
  pendingMaterial: ReturnType<typeof materialChangesIn>;
}

export function GeneralSettingsFormFields({
  form,
  canManage,
  isPending,
  pendingMaterial,
}: GeneralSettingsFormFieldsProps) {
  const { control, register, formState: { isDirty, errors } } = form;
  const allowBackdated = useWatch({ control, name: "allowBackdatedEntries" });
  const approvalMode = useWatch({ control, name: "approvalMode" });
  const approverSource = useWatch({ control, name: "approverSource" });
  const approverSourceDescription = APPROVER_SOURCE_OPTIONS.find((opt) => opt.value === approverSource)?.description;

  return (
    <>
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-medium">Work week</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="space-y-1.5">
            <Label htmlFor="timesheet-settings-work-week-start" className="text-xs font-medium">Week starts on</Label>
            <Controller
              control={control}
              name="workWeekStart"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!canManage}
                >
                  <SelectTrigger id="timesheet-settings-work-week-start" className="h-9 w-44">
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
            {errors.maxHoursPerDay && (
              <p className="text-xs text-destructive">{errors.maxHoursPerDay.message}</p>
            )}
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
            <Label htmlFor="timesheet-settings-allow-future-entries" className="text-xs font-medium">Allow future-dated entries</Label>
            <Controller
              control={control}
              name="allowFutureEntries"
              render={({ field }) => (
                <Switch id="timesheet-settings-allow-future-entries"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!canManage}
                />
              )}
            />
          </div>
          <div className="flex items-center justify-between py-0.5">
            <Label htmlFor="timesheet-settings-allow-backdated-entries" className="text-xs font-medium">Allow backdated entries</Label>
            <Controller
              control={control}
              name="allowBackdatedEntries"
              render={({ field }) => (
                <Switch id="timesheet-settings-allow-backdated-entries"
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
            <Label htmlFor="timesheet-settings-approval-mode" className="text-xs font-medium">Approval mode</Label>
            <Controller
              control={control}
              name="approvalMode"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!canManage}
                >
                  <SelectTrigger id="timesheet-settings-approval-mode" className="h-9 w-52">
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
          {approvalMode === "MANAGER" && (
            <div className="space-y-1.5">
              <Label htmlFor="timesheet-settings-approver-source" className="text-xs font-medium">Who approves</Label>
              <Controller
                control={control}
                name="approverSource"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!canManage}
                  >
                    <SelectTrigger id="timesheet-settings-approver-source" className="h-9 w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPROVER_SOURCE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {approverSourceDescription && (
                <p className="text-xs text-muted-foreground">{approverSourceDescription}</p>
              )}
            </div>
          )}
          <div className="flex items-center justify-between py-0.5">
            <Label htmlFor="timesheet-settings-client-approval-enabled" className="text-xs font-medium">Enable client approval</Label>
            <Controller
              control={control}
              name="clientApprovalEnabled"
              render={({ field }) => (
                <Switch id="timesheet-settings-client-approval-enabled"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!canManage}
                />
              )}
            />
          </div>
          <div className="flex items-center justify-between py-0.5">
            <Label htmlFor="timesheet-settings-lock-after-approval" className="text-xs font-medium">Lock timesheets after approval</Label>
            <Controller
              control={control}
              name="lockAfterApproval"
              render={({ field }) => (
                <Switch id="timesheet-settings-lock-after-approval"
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

      {canManage && pendingMaterial.length > 0 && (
        <Card>
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-medium">Why this change?</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-2">
            <p className="text-dense text-muted-foreground">
              You are changing {describeMaterialChanges(pendingMaterial)}. These
              settings decide how past timesheets are read, so the reason is kept
              with the change and shown to whoever asks later why a period was
              treated the way it was.
            </p>
            <Textarea
              {...register("changeReason")}
              rows={3}
              maxLength={500}
              placeholder="e.g. Finance asked for a 5-day grace period from October."
              aria-label="Reason for this change"
              aria-invalid={errors.changeReason ? true : undefined}
            />
            {errors.changeReason && (
              <p role="alert" className="text-dense text-destructive">
                {errors.changeReason.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {canManage && (
        <div className="flex justify-end pb-2">
          <LoadingButton
            type="submit"
            isPending={isPending}
            disabled={!isDirty || isPending}
            loadingText="Saving…"
          >
            Save changes
          </LoadingButton>
        </div>
      )}
    </>
  );
}

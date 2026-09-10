"use client";

import { useCallback } from "react";
import { useController, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingButton } from "@/components/ui/loading-button";
import { useUpdateOrgSettings } from "@/hooks/api/organization";
import type { OrgSettings } from "@/types/organization";
import {
  OrgSettingsCard,
  OrgSettingsEditButton,
  OrgSettingsFormActions,
} from "./org-settings-chrome";
import {
  BUSINESS_DAYS,
  businessHoursSchema,
  mergeBusinessHours,
  type BusinessDayKey,
  type BusinessHoursValues,
} from "./org-business-hours-schema";
import { useOrganizationSettingsForm } from "./use-organization-settings-form";

type BusinessHoursForm = UseFormReturn<
  BusinessHoursValues,
  unknown,
  BusinessHoursValues
>;

interface BusinessHoursDayRowProps {
  form: BusinessHoursForm;
  dayKey: BusinessDayKey;
  short: string;
}

function BusinessHoursDayRow({ form, dayKey, short }: BusinessHoursDayRowProps) {
  const { field: enabledField } = useController({
    control: form.control,
    name: `${dayKey}.enabled`,
  });
  const dayErrors = form.formState.errors[dayKey];
  const timeError = dayErrors?.open?.message ?? dayErrors?.close?.message;

  function handleEnabledChange(checked: boolean | "indeterminate") {
    enabledField.onChange(checked === true);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <div className="flex items-center gap-2 w-20 shrink-0">
        <Checkbox
          id={`bh-${dayKey}`}
          checked={enabledField.value}
          onCheckedChange={handleEnabledChange}
          className="bg-card border-border"
        />
        <Label htmlFor={`bh-${dayKey}`} className="text-sm font-medium cursor-pointer">
          {short}
        </Label>
      </div>
      {enabledField.value ? (
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Input
            type="time"
            aria-label={`${short} opening time`}
            aria-invalid={!!dayErrors?.open}
            className="w-[7.5rem] font-mono"
            {...form.register(`${dayKey}.open`)}
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="time"
            aria-label={`${short} closing time`}
            aria-invalid={!!dayErrors?.close}
            className="w-[7.5rem] font-mono"
            {...form.register(`${dayKey}.close`)}
          />
          {timeError && (
            <p role="alert" className="text-xs text-destructive">
              {timeError}
            </p>
          )}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">Closed</span>
      )}
    </div>
  );
}

interface OrgBusinessHoursSectionProps {
  org: OrgSettings;
  canEdit: boolean;
}

export function OrgBusinessHoursSection({ org, canEdit }: OrgBusinessHoursSectionProps) {
  const mutation = useUpdateOrgSettings();
  const { form, isEditing, isSaving, handleEdit, handleCancel, save } =
    useOrganizationSettingsForm({
      resolver: zodResolver(businessHoursSchema),
      serverValues: mergeBusinessHours(org.businessHours),
      mutation,
      successMessage: "Business hours saved",
    });

  const handleSave = useCallback(
    (values: BusinessHoursValues) => {
      save({ businessHours: values });
    },
    [save],
  );

  function renderDayRow(day: (typeof BUSINESS_DAYS)[number]) {
    return (
      <BusinessHoursDayRow
        key={day.key}
        form={form}
        dayKey={day.key}
        short={day.short}
      />
    );
  }

  const display = mergeBusinessHours(org.businessHours);
  const activeDays = BUSINESS_DAYS.filter((d) => display[d.key].enabled);
  const closedDays = BUSINESS_DAYS.filter((d) => !display[d.key].enabled);

  return (
    <OrgSettingsCard
      title="Business Hours"
      description="Define working days and hours for your organization."
      icon={<Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      action={canEdit && !isEditing ? <OrgSettingsEditButton onClick={handleEdit} /> : undefined}
    >
      {!isEditing ? (
        <div className="space-y-1.5">
          {activeDays.length === 0 ? (
            <p className="text-sm text-muted-foreground">No working days configured.</p>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {activeDays.map((d) => (
                <div key={d.key} className="flex items-baseline gap-2 text-sm min-w-0">
                  <span className="w-20 shrink-0 font-medium">{d.label}</span>
                  <span className="text-muted-foreground font-mono text-xs tabular-nums">
                    {display[d.key].open} – {display[d.key].close}
                  </span>
                </div>
              ))}
            </div>
          )}
          {closedDays.length > 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              Closed: {closedDays.map((d) => d.short).join(", ")}
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-2">
          {BUSINESS_DAYS.map(renderDayRow)}
          <OrgSettingsFormActions onCancel={handleCancel} isPending={isSaving} className="pt-2">
            <LoadingButton
              type="submit"
              size="sm"
              isPending={isSaving}
              className="gap-1.5"
              loadingText="Saving…"
            >
              Save hours
            </LoadingButton>
          </OrgSettingsFormActions>
        </form>
      )}
    </OrgSettingsCard>
  );
}

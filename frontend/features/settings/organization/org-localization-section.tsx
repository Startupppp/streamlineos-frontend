"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Globe } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { useUpdateOrgSettings } from "@/hooks/api/organization";
import type { OrgSettings } from "@/types/organization";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  OrgSettingsCard,
  OrgSettingsEditButton,
  OrgSettingsFormActions,
  SettingsField,
  SettingsFieldGrid,
} from "./org-settings-chrome";
import {
  MONTHS,
  LANGUAGES,
  localizationSchema,
  type LocalizationValues,
  toCurrencyCode,
  extractLocalizationSettings,
} from "./org-localization-schema";
import { LocalizationFormFields } from "./org-localization-form-fields";

const FIELD_KEYS = [
  "timezone",
  "currency",
  "fiscalYearStart",
  "language",
  "dateFormat",
  "timeFormat",
  "numberFormat",
  "weekStartDay",
] as const satisfies readonly (keyof LocalizationValues)[];

const FIELD_LABELS: Record<keyof LocalizationValues, string> = {
  timezone: "Timezone",
  currency: "Currency",
  fiscalYearStart: "Fiscal year starts",
  language: "Language",
  dateFormat: "Date format",
  timeFormat: "Time format",
  numberFormat: "Number format",
  weekStartDay: "Week starts on",
};

interface OrgLocalizationSectionProps {
  org: OrgSettings;
  canEdit: boolean;
}

export function OrgLocalizationSection({ org, canEdit }: OrgLocalizationSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { mutate: updateOrg, isPending } = useUpdateOrgSettings();

  const extracted = extractLocalizationSettings(org.settings);

  const form = useForm<LocalizationValues>({
    resolver: zodResolver(localizationSchema),
    defaultValues: {
      timezone: org.timezone ?? "Asia/Kolkata",
      currency: toCurrencyCode(org.currency),
      fiscalYearStart: org.fiscalYearStart ?? 4,
      language: extracted.language,
      dateFormat: extracted.dateFormat,
      timeFormat: extracted.timeFormat,
      numberFormat: extracted.numberFormat,
      weekStartDay: extracted.weekStartDay,
    },
  });

  const handleEdit = useCallback(() => {
    const ext = extractLocalizationSettings(org.settings);
    form.reset({
      timezone: org.timezone ?? "Asia/Kolkata",
      currency: toCurrencyCode(org.currency),
      fiscalYearStart: org.fiscalYearStart ?? 4,
      language: ext.language,
      dateFormat: ext.dateFormat,
      timeFormat: ext.timeFormat,
      numberFormat: ext.numberFormat,
      weekStartDay: ext.weekStartDay,
    });
    setIsEditing(true);
  }, [org, form]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    form.reset();
  }, [form]);

  const handleSave = useCallback(
    (values: LocalizationValues) => {
      updateOrg(
        {
          timezone: values.timezone,
          currency: values.currency,
          fiscalYearStart: values.fiscalYearStart,
          language: values.language,
          dateFormat: values.dateFormat,
          timeFormat: values.timeFormat,
          numberFormat: values.numberFormat,
          weekStartDay: values.weekStartDay,
        },
        {
          onSuccess: () => {
            toast.success("Localization settings saved");
            setIsEditing(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [updateOrg],
  );

  const displayValues: Record<keyof LocalizationValues, string> = {
    timezone: org.timezone ?? "Asia/Kolkata",
    currency: org.currency ?? "INR",
    fiscalYearStart: MONTHS[(org.fiscalYearStart ?? 4) - 1] ?? "April",
    language: LANGUAGES.find((l) => l.value === extracted.language)?.label ?? extracted.language,
    dateFormat: extracted.dateFormat,
    timeFormat: extracted.timeFormat === "12h" ? "12-hour (2:30 PM)" : "24-hour (14:30)",
    numberFormat: extracted.numberFormat,
    weekStartDay:
      extracted.weekStartDay.charAt(0).toUpperCase() + extracted.weekStartDay.slice(1),
  };

  function renderFieldRow(key: (typeof FIELD_KEYS)[number]) {
    return <SettingsField key={key} label={FIELD_LABELS[key]} value={displayValues[key]} />;
  }

  return (
    <OrgSettingsCard
      title="Localization"
      description="Timezone, currency, language, and date/time format defaults."
      icon={<Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      action={canEdit && !isEditing ? <OrgSettingsEditButton onClick={handleEdit} /> : undefined}
    >
      {!isEditing ? (
        <SettingsFieldGrid>{FIELD_KEYS.map(renderFieldRow)}</SettingsFieldGrid>
      ) : (
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-3">
          <LocalizationFormFields form={form} />
          <OrgSettingsFormActions onCancel={handleCancel} isPending={isPending}>
            <LoadingButton
              type="submit"
              isPending={isPending}
              size="sm"
              className="gap-1.5"
              loadingText="Saving…"
            >
              Save localization
            </LoadingButton>
          </OrgSettingsFormActions>
        </form>
      )}
    </OrgSettingsCard>
  );
}

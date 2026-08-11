"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Globe } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST, UTC+5:30)" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST, UTC+4)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT, UTC+8)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST, UTC+9)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
] as const;

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "JPY", label: "JPY — Japanese Yen" },
] as const;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
  { value: "pt", label: "Portuguese" },
  { value: "ar", label: "Arabic" },
  { value: "zh", label: "Chinese (Simplified)" },
  { value: "ja", label: "Japanese" },
] as const;

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2026)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2026)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2026-12-31)" },
  { value: "DD-MMM-YYYY", label: "DD-MMM-YYYY (31-Dec-2026)" },
] as const;

const TIME_FORMATS = [
  { value: "12h", label: "12-hour (2:30 PM)" },
  { value: "24h", label: "24-hour (14:30)" },
] as const;

const NUMBER_FORMATS = [
  { value: "1,234.56", label: "1,234.56 (comma thousands, period decimal)" },
  { value: "1.234,56", label: "1.234,56 (period thousands, comma decimal)" },
  { value: "1 234.56", label: "1 234.56 (space thousands, period decimal)" },
] as const;

const WEEK_START_DAYS = [
  { value: "monday", label: "Monday" },
  { value: "sunday", label: "Sunday" },
  { value: "saturday", label: "Saturday" },
] as const;

const localizationSchema = z.object({
  timezone: z.string().min(1),
  currency: z.string().min(1),
  fiscalYearStart: z.number().int().min(1).max(12),
  language: z.string().min(1),
  dateFormat: z.string().min(1),
  timeFormat: z.enum(["12h", "24h"]),
  numberFormat: z.string().min(1),
  weekStartDay: z.enum(["monday", "sunday", "saturday"]),
});

type LocalizationValues = z.infer<typeof localizationSchema>;

function extractSettings(settings: Record<string, unknown> | null | undefined) {
  const timeFormat = settings?.timeFormat === "12h" || settings?.timeFormat === "24h"
    ? (settings.timeFormat as "12h" | "24h")
    : ("12h" as const);
  const weekStartDay = settings?.weekStartDay === "monday" || settings?.weekStartDay === "sunday" || settings?.weekStartDay === "saturday"
    ? (settings.weekStartDay as "monday" | "sunday" | "saturday")
    : ("monday" as const);
  return {
    language: typeof settings?.language === "string" ? settings.language : "en",
    dateFormat: typeof settings?.dateFormat === "string" ? settings.dateFormat : "DD/MM/YYYY",
    timeFormat,
    numberFormat: typeof settings?.numberFormat === "string" ? settings.numberFormat : "1,234.56",
    weekStartDay,
  };
}

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

  const extracted = extractSettings(org.settings);

  const form = useForm<LocalizationValues>({
    resolver: zodResolver(localizationSchema),
    defaultValues: {
      timezone: org.timezone ?? "Asia/Kolkata",
      currency: org.currency ?? "INR",
      fiscalYearStart: org.fiscalYearStart ?? 4,
      language: extracted.language,
      dateFormat: extracted.dateFormat,
      timeFormat: extracted.timeFormat,
      numberFormat: extracted.numberFormat,
      weekStartDay: extracted.weekStartDay,
    },
  });

  const handleEdit = useCallback(() => {
    const ext = extractSettings(org.settings);
    form.reset({
      timezone: org.timezone ?? "Asia/Kolkata",
      currency: org.currency ?? "INR",
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

  const handleSave = useCallback((values: LocalizationValues) => {
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
  }, [updateOrg]);

  const displayValues: Record<keyof LocalizationValues, string> = {
    timezone: org.timezone ?? "Asia/Kolkata",
    currency: org.currency ?? "INR",
    fiscalYearStart: MONTHS[(org.fiscalYearStart ?? 4) - 1] ?? "April",
    language: LANGUAGES.find((l) => l.value === extracted.language)?.label ?? extracted.language,
    dateFormat: extracted.dateFormat,
    timeFormat: extracted.timeFormat === "12h" ? "12-hour (2:30 PM)" : "24-hour (14:30)",
    numberFormat: extracted.numberFormat,
    weekStartDay: extracted.weekStartDay.charAt(0).toUpperCase() + extracted.weekStartDay.slice(1),
  };

  return (
    <OrgSettingsCard
      title="Localization"
      description="Timezone, currency, language, and date/time format defaults."
      icon={<Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      action={canEdit && !isEditing ? <OrgSettingsEditButton onClick={handleEdit} /> : undefined}
    >
      {!isEditing ? (
        <SettingsFieldGrid>
          {(Object.keys(FIELD_LABELS) as (keyof LocalizationValues)[]).map((key) => (
            <SettingsField key={key} label={FIELD_LABELS[key]} value={displayValues[key]} />
          ))}
        </SettingsFieldGrid>
      ) : (
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Timezone</Label>
              <Select onValueChange={(v) => form.setValue("timezone", v)} value={form.watch("timezone")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                  {TIMEZONES.map((tz) => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Currency</Label>
              <Select onValueChange={(v) => form.setValue("currency", v)} value={form.watch("currency")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                  {CURRENCIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Fiscal year starts</Label>
              <Select onValueChange={(v) => form.setValue("fiscalYearStart", parseInt(v))} value={String(form.watch("fiscalYearStart"))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Language</Label>
              <Select onValueChange={(v) => form.setValue("language", v)} value={form.watch("language")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Date format</Label>
              <Select onValueChange={(v) => form.setValue("dateFormat", v)} value={form.watch("dateFormat")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                  {DATE_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Time format</Label>
              <Select onValueChange={(v) => form.setValue("timeFormat", v as "12h" | "24h")} value={form.watch("timeFormat")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Number format</Label>
              <Select onValueChange={(v) => form.setValue("numberFormat", v)} value={form.watch("numberFormat")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                  {NUMBER_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Week starts on</Label>
              <Select onValueChange={(v) => form.setValue("weekStartDay", v as "monday" | "sunday" | "saturday")} value={form.watch("weekStartDay")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEK_START_DAYS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <OrgSettingsFormActions onCancel={handleCancel} isPending={isPending}>
            <LoadingButton type="submit" isPending={isPending} size="sm" className="gap-1.5" loadingText="Saving…">
              Save localization
            </LoadingButton>
          </OrgSettingsFormActions>
        </form>
      )}
    </OrgSettingsCard>
  );
}

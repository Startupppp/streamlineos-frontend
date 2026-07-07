"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Pencil, Globe } from "lucide-react";
import { toast } from "sonner";
import { useUpdateOrgSettings } from "@/hooks/api/organization";
import type { OrgSettings } from "@/types/organization";
import { getErrorMessage } from "@/lib/get-error-message";

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
        currency: values.currency as "USD" | "EUR" | "INR" | "GBP" | "AED",
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

  const displayValues = {
    timezone: org.timezone ?? "Asia/Kolkata",
    currency: org.currency ?? "INR",
    fiscalYearStart: MONTHS[(org.fiscalYearStart ?? 4) - 1],
    language: LANGUAGES.find((l) => l.value === extracted.language)?.label ?? extracted.language,
    dateFormat: extracted.dateFormat,
    timeFormat: extracted.timeFormat === "12h" ? "12-hour (2:30 PM)" : "24-hour (14:30)",
    numberFormat: extracted.numberFormat,
    weekStartDay: extracted.weekStartDay.charAt(0).toUpperCase() + extracted.weekStartDay.slice(1),
  };

  return (
    <Card className="rounded-lg border border-border">
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-600" />
            Localization
          </CardTitle>
          <CardDescription>Timezone, currency, language, and date/time format defaults.</CardDescription>
        </div>
        {canEdit && !isEditing && (
          <Button variant="outline" size="sm" onClick={handleEdit} className="gap-1.5 h-8 text-xs">
            <Pencil className="h-3 w-3" /> Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="pb-5">
        {!isEditing ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {(Object.entries(displayValues) as [string, string][]).map(([key, val]) => (
              <div key={key} className="space-y-0.5">
                <p className="text-sm font-medium text-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
                <p className="text-sm">{val}</p>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Timezone</Label>
                <Select onValueChange={(v) => form.setValue("timezone", v)} value={form.watch("timezone")}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMEZONES.map((tz) => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Currency</Label>
                <Select onValueChange={(v) => form.setValue("currency", v)} value={form.watch("currency")}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Fiscal year starts</Label>
                <Select onValueChange={(v) => form.setValue("fiscalYearStart", parseInt(v))} value={String(form.watch("fiscalYearStart"))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Language</Label>
                <Select onValueChange={(v) => form.setValue("language", v)} value={form.watch("language")}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Date format</Label>
                <Select onValueChange={(v) => form.setValue("dateFormat", v)} value={form.watch("dateFormat")}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{DATE_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Time format</Label>
                <Select onValueChange={(v) => form.setValue("timeFormat", v as "12h" | "24h")} value={form.watch("timeFormat")}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIME_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Number format</Label>
                <Select onValueChange={(v) => form.setValue("numberFormat", v)} value={form.watch("numberFormat")}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{NUMBER_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Week starts on</Label>
                <Select onValueChange={(v) => form.setValue("weekStartDay", v as "monday" | "sunday" | "saturday")} value={form.watch("weekStartDay")}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{WEEK_START_DAYS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isPending} size="sm" className="gap-1.5">
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isPending ? "Saving…" : "Save localization"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

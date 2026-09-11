"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UseFormReturn } from "react-hook-form";
import {
  TIMEZONES,
  CURRENCIES,
  MONTHS,
  LANGUAGES,
  DATE_FORMATS,
  TIME_FORMATS,
  NUMBER_FORMATS,
  WEEK_START_DAYS,
  TIME_FORMAT_VALUES,
  WEEK_START_DAY_VALUES,
  type LocalizationValues,
  toCurrencyCode,
} from "./org-localization-schema";

interface LocalizationFormFieldsProps {
  form: UseFormReturn<LocalizationValues>;
}

export function LocalizationFormFields({ form }: LocalizationFormFieldsProps) {
  function handleTimezoneChange(value: string) {
    form.setValue("timezone", value);
  }

  function handleCurrencySelected(value: string) {
    form.setValue("currency", toCurrencyCode(value));
  }

  function handleFiscalYearStartSelected(value: string) {
    form.setValue("fiscalYearStart", Number(value));
  }

  function handleLanguageChange(value: string) {
    form.setValue("language", value);
  }

  function handleDateFormatChange(value: string) {
    form.setValue("dateFormat", value);
  }

  function handleTimeFormatChange(value: string) {
    const next = TIME_FORMAT_VALUES.find((candidate) => candidate === value);
    if (next) form.setValue("timeFormat", next);
  }

  function handleNumberFormatChange(value: string) {
    form.setValue("numberFormat", value);
  }

  function handleWeekStartDayChange(value: string) {
    const next = WEEK_START_DAY_VALUES.find((candidate) => candidate === value);
    if (next) form.setValue("weekStartDay", next);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1">
        <Label htmlFor="org-localization-timezone" className="text-xs font-medium">Timezone</Label>
        <Select onValueChange={handleTimezoneChange} value={form.watch("timezone")}>
          <SelectTrigger id="org-localization-timezone"><SelectValue /></SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            {TIMEZONES.map((tz) => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="org-localization-currency" className="text-xs font-medium">Currency</Label>
        <Select onValueChange={handleCurrencySelected} value={form.watch("currency")}>
          <SelectTrigger id="org-localization-currency"><SelectValue /></SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            {CURRENCIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="org-localization-fiscal-year-start" className="text-xs font-medium">Fiscal year starts</Label>
        <Select onValueChange={handleFiscalYearStartSelected} value={String(form.watch("fiscalYearStart"))}>
          <SelectTrigger id="org-localization-fiscal-year-start"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="org-localization-language" className="text-xs font-medium">Language</Label>
        <Select onValueChange={handleLanguageChange} value={form.watch("language")}>
          <SelectTrigger id="org-localization-language"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="org-localization-date-format" className="text-xs font-medium">Date format</Label>
        <Select onValueChange={handleDateFormatChange} value={form.watch("dateFormat")}>
          <SelectTrigger id="org-localization-date-format"><SelectValue /></SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            {DATE_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="org-localization-time-format" className="text-xs font-medium">Time format</Label>
        <Select onValueChange={handleTimeFormatChange} value={form.watch("timeFormat")}>
          <SelectTrigger id="org-localization-time-format"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIME_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="org-localization-number-format" className="text-xs font-medium">Number format</Label>
        <Select onValueChange={handleNumberFormatChange} value={form.watch("numberFormat")}>
          <SelectTrigger id="org-localization-number-format"><SelectValue /></SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            {NUMBER_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="org-localization-week-start-day" className="text-xs font-medium">Week starts on</Label>
        <Select onValueChange={handleWeekStartDayChange} value={form.watch("weekStartDay")}>
          <SelectTrigger id="org-localization-week-start-day"><SelectValue /></SelectTrigger>
          <SelectContent>
            {WEEK_START_DAYS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

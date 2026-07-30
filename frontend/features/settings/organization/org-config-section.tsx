"use client";

import { SlidersHorizontal } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  OrgSettingsCard,
  OrgSettingsEditButton,
  OrgSettingsFormActions,
  SettingsField,
  SettingsFieldGrid,
} from "./org-settings-chrome";

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "AED", label: "AED — UAE Dirham" },
] as const;

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

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

interface OrgConfigData {
  timezone?: string | null;
  currency?: string | null;
  fiscalYearStart?: number | null;
  directoryPublic?: boolean | null;
}

interface OrgConfigSectionProps {
  org: OrgConfigData;
  isEditingConfig: boolean;
  timezone: string;
  currency: string;
  fiscalYearStart: string;
  directoryPublic: boolean;
  isUpdating: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onTimezoneChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onFiscalYearStartChange: (value: string) => void;
  onDirectoryPublicChange: (checked: boolean) => void;
}

export function OrgConfigSection({
  org,
  isEditingConfig,
  timezone,
  currency,
  fiscalYearStart,
  directoryPublic,
  isUpdating,
  onStartEdit,
  onCancel,
  onSave,
  onTimezoneChange,
  onCurrencyChange,
  onFiscalYearStartChange,
  onDirectoryPublicChange,
}: OrgConfigSectionProps) {
  const fiscalLabel =
    MONTHS.find((m) => m.value === (org.fiscalYearStart ?? 4))?.label ?? "April";

  return (
    <OrgSettingsCard
      title="App Configuration"
      description="Currency, timezone, fiscal year, and directory visibility."
      icon={<SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      action={!isEditingConfig ? <OrgSettingsEditButton onClick={onStartEdit} /> : undefined}
    >
      {!isEditingConfig ? (
        <div className="space-y-3">
          <SettingsFieldGrid>
            <SettingsField label="Timezone" value={org.timezone ?? "Asia/Kolkata"} />
            <SettingsField label="Default currency" value={org.currency ?? "INR"} />
            <SettingsField label="Fiscal year start" value={fiscalLabel} />
            <SettingsField
              label="Public employee directory"
              value={org.directoryPublic ? "Enabled" : "Disabled"}
            />
          </SettingsFieldGrid>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="timezone" className="text-xs font-medium">Timezone</Label>
              <Select value={timezone} onValueChange={onTimezoneChange}>
                <SelectTrigger id="timezone" aria-label="Timezone" className="h-8">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="currency" className="text-xs font-medium">Default currency</Label>
              <Select value={currency} onValueChange={onCurrencyChange}>
                <SelectTrigger id="currency" aria-label="Default currency" className="h-8">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="fiscal-year" className="text-xs font-medium">Fiscal year start</Label>
              <Select value={fiscalYearStart} onValueChange={onFiscalYearStartChange}>
                <SelectTrigger id="fiscal-year" aria-label="Fiscal year start month" className="h-8">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-md border border-border/60 px-3 py-2.5">
            <div className="min-w-0 space-y-0.5">
              <Label className="text-sm font-medium">Public employee directory</Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Allow members to view the full employee directory. When off, only HR and admins can browse it.
              </p>
            </div>
            <Switch
              checked={directoryPublic}
              onCheckedChange={onDirectoryPublicChange}
              aria-label="Public employee directory"
              className="shrink-0 mt-0.5"
            />
          </div>

          <OrgSettingsFormActions onCancel={onCancel} isPending={isUpdating}>
            <LoadingButton onClick={onSave} isPending={isUpdating} size="sm" className="h-8" loadingText="Saving…">
              Save configuration
            </LoadingButton>
          </OrgSettingsFormActions>
        </div>
      )}
    </OrgSettingsCard>
  );
}

"use client";

import { useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { SlidersHorizontal } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { useUpdateOrgSettings } from "@/hooks/api/organization";
import type { OrgSettings } from "@/types/organization";
import {
  OrgSettingsCard,
  OrgSettingsEditButton,
  OrgSettingsFormActions,
  SettingsField,
  SettingsFieldGrid,
} from "./org-settings-chrome";
import { CURRENCIES, TIMEZONES } from "./org-localization-schema";
import {
  FISCAL_MONTH_OPTIONS,
  fiscalMonthLabel,
  orgConfigSchema,
  toConfigValues,
  type OrgConfigValues,
} from "./org-config-schema";
import { useOrganizationSettingsForm } from "./use-organization-settings-form";

interface OrgConfigSectionProps {
  org: OrgSettings;
  canEdit: boolean;
}

export function OrgConfigSection({ org, canEdit }: OrgConfigSectionProps) {
  const mutation = useUpdateOrgSettings();
  const { form, isEditing, isSaving, handleEdit, handleCancel, save } =
    useOrganizationSettingsForm({
      resolver: zodResolver(orgConfigSchema),
      serverValues: toConfigValues(org),
      mutation,
      successMessage: "App configuration saved",
    });

  const handleSave = useCallback(
    (values: OrgConfigValues) => {
      save({
        timezone: values.timezone,
        currency: values.currency,
        fiscalYearStart: Number(values.fiscalYearStart),
        directoryPublic: values.directoryPublic,
      });
    },
    [save],
  );

  return (
    <OrgSettingsCard
      title="App Configuration"
      description="Currency, timezone, fiscal year, and directory visibility."
      icon={<SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      action={canEdit && !isEditing ? <OrgSettingsEditButton onClick={handleEdit} /> : undefined}
    >
      {!isEditing ? (
        <SettingsFieldGrid>
          <SettingsField label="Timezone" value={org.timezone ?? "Asia/Kolkata"} />
          <SettingsField label="Default currency" value={org.currency ?? "INR"} />
          <SettingsField label="Fiscal year start" value={fiscalMonthLabel(org.fiscalYearStart)} />
          <SettingsField
            label="Public employee directory"
            value={org.directoryPublic ? "Enabled" : "Disabled"}
          />
        </SettingsFieldGrid>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-xs">Timezone</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger aria-label="Timezone">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-xs">Default currency</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger aria-label="Default currency">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fiscalYearStart"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-xs">Fiscal year start</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger aria-label="Fiscal year start month">
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                        {FISCAL_MONTH_OPTIONS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="directoryPublic"
              render={({ field }) => (
                <FormItem className="flex items-start justify-between gap-3 rounded-md border border-border/60 px-3 py-2.5">
                  <div className="min-w-0 space-y-0.5">
                    <Label className="text-sm font-medium">Public employee directory</Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Allow members to view the full employee directory. When off, only HR and admins can browse it.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Public employee directory"
                      className="shrink-0 mt-0.5"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <OrgSettingsFormActions onCancel={handleCancel} isPending={isSaving}>
              <LoadingButton type="submit" isPending={isSaving} size="sm" loadingText="Saving…">
                Save configuration
              </LoadingButton>
            </OrgSettingsFormActions>
          </form>
        </Form>
      )}
    </OrgSettingsCard>
  );
}

"use client";

import { useEffect } from "react";
import { useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSignSettings, useUpdateSignSettings } from "@/hooks/api/sign/settings";
import { numericFieldChange } from "@/lib/numeric-field";
import { SETTINGS_NUMBER_ROW, SettingsGroup, SettingsSurface } from "./settings-surface";

const generalSettingsSchema = z.object({
  defaultExpirationDays: z.number().int().min(1).max(365).optional(),
  expirationWarningDays: z.number().int().min(0).max(60).optional(),
  defaultReminderFirstAfterDays: z.number().int().min(1).max(30).optional(),
  defaultReminderRepeatDays: z.number().int().min(1).max(30).optional(),
  defaultReminderMaxCount: z.number().int().min(0).max(100).optional(),
  maxFileSizeMb: z.number().int().min(1).max(100).optional(),
  bulkSendMaxRowsPerJob: z.number().int().min(1).max(100000).optional(),
  bulkSendMaxActiveJobs: z.number().int().min(1).max(100).optional(),
});

type GeneralSettingsValues = z.infer<typeof generalSettingsSchema>;

const GROUPS: { title: string; fields: { name: keyof GeneralSettingsValues; label: string; description: string }[] }[] = [
  {
    title: "Expiration",
    fields: [
      {
        name: "defaultExpirationDays",
        label: "Default expiration",
        description: "Days until a new envelope closes, when the sender does not pick a date.",
      },
      {
        name: "expirationWarningDays",
        label: "Warning",
        description: "Days before expiry when signers are told the envelope is about to close.",
      },
    ],
  },
  {
    title: "Reminders",
    fields: [
      {
        name: "defaultReminderFirstAfterDays",
        label: "First reminder",
        description: "Days after sending before the first reminder goes out.",
      },
      {
        name: "defaultReminderRepeatDays",
        label: "Repeat every",
        description: "Days between later reminders.",
      },
      {
        name: "defaultReminderMaxCount",
        label: "Stop after",
        description: "Reminders end after this many, even if the envelope is still open.",
      },
    ],
  },
  {
    title: "Limits",
    fields: [
      {
        name: "maxFileSizeMb",
        label: "Max file size",
        description: "Largest PDF a sender can upload, in megabytes.",
      },
      {
        name: "bulkSendMaxRowsPerJob",
        label: "Bulk send rows",
        description: "Most recipients one bulk send can include.",
      },
      {
        name: "bulkSendMaxActiveJobs",
        label: "Active bulk sends",
        description: "How many bulk sends can run at the same time.",
      },
    ],
  },
];

function NumberSetting({
  control,
  name,
  label,
  description,
}: {
  control: Control<GeneralSettingsValues>;
  name: keyof GeneralSettingsValues;
  label: string;
  description: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={SETTINGS_NUMBER_ROW}>
          <div className="min-w-0">
            <FormLabel>{label}</FormLabel>
            <FormDescription className="mt-0.5">{description}</FormDescription>
          </div>
          <div>
            <FormControl>
              <Input
                type="number"
                className="tabular-nums sm:text-right"
                value={field.value ?? ""}
                onChange={numericFieldChange(field.onChange)}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}

export function GeneralSettingsForm() {
  const { data: settings } = useSignSettings();
  const update = useUpdateSignSettings();

  const form = useForm<GeneralSettingsValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      defaultExpirationDays: undefined,
      expirationWarningDays: undefined,
      defaultReminderFirstAfterDays: undefined,
      defaultReminderRepeatDays: undefined,
      defaultReminderMaxCount: undefined,
      maxFileSizeMb: undefined,
      bulkSendMaxRowsPerJob: undefined,
      bulkSendMaxActiveJobs: undefined,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        defaultExpirationDays: settings.defaultExpirationDays ?? undefined,
        expirationWarningDays: settings.expirationWarningDays ?? undefined,
        defaultReminderFirstAfterDays: settings.defaultReminderFirstAfterDays ?? undefined,
        defaultReminderRepeatDays: settings.defaultReminderRepeatDays ?? undefined,
        defaultReminderMaxCount: settings.defaultReminderMaxCount ?? undefined,
        maxFileSizeMb: settings.maxFileSizeMb ?? undefined,
        bulkSendMaxRowsPerJob: settings.bulkSendMaxRowsPerJob ?? undefined,
        bulkSendMaxActiveJobs: settings.bulkSendMaxActiveJobs ?? undefined,
      });
    }
  }, [settings, form]);

  async function handleSave(values: GeneralSettingsValues) {
    try {
      await update.mutateAsync(values);
      toast.success("Settings saved");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  if (!settings) return null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)}>
        <SettingsSurface
          title="Defaults"
          description="Used when a sender does not set these on an individual envelope."
          footer={
            <LoadingButton type="submit" isPending={update.isPending} loadingText="Saving…">
              Save
            </LoadingButton>
          }
        >
          {GROUPS.map((group) => (
            <SettingsGroup key={group.title} title={group.title}>
              {group.fields.map((item) => (
                <NumberSetting
                  key={item.name}
                  control={form.control}
                  name={item.name}
                  label={item.label}
                  description={item.description}
                />
              ))}
            </SettingsGroup>
          ))}
        </SettingsSurface>
      </form>
    </Form>
  );
}

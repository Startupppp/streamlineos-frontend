"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSignSettings, useUpdateSignSettings } from "@/hooks/api/sign/settings";
import { numericFieldChange } from "@/lib/numeric-field";

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
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Defaults &amp; limits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="defaultExpirationDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default expiration (days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={numericFieldChange(field.onChange)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expirationWarningDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration warning (days before)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={numericFieldChange(field.onChange)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultReminderFirstAfterDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First reminder after (days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={numericFieldChange(field.onChange)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultReminderRepeatDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repeat reminder every (days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={numericFieldChange(field.onChange)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultReminderMaxCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max reminders</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={numericFieldChange(field.onChange)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxFileSizeMb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max file size (MB)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={numericFieldChange(field.onChange)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bulkSendMaxRowsPerJob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bulk send max rows/job</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={numericFieldChange(field.onChange)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bulkSendMaxActiveJobs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bulk send max active jobs</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={numericFieldChange(field.onChange)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <LoadingButton type="submit" isPending={update.isPending} loadingText="Saving…">
              Save
            </LoadingButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

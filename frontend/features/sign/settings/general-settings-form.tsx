"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSignSettings, useUpdateSignSettings } from "@/hooks/api/sign/settings";
import type { SignOrgSettings } from "@/types/sign";

export function GeneralSettingsForm() {
  const { data: settings } = useSignSettings();
  const update = useUpdateSignSettings();
  const [form, setForm] = useState<Partial<SignOrgSettings>>({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  async function handleSave() {
    try {
      await update.mutateAsync({
        defaultExpirationDays: form.defaultExpirationDays,
        expirationWarningDays: form.expirationWarningDays,
        defaultReminderFirstAfterDays: form.defaultReminderFirstAfterDays,
        defaultReminderRepeatDays: form.defaultReminderRepeatDays,
        defaultReminderMaxCount: form.defaultReminderMaxCount,
        maxFileSizeMb: form.maxFileSizeMb,
        publicFormsEnabled: form.publicFormsEnabled,
        bulkSendMaxRowsPerJob: form.bulkSendMaxRowsPerJob,
        bulkSendMaxActiveJobs: form.bulkSendMaxActiveJobs,
      });
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Default expiration (days)</Label>
            <Input
              type="number"
              value={form.defaultExpirationDays ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, defaultExpirationDays: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Expiration warning (days before)</Label>
            <Input
              type="number"
              value={form.expirationWarningDays ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, expirationWarningDays: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>First reminder after (days)</Label>
            <Input
              type="number"
              value={form.defaultReminderFirstAfterDays ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, defaultReminderFirstAfterDays: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Repeat reminder every (days)</Label>
            <Input
              type="number"
              value={form.defaultReminderRepeatDays ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, defaultReminderRepeatDays: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max reminders</Label>
            <Input
              type="number"
              value={form.defaultReminderMaxCount ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, defaultReminderMaxCount: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max file size (MB)</Label>
            <Input
              type="number"
              value={form.maxFileSizeMb ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, maxFileSizeMb: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Bulk send max rows/job</Label>
            <Input
              type="number"
              value={form.bulkSendMaxRowsPerJob ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, bulkSendMaxRowsPerJob: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Bulk send max active jobs</Label>
            <Input
              type="number"
              value={form.bulkSendMaxActiveJobs ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, bulkSendMaxActiveJobs: Number(e.target.value) }))}
            />
          </div>
        </div>
        <label className="flex items-center gap-2.5 text-sm cursor-pointer">
          <Switch checked={form.publicFormsEnabled ?? false} onCheckedChange={(v) => setForm((f) => ({ ...f, publicFormsEnabled: v }))} />
          Allow public signing forms
        </label>
        <LoadingButton onClick={handleSave} isPending={update.isPending} loadingText="Saving…">
          Save
        </LoadingButton>
      </CardContent>
    </Card>
  );
}

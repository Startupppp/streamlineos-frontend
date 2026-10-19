"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { calendarWorkflowChannels, type CalendarWorkflowChannel, type CalendarWorkflowPolicy } from "@/hooks/api/calendar-workflows-schema";
import { useUpdateCalendarWorkflowPolicy } from "@/hooks/api/calendar-workflows";

export function CalendarWorkflowPolicyCard({ policy }: { policy: CalendarWorkflowPolicy }) {
  const update = useUpdateCalendarWorkflowPolicy();
  const [enabled, setEnabled] = useState(policy.enabled);
  const [dryRun, setDryRun] = useState(policy.dryRun);
  const [channels, setChannels] = useState<CalendarWorkflowChannel[]>(policy.allowedChannels);
  const [maxRules, setMaxRules] = useState(String(policy.maxRules));
  const [perEvent, setPerEvent] = useState(String(policy.maxEffectsPerEvent));
  const [perDay, setPerDay] = useState(String(policy.maxEffectsPerDay));
  const [quietEnabled, setQuietEnabled] = useState(policy.quietHoursStart !== null);
  const [quietStart, setQuietStart] = useState(policy.quietHoursStart ?? "22:00");
  const [quietEnd, setQuietEnd] = useState(policy.quietHoursEnd ?? "08:00");
  const [quietTimezone, setQuietTimezone] = useState(policy.quietHoursTimezone ?? "UTC");
  const [quietBehavior, setQuietBehavior] = useState<"delay" | "skip">(policy.quietHoursBehavior ?? "delay");

  useEffect(() => {
    setEnabled(policy.enabled);
    setDryRun(policy.dryRun);
    setChannels(policy.allowedChannels);
    setMaxRules(String(policy.maxRules));
    setPerEvent(String(policy.maxEffectsPerEvent));
    setPerDay(String(policy.maxEffectsPerDay));
    setQuietEnabled(policy.quietHoursStart !== null);
    setQuietStart(policy.quietHoursStart ?? "22:00");
    setQuietEnd(policy.quietHoursEnd ?? "08:00");
    setQuietTimezone(policy.quietHoursTimezone ?? "UTC");
    setQuietBehavior(policy.quietHoursBehavior ?? "delay");
  }, [policy]);

  function toggleChannel(channel: CalendarWorkflowChannel, checked: boolean) {
    setChannels((current) => checked
      ? [...current, channel]
      : current.filter((value) => value !== channel));
  }

  async function save() {
    if (channels.length === 0) {
      toast.error("Select at least one delivery channel");
      return;
    }
    const quietHours = quietEnabled
      ? { quietHoursStart: quietStart, quietHoursEnd: quietEnd, quietHoursTimezone: quietTimezone, quietHoursBehavior: quietBehavior }
      : { quietHoursStart: null, quietHoursEnd: null, quietHoursTimezone: null, quietHoursBehavior: null };
    try {
      await update.mutateAsync({
        expectedVersion: policy.version,
        enabled,
        dryRun,
        allowedChannels: channels,
        maxRules: Number(maxRules),
        maxEffectsPerEvent: Number(perEvent),
        maxEffectsPerDay: Number(perDay),
        ...quietHours,
      });
      toast.success("Workflow policy updated");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution policy</CardTitle>
        <CardDescription>Every queued effect checks this policy and current recipient consent immediately before delivery.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div><Label htmlFor="workflow-enabled">Automation</Label><p className="text-xs text-muted-foreground">Allow active rules to produce effects.</p></div>
            <Switch id="workflow-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div><Label htmlFor="workflow-dry-run">Dry run</Label><p className="text-xs text-muted-foreground">Record matches without sending messages.</p></div>
            <Switch id="workflow-dry-run" checked={dryRun} onCheckedChange={setDryRun} />
          </div>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Allowed channels</legend>
          <div className="flex flex-wrap gap-3">
            {calendarWorkflowChannels.map((channel) => (
              <Label key={channel} className="flex items-center gap-2 rounded-md border px-3 py-2 font-normal">
                <Checkbox checked={channels.includes(channel)} onCheckedChange={(value) => toggleChannel(channel, value === true)} />
                {channel.replace("_", " ")}
              </Label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5"><Label htmlFor="workflow-max-rules">Maximum rules</Label><Input id="workflow-max-rules" type="number" min={1} max={250} value={maxRules} onChange={(event) => setMaxRules(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="workflow-per-event">Maximum effects per event</Label><Input id="workflow-per-event" type="number" min={1} max={500} value={perEvent} onChange={(event) => setPerEvent(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="workflow-per-day">Maximum effects per day</Label><Input id="workflow-per-day" type="number" min={1} max={100000} value={perDay} onChange={(event) => setPerDay(event.target.value)} /></div>
        </div>
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="workflow-quiet-enabled">Quiet hours</Label>
              <p className="text-xs text-muted-foreground">Suppress or delay notifications outside business hours.</p>
            </div>
            <Switch id="workflow-quiet-enabled" checked={quietEnabled} onCheckedChange={setQuietEnabled} />
          </div>
          {quietEnabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="workflow-quiet-start">Start time (HH:MM)</Label>
                <Input id="workflow-quiet-start" type="text" placeholder="22:00" value={quietStart} onChange={(event) => setQuietStart(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="workflow-quiet-end">End time (HH:MM)</Label>
                <Input id="workflow-quiet-end" type="text" placeholder="08:00" value={quietEnd} onChange={(event) => setQuietEnd(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="workflow-quiet-tz">Timezone</Label>
                <Input id="workflow-quiet-tz" type="text" placeholder="UTC" value={quietTimezone} onChange={(event) => setQuietTimezone(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="workflow-quiet-behavior">Behavior</Label>
                <Select value={quietBehavior} onValueChange={(value) => setQuietBehavior(value as "delay" | "skip")}>
                  <SelectTrigger id="workflow-quiet-behavior">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delay">Delay until window ends</SelectItem>
                    <SelectItem value="skip">Skip (suppress)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end"><LoadingButton isPending={update.isPending} onClick={() => void save()}>Save policy</LoadingButton></div>
      </CardContent>
    </Card>
  );
}

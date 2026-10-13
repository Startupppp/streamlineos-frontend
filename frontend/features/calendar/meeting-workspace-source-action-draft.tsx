"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCalendarEvents } from "@/hooks/api/calendar";
import { useCalendarSourceActionCapabilities } from "@/hooks/api/calendar-source-actions";
import { useAddCalendarMeetingDraft } from "@/hooks/api/calendar-meeting-workspace";
import type { CalendarMeetingWorkspace } from "@/hooks/api/calendar-meeting-workspace-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { actionConfig, inputValue, sourceValue } from "./calendar-source-action-fields";

const sourceDraftSchema = z.object({
  targetId: z.string().min(1),
  value: z.string().min(1),
  effect: z.string().trim().min(1).max(500),
  sharedWithGuests: z.boolean(),
});

type SourceDraftForm = z.infer<typeof sourceDraftSchema>;

interface MeetingWorkspaceSourceActionDraftProps {
  workspace: CalendarMeetingWorkspace;
}

export function MeetingWorkspaceSourceActionDraft({ workspace }: MeetingWorkspaceSourceActionDraftProps) {
  const range = useMemo(() => {
    const start = new Date(workspace.eventStartAt);
    const end = new Date(workspace.eventEndAt);
    return {
      start: new Date(start.getTime() - 7 * 24 * 60 * 60_000),
      end: new Date(end.getTime() + 7 * 24 * 60 * 60_000),
    };
  }, [workspace.eventStartAt, workspace.eventEndAt]);
  const events = useCalendarEvents(range.start, range.end);
  const capabilities = useCalendarSourceActionCapabilities();
  const addDraft = useAddCalendarMeetingDraft();
  const form = useForm<SourceDraftForm>({
    resolver: zodResolver(sourceDraftSchema),
    defaultValues: { targetId: "", value: "", effect: "", sharedWithGuests: false },
  });
  const targetId = form.watch("targetId");
  const targets = useMemo(() => (events.data?.events ?? []).filter((event) =>
    event.actions.edit &&
    event.sourceVersion !== null &&
    event.entityType !== null &&
    capabilities.data?.sourceKeys.includes(event.sourceKey) === true &&
    actionConfig(event) !== null,
  ), [events.data?.events, capabilities.data?.sourceKeys]);
  const target = targets.find((event) => event.id === targetId);
  const config = target ? actionConfig(target) : null;

  const handleTargetChange = (id: string) => {
    const selected = targets.find((event) => event.id === id);
    const selectedConfig = selected ? actionConfig(selected) : null;
    form.setValue("targetId", id, { shouldValidate: true });
    form.setValue("value", selected && selectedConfig ? inputValue(selected, selectedConfig) : "", { shouldValidate: true });
    form.setValue("effect", selected ? `Reschedule ${selected.title}` : "", { shouldValidate: true });
  };

  const handleShareChange = (checked: boolean | "indeterminate") => {
    form.setValue("sharedWithGuests", checked === true);
  };

  const handleSubmit = (values: SourceDraftForm) => {
    if (!target || !config || !target.sourceVersion || !target.entityType) return;
    addDraft.mutate({
      workspaceId: workspace.id,
      kind: "ACTION",
      content: values.effect,
      sharedWithGuests: values.sharedWithGuests,
      sourceCommand: {
        sourceKey: target.sourceKey,
        sourceRecordId: target.sourceRecordId,
        entityType: target.entityType,
        sourceActionId: "reschedule",
        expectedSourceVersion: target.sourceVersion,
        intendedEffect: values.effect,
        input: { [config.field]: sourceValue(values.value, config) },
      },
    }, {
      onSuccess: () => {
        form.reset();
        toast.success("Source change saved as a draft for review");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 rounded-lg border p-3">
      <div>
        <p className="text-xs font-semibold">Propose a source-owned change</p>
        <p className="text-micro text-muted-foreground">The record owner checks access and version again when the change is reviewed and applied.</p>
      </div>
      {events.isError || capabilities.isError ? (
        <p className="text-xs text-destructive">Source commitments are unavailable. Refresh the meeting before proposing a change.</p>
      ) : targets.length === 0 ? (
        <p className="text-xs text-muted-foreground">No editable source commitments were returned near this meeting.</p>
      ) : (
        <>
          <Label htmlFor={`meeting-source-target-${workspace.id}`}>Source commitment</Label>
          <Select value={targetId || undefined} onValueChange={handleTargetChange}>
            <SelectTrigger id={`meeting-source-target-${workspace.id}`} className="h-8 text-xs"><SelectValue placeholder="Choose a record" /></SelectTrigger>
            <SelectContent>
              {targets.map((event) => <SelectItem key={event.id} value={event.id}>{event.title} · {event.sourceKey}</SelectItem>)}
            </SelectContent>
          </Select>
          {config ? (
            <>
              <Label htmlFor={`meeting-source-value-${workspace.id}`}>{config.label}</Label>
              <Input id={`meeting-source-value-${workspace.id}`} type={config.inputType} {...form.register("value")} className="h-8 text-xs" />
              <Label htmlFor={`meeting-source-effect-${workspace.id}`}>Intended effect</Label>
              <Input id={`meeting-source-effect-${workspace.id}`} {...form.register("effect")} className="h-8 text-xs" />
              <Label className="flex items-center gap-2 text-xs font-normal">
                <Checkbox checked={form.watch("sharedWithGuests")} onCheckedChange={handleShareChange} />
                Share the reviewed outcome with guests
              </Label>
              <Button type="submit" size="sm" disabled={addDraft.isPending || !form.formState.isValid}>Add action draft</Button>
            </>
          ) : null}
        </>
      )}
      {events.data?.coverageState !== "complete" && events.data ? (
        <p className="text-micro text-muted-foreground">Source coverage is incomplete. Some commitments may be unavailable.</p>
      ) : null}
    </form>
  );
}

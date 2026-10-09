"use client";

import { useState } from "react";
import { Controller, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useCompanionPreferences,
  useRevokeCompanionActivity,
  useUpdateCompanionPreferences,
} from "@/hooks/api/companion";
import { COMPANION_PRESETS, type CompanionPreferences } from "@/hooks/api/companion-schema";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { formatDateTime } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { CompanionActivityList } from "./companion-activity-list";
import {
  companionPreferencesFormSchema,
  isPausedUntilResume,
  toCompanionFormValues,
  toCompanionPatch,
  type CompanionPreferencesFormValues,
} from "./companion-preferences-schema";

const SELECT_CLASS = cn(FIELD_CONTROL_CLASS, "w-full px-2 disabled:opacity-50");
const ORG_LOCK = "Turned off by your organization";

type BooleanField = "visible" | "meeting" | "clockIn" | "break" | "friendly" | "activityConsent";
type PromptField = "meeting" | "clockIn" | "break" | "friendly";

const PROMPT_ROWS: Array<{ field: PromptField; label: string; hint: string }> = [
  { field: "meeting", label: "Upcoming meetings", hint: "Shown from your existing calendar reminders." },
  { field: "clockIn", label: "Missed clock-in", hint: "Only when no clock-in is recorded for a scheduled day." },
  { field: "break", label: "Break suggestions", hint: "Needs activity timing. Based on how long StreamlineOS is open." },
  { field: "friendly", label: "Friendly check-ins", hint: "Needs activity timing. At most once a workday." },
];

function pauseLabel(pausedUntil: string): string {
  return isPausedUntilResume(pausedUntil) ? "Paused until you resume" : `Paused until ${formatDateTime(pausedUntil)}`;
}

interface SwitchRowProps {
  control: Control<CompanionPreferencesFormValues>;
  field: BooleanField;
  label: string;
  hint: string;
  lock?: string;
  disabled?: boolean;
}

function SwitchRow({ control, field, label, hint, lock, disabled }: SwitchRowProps) {
  const id = `companion-${field}`;
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{lock ?? hint}</p>
      </div>
      <Controller
        control={control}
        name={field}
        render={({ field: { value, onChange } }) => (
          <Switch id={id} checked={value} onCheckedChange={onChange} disabled={Boolean(lock) || disabled} />
        )}
      />
    </div>
  );
}

function CompanionPreferencesForm({ data }: { data: CompanionPreferences }) {
  const qc = useQueryClient();
  const update = useUpdateCompanionPreferences();
  const revoke = useRevokeCompanionActivity();
  const { preferences, locks, policy } = data;
  const [now] = useState(Date.now);
  const defaultValues = toCompanionFormValues(preferences, now);
  const form = useForm<CompanionPreferencesFormValues>({
    resolver: zodResolver(companionPreferencesFormSchema),
    defaultValues,
  });
  const { control, register, handleSubmit, watch, formState } = form;
  const consent = watch("activityConsent");
  const presets = COMPANION_PRESETS.filter((preset) => policy.allowedPresets.includes(preset));
  const presetNote = locks["preset"];
  const pausedUntil = defaultValues.pause === "keep" ? preferences.pausedUntil : null;

  function handleSave(values: CompanionPreferencesFormValues) {
    update.mutate(toCompanionPatch(values, preferences, new Date()), {
      onSuccess: () => {
        if (preferences.activityConsent && !values.activityConsent) revoke.mutate();
        toast.success("Companion settings saved");
      },
      onError: (error) => {
        if (isApiError(error) && error.status === 409) {
          toast.error("These settings changed somewhere else. The latest values are loaded.");
          void qc.invalidateQueries({ queryKey: collaborationQueryKeys.companion.preferences(), exact: true });
          return;
        }
        toast.error(getErrorMessage(error));
      },
    });
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit(handleSave)} noValidate>
      {!policy.petEnabled ? (
        <p className="rounded-md border border-border p-3 text-xs text-muted-foreground">
          Your organization has turned off the companion. Ask OS stays available from the corner of the screen.
        </p>
      ) : null}
      <SwitchRow control={control} field="visible" label="Show companion" hint="Hiding it keeps Ask OS and your chat history." lock={locks["visible"]} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="companion-name">Name</Label>
          <Input id="companion-name" placeholder="Companion" aria-invalid={!!formState.errors.name} {...register("name")} />
          {formState.errors.name ? <p className="text-xs text-destructive">{formState.errors.name.message}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="companion-preset">Appearance</Label>
          <select id="companion-preset" className={SELECT_CLASS} {...register("preset")}>
            {presets.map((preset) => (
              <option key={preset} value={preset}>{preset.charAt(0).toUpperCase() + preset.slice(1)}</option>
            ))}
          </select>
          {presetNote ? <p className="text-xs text-muted-foreground">{presetNote}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="companion-tone">Tone</Label>
          <select id="companion-tone" className={SELECT_CLASS} {...register("tone")}>
            <option value="neutral">Neutral</option>
            <option value="warm">Warm</option>
            <option value="brief">Brief</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="companion-animation">Animation</Label>
          <select id="companion-animation" className={SELECT_CLASS} {...register("animation")}>
            <option value="subtle">Subtle</option>
            <option value="off">Off</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="companion-anchor">Position</Label>
          <select id="companion-anchor" className={SELECT_CLASS} {...register("anchor")}>
            <option value="bottom-right">Bottom right</option>
            <option value="bottom-left">Bottom left</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="companion-pause">Pause all companion prompts</Label>
          <select id="companion-pause" className={SELECT_CLASS} {...register("pause")}>
            {pausedUntil !== null ? <option value="keep">{pauseLabel(pausedUntil)}</option> : null}
            <option value="none">{pausedUntil !== null ? "Resume prompts" : "Not paused"}</option>
            <option value="1h">For 1 hour</option>
            <option value="today">For the rest of today</option>
            <option value="resume">Until I resume</option>
          </select>
        </div>
      </div>
      <SwitchRow control={control} field="activityConsent" label="Activity timing" hint="Counts only how long StreamlineOS is open in a visible tab. Turning it off deletes that timing." />
      {PROMPT_ROWS.map((row) => (
        <SwitchRow
          key={row.field}
          control={control}
          field={row.field}
          label={row.label}
          hint={row.hint}
          lock={locks[`prompts.${row.field}`] ?? (policy.prompts[row.field] ? undefined : ORG_LOCK)}
          disabled={(row.field === "break" || row.field === "friendly") && !consent}
        />
      ))}
      <div className="flex justify-end">
        <LoadingButton type="submit" isPending={update.isPending}>Save companion settings</LoadingButton>
      </div>
    </form>
  );
}

export function CompanionPreferencesSection() {
  const { data, isLoading, isError, error, refetch } = useCompanionPreferences();
  function handleRetry() {
    void refetch();
  }
  return (
    <section id="companion" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Companion</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Choose how your assistant looks, where it sits, and when it may suggest something.
        </p>
      </div>
      {isLoading ? <Skeleton className="h-40 w-full" /> : null}
      {isError ? (
        <ErrorState title="Couldn't load companion settings" description={getErrorMessage(error)} onRetry={handleRetry} />
      ) : null}
      {data ? (
        <>
          <CompanionPreferencesForm key={data.preferences.version} data={data} />
          <CompanionActivityList />
        </>
      ) : null}
    </section>
  );
}

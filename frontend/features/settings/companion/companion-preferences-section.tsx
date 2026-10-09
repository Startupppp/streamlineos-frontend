"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { Controller, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useCompanionPreferences,
  useUpdateCompanionPreferences,
} from "@/hooks/api/companion";
import {
  COMPANION_PRESETS,
  type CompanionPreferences,
} from "@/hooks/api/companion-schema";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { useOrgTimeZone } from "@/hooks/api/org-display";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { formatDateTime } from "@/lib/date-utils";
import { CompanionCharacter } from "@/components/assistant/companion-character";
import { CompanionActivityList } from "./companion-activity-list";
import {
  companionPreferencesFormSchema,
  isPausedUntilResume,
  toCompanionFormValues,
  toCompanionPatch,
  type CompanionPreferencesFormValues,
} from "./companion-preferences-schema";

const ORG_LOCK = "Turned off by your organization";
const TONE_OPTIONS: SelectOption[] = [
  { value: "neutral", label: "Neutral" },
  { value: "warm", label: "Warm" },
  { value: "brief", label: "Brief" },
];
const ANIMATION_OPTIONS: SelectOption[] = [
  { value: "subtle", label: "Subtle" },
  { value: "off", label: "Off" },
];

type BooleanField =
  | "visible"
  | "meeting"
  | "clockIn"
  | "break"
  | "friendly"
  | "activityConsent";
type PromptField = "meeting" | "clockIn" | "break" | "friendly";
type SelectFieldName = "preset" | "tone" | "animation" | "pause";
type SelectOption = { value: string; label: string };

const PROMPT_ROWS: Array<{ field: PromptField; label: string; hint: string }> =
  [
    {
      field: "meeting",
      label: "Upcoming meetings",
      hint: "Shown from your existing calendar reminders.",
    },
    {
      field: "clockIn",
      label: "Missed clock-in",
      hint: "Only when no clock-in is recorded for a scheduled day.",
    },
    {
      field: "break",
      label: "Break suggestions",
      hint: "Needs activity timing. Based on how long StreamlineOS is open.",
    },
    {
      field: "friendly",
      label: "Friendly check-ins",
      hint: "Needs activity timing. At most once per workday after two focused minutes.",
    },
  ];

function pauseLabel(pausedUntil: string): string {
  return isPausedUntilResume(pausedUntil)
    ? "Paused until you resume"
    : `Paused until ${formatDateTime(pausedUntil)}`;
}

interface SwitchRowProps {
  control: Control<CompanionPreferencesFormValues>;
  field: BooleanField;
  label: string;
  hint: string;
  lock?: string;
  onRequestEnable?: (field: BooleanField) => void;
  onToggle?: (checked: boolean) => void;
}

function SwitchRow({
  control,
  field,
  label,
  hint,
  lock,
  onRequestEnable,
  onToggle,
}: SwitchRowProps) {
  const id = `companion-${field}`;
  function renderSwitch({
    field: { value, onChange },
  }: {
    field: { value: boolean; onChange: (checked: boolean) => void };
  }) {
    function handleCheckedChange(checked: boolean) {
      if (checked && onRequestEnable) return onRequestEnable(field);
      onChange(checked);
      onToggle?.(checked);
    }
    return (
      <Switch
        id={id}
        className="shrink-0"
        checked={value}
        onCheckedChange={handleCheckedChange}
        disabled={Boolean(lock)}
      />
    );
  }
  return (
    <div className="relative flex min-h-16 items-center justify-between gap-6 rounded-md border border-border p-4">
      <div className="min-w-0 space-y-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{lock ?? hint}</p>
      </div>
      <Controller control={control} name={field} render={renderSwitch} />
    </div>
  );
}

function CompanionSelectField({
  control,
  name,
  label,
  options,
  note,
}: {
  control: Control<CompanionPreferencesFormValues>;
  name: SelectFieldName;
  label: string;
  options: SelectOption[];
  note?: string;
}) {
  const id = `companion-${name}`;
  function renderOption(option: SelectOption) {
    return (
      <SelectItem key={option.value} value={option.value}>
        {option.label}
      </SelectItem>
    );
  }
  function renderSelect({
    field,
  }: {
    field: {
      value: string;
      onChange: (value: string) => void;
      onBlur: () => void;
      ref: (element: HTMLElement | null) => void;
    };
  }) {
    return (
      <Select value={field.value} onValueChange={field.onChange}>
        <SelectTrigger id={id} ref={field.ref} onBlur={field.onBlur}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{options.map(renderOption)}</SelectContent>
      </Select>
    );
  }
  return (
    <div className="relative flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Controller control={control} name={name} render={renderSelect} />
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function CompanionPreferencesForm({ data }: { data: CompanionPreferences }) {
  const qc = useQueryClient();
  const update = useUpdateCompanionPreferences();
  const { preferences, locks, policy } = data;
  const [now] = useState(Date.now);
  const [requestedPrompt, setRequestedPrompt] = useState<
    "break" | "friendly" | null
  >(null);
  const orgTimeZone = useOrgTimeZone();
  const defaultValues = toCompanionFormValues(preferences, now);
  const form = useForm<CompanionPreferencesFormValues>({
    resolver: zodResolver(companionPreferencesFormSchema),
    defaultValues,
  });
  const { control, register, handleSubmit, watch, formState } = form;
  const consent = watch("activityConsent");
  const previewName = watch("name").trim() || "Companion";
  const previewPreset = watch("preset");
  const previewAnimation = watch("animation");
  const presetOptions = useMemo(
    () =>
      COMPANION_PRESETS.filter((preset) =>
        policy.allowedPresets.includes(preset),
      ).map((preset) => ({
        value: preset,
        label: preset.charAt(0).toUpperCase() + preset.slice(1),
      })),
    [policy.allowedPresets],
  );
  const presetNote = locks["preset"];
  const pausedUntil =
    defaultValues.pause === "keep" ? preferences.pausedUntil : null;
  const pauseOptions = useMemo(
    () => [
      ...(pausedUntil !== null
        ? [{ value: "keep", label: pauseLabel(pausedUntil) }]
        : []),
      {
        value: "none",
        label: pausedUntil !== null ? "Resume prompts" : "Not paused",
      },
      { value: "1h", label: "For 1 hour" },
      { value: "today", label: "For the rest of today" },
      { value: "resume", label: "Until I resume" },
    ],
    [pausedUntil],
  );

  function handleSave(values: CompanionPreferencesFormValues) {
    update.mutate(
      toCompanionPatch(values, preferences, new Date(), orgTimeZone),
      {
        onSuccess: () => {
          toast.success("Companion settings saved");
        },
        onError: (error) => {
          if (isApiError(error) && error.status === 409) {
            toast.error(
              "These settings changed somewhere else. The latest values are loaded.",
            );
            void qc.invalidateQueries({
              queryKey: collaborationQueryKeys.companion.preferences(),
              exact: true,
            });
            return;
          }
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  function allowActivityTiming() {
    if (requestedPrompt === null) return;
    form.setValue("activityConsent", true, { shouldDirty: true });
    form.setValue(requestedPrompt, true, { shouldDirty: true });
    setRequestedPrompt(null);
  }

  function handleRequestEnable(field: BooleanField) {
    if (field === "break" || field === "friendly") setRequestedPrompt(field);
  }

  function handleActivityConsentToggle(checked: boolean) {
    if (checked) return;
    form.setValue("break", false, { shouldDirty: true });
    form.setValue("friendly", false, { shouldDirty: true });
  }

  function handleConsentDialogOpenChange(open: boolean) {
    if (!open) setRequestedPrompt(null);
  }

  function renderPromptRow(row: (typeof PROMPT_ROWS)[number]) {
    return (
      <SwitchRow
        key={row.field}
        control={control}
        field={row.field}
        label={row.label}
        hint={row.hint}
        lock={
          locks[`prompts.${row.field}`] ??
          (policy.prompts[row.field] ? undefined : ORG_LOCK)
        }
        onRequestEnable={
          (row.field === "break" || row.field === "friendly") && !consent
            ? handleRequestEnable
            : undefined
        }
      />
    );
  }

  return (
    <>
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(handleSave)}
        noValidate
      >
        {!policy.petEnabled ? (
          <p className="rounded-md border border-border p-3 text-xs text-muted-foreground">
            Your organization has turned off the companion. Ask OS stays
            available from the corner of the screen.
          </p>
        ) : null}
        <SwitchRow
          control={control}
          field="visible"
          label="Show companion"
          hint="Hiding it keeps Ask OS and your chat history."
          lock={locks["visible"]}
        />
        <div
          aria-label="Companion preview"
          className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3"
        >
          <CompanionCharacter
            preset={previewPreset}
            state="idle"
            animation={previewAnimation}
            className="size-12"
          />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {previewName}
            </p>
            <p className="text-xs text-muted-foreground">
              Live appearance and animation preview
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companion-name">Name</Label>
            <Input
              id="companion-name"
              placeholder="Companion"
              aria-invalid={!!formState.errors.name}
              {...register("name")}
            />
            {formState.errors.name ? (
              <p className="text-xs text-destructive">
                {formState.errors.name.message}
              </p>
            ) : null}
          </div>
          <CompanionSelectField
            control={control}
            name="preset"
            label="Appearance"
            options={presetOptions}
            note={presetNote}
          />
          <CompanionSelectField
            control={control}
            name="tone"
            label="Tone"
            options={TONE_OPTIONS}
          />
          <CompanionSelectField
            control={control}
            name="animation"
            label="Animation"
            options={ANIMATION_OPTIONS}
          />
          <CompanionSelectField
            control={control}
            name="pause"
            label="Pause all companion prompts"
            options={pauseOptions}
          />
        </div>
        <SwitchRow
          control={control}
          field="activityConsent"
          label="Activity timing"
          hint="Counts only foreground time while this StreamlineOS window is focused. Turning it off deletes that timing."
          onToggle={handleActivityConsentToggle}
        />
        <p className="text-xs text-muted-foreground">
          Companion prompts also respect your notification quiet hours.{" "}
          <Link
            href="/settings/notifications/my-preferences"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Manage quiet hours
          </Link>
        </p>
        {PROMPT_ROWS.map(renderPromptRow)}
        <div className="flex justify-end">
          <LoadingButton type="submit" isPending={update.isPending}>
            Save companion settings
          </LoadingButton>
        </div>
      </form>
      <AlertDialog
        open={requestedPrompt !== null}
        onOpenChange={handleConsentDialogOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Allow activity timing?</AlertDialogTitle>
            <AlertDialogDescription>
              {requestedPrompt === "break"
                ? "Break suggestions"
                : "Friendly check-ins"}{" "}
              need coarse foreground session timing. StreamlineOS does not
              monitor keystrokes or your screen. Save companion settings to
              apply this choice. You can turn activity timing off and delete it
              later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={allowActivityTiming}>
              Add to settings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function CompanionPreferencesSection() {
  const { data, isLoading, isError, error, refetch } =
    useCompanionPreferences();
  function handleRetry() {
    void refetch();
  }
  return (
    <section
      id="companion"
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <div>
        <h2 className="text-sm font-semibold text-foreground">Companion</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Choose how your assistant looks and when it may suggest something.
          Drag the pet to move it.
        </p>
      </div>
      {isLoading ? <Skeleton className="h-40 w-full" /> : null}
      {isError ? (
        <ErrorState
          title="Couldn't load companion settings"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : null}
      {data ? (
        <>
          <CompanionPreferencesForm
            key={data.preferences.version}
            data={data}
          />
          <Suspense fallback={<Skeleton className="h-24 w-full" />}>
            <CompanionActivityList />
          </Suspense>
        </>
      ) : null}
    </section>
  );
}

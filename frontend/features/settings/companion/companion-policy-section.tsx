"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Bot } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useCompanionPolicy, useUpdateCompanionPolicy } from "@/hooks/api/companion";
import { COMPANION_PRESETS, type CompanionPolicy } from "@/hooks/api/companion-schema";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { OrgSettingsCard } from "@/features/settings/organization/org-settings-chrome";
import {
  companionPolicyFormSchema,
  toCompanionPolicyFormValues,
  type CompanionPolicyFormValues,
} from "./companion-preferences-schema";

type PolicySwitch = "petEnabled" | "meeting" | "clockIn" | "break" | "friendly";

const SWITCHES: Array<{ field: PolicySwitch; label: string }> = [
  { field: "petEnabled", label: "Show the companion character to members" },
  { field: "meeting", label: "Allow meeting prompts" },
  { field: "clockIn", label: "Allow missed clock-in prompts" },
  { field: "break", label: "Allow break suggestions" },
  { field: "friendly", label: "Allow friendly check-ins" },
];

type Preset = CompanionPolicyFormValues["allowedPresets"][number];

interface PresetCheckboxProps {
  preset: Preset;
  value: Preset[];
  onChange: (next: Preset[]) => void;
}

function PresetCheckbox({ preset, value, onChange }: PresetCheckboxProps) {
  function handleCheckedChange(checked: boolean | "indeterminate") {
    onChange(checked === true ? [...value, preset] : value.filter((item) => item !== preset));
  }
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={value.includes(preset)} onCheckedChange={handleCheckedChange} />
      {preset.charAt(0).toUpperCase() + preset.slice(1)}
    </label>
  );
}

function CompanionPolicyForm({ policy }: { policy: CompanionPolicy }) {
  const qc = useQueryClient();
  const update = useUpdateCompanionPolicy();
  const form = useForm<CompanionPolicyFormValues>({
    resolver: zodResolver(companionPolicyFormSchema),
    defaultValues: toCompanionPolicyFormValues(policy),
  });
  const { control, handleSubmit, formState } = form;

  function handleSave(values: CompanionPolicyFormValues) {
    update.mutate(
      {
        version: policy.version,
        petEnabled: values.petEnabled,
        allowedPresets: values.allowedPresets,
        prompts: { meeting: values.meeting, clockIn: values.clockIn, break: values.break, friendly: values.friendly },
      },
      {
        onSuccess: () => {
          toast.success("Companion policy saved");
        },
        onError: (error) => {
          if (isApiError(error) && error.status === 409) {
            toast.error("Another admin changed this policy. The latest values are loaded.");
            void qc.invalidateQueries({ queryKey: collaborationQueryKeys.companion.policy(), exact: true });
            return;
          }
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit(handleSave)} noValidate>
      {SWITCHES.map(({ field, label }) => (
        <div key={field} className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
          <Label htmlFor={`companion-policy-${field}`}>{label}</Label>
          <Controller
            control={control}
            name={field}
            render={({ field: { value, onChange } }) => (
              <Switch id={`companion-policy-${field}`} checked={value} onCheckedChange={onChange} />
            )}
          />
        </div>
      ))}
      <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3">
        <legend className="px-1 text-sm font-medium">Allowed appearances</legend>
        <Controller
          control={control}
          name="allowedPresets"
          render={({ field: { value, onChange } }) => (
            <div className="flex flex-wrap gap-4">
              {COMPANION_PRESETS.map((preset) => (
                <PresetCheckbox key={preset} preset={preset} value={value} onChange={onChange} />
              ))}
            </div>
          )}
        />
        {formState.errors.allowedPresets ? (
          <p className="text-xs text-destructive">{formState.errors.allowedPresets.message}</p>
        ) : null}
      </fieldset>
      <div className="flex justify-end">
        <LoadingButton type="submit" isPending={update.isPending}>Save companion policy</LoadingButton>
      </div>
    </form>
  );
}

export function CompanionPolicySection() {
  const { data, isLoading, isError, error, refetch } = useCompanionPolicy();
  function handleRetry() {
    void refetch();
  }
  return (
    <OrgSettingsCard
      title="Companion"
      description="Decide whether members see the companion character and which prompts it may show. This never grants access members lack."
      icon={<Bot className="h-4 w-4 text-muted-foreground" />}
    >
      {isLoading ? <Skeleton className="h-40 w-full" /> : null}
      {isError ? (
        <ErrorState title="Couldn't load the companion policy" description={getErrorMessage(error)} onRetry={handleRetry} />
      ) : null}
      {data ? <CompanionPolicyForm key={data.version} policy={data} /> : null}
    </OrgSettingsCard>
  );
}

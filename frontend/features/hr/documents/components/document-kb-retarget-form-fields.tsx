"use client";

import { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useOrgDepartments } from "@/hooks/api/org-hierarchy-units";
import { useOrgLocations } from "@/hooks/api/org-hierarchy";
import { getErrorMessage } from "@/lib/get-error-message";
import type { RetargetAudienceMode, RetargetFormValues } from "./document-kb-retarget-schema";

const AUDIENCE_CHOICES: ReadonlyArray<{ value: RetargetAudienceMode; label: string; description: string }> = [
  { value: "HR_ONLY", label: "HR only", description: "Nobody outside HR sees it in the Knowledge Base." },
  { value: "ALL_EMPLOYEES", label: "All employees", description: "Every current employee." },
  { value: "SELECTED", label: "Selected departments or locations", description: "Only people in the units you tick." },
];

const UNIT_LIST_LIMIT = 100;

interface UnitCheckboxProps {
  id: string;
  name: string;
  checked: boolean;
  onToggle: (id: string, checked: boolean) => void;
}

function UnitCheckbox({ id, name, checked, onToggle }: UnitCheckboxProps) {
  const handleCheckedChange = useCallback(
    (next: boolean | "indeterminate") => onToggle(id, next === true),
    [onToggle, id],
  );
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={`unit-${id}`} checked={checked} onCheckedChange={handleCheckedChange} aria-label={name} />
      <label htmlFor={`unit-${id}`} className="cursor-pointer text-sm font-normal">
        {name}
      </label>
    </div>
  );
}

function RetargetUnitSection() {
  const form = useFormContext<RetargetFormValues>();
  const departmentIds = form.watch("departmentIds");
  const locationIds = form.watch("locationIds");
  const departments = useOrgDepartments({ limit: UNIT_LIST_LIMIT });
  const locations = useOrgLocations({ limit: UNIT_LIST_LIMIT });

  const handleDeptToggle = useCallback(
    (id: string, checked: boolean) => {
      const current = form.getValues("departmentIds");
      form.setValue(
        "departmentIds",
        checked ? [...new Set([...current, id])] : current.filter((d) => d !== id),
        { shouldDirty: true, shouldValidate: true },
      );
    },
    [form],
  );

  const handleLocToggle = useCallback(
    (id: string, checked: boolean) => {
      const current = form.getValues("locationIds");
      form.setValue(
        "locationIds",
        checked ? [...new Set([...current, id])] : current.filter((l) => l !== id),
        { shouldDirty: true, shouldValidate: true },
      );
    },
    [form],
  );

  const handleDeptRetry = useCallback(() => {
    void departments.refetch();
  }, [departments]);

  const handleLocRetry = useCallback(() => {
    void locations.refetch();
  }, [locations]);

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">Departments</legend>
        {departments.isError && departments.data === undefined ? (
          <div className="flex flex-col items-start gap-2 text-sm">
            <p className="text-muted-foreground">{getErrorMessage(departments.error)}</p>
            <LoadingButton type="button" variant="outline" size="sm" isPending={departments.isFetching} onClick={handleDeptRetry}>
              Try again
            </LoadingButton>
          </div>
        ) : departments.isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (departments.data?.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No departments to choose from.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {(departments.data?.data ?? []).map((d) => (
              <UnitCheckbox key={d.id} id={d.id} name={d.name} checked={departmentIds.includes(d.id)} onToggle={handleDeptToggle} />
            ))}
          </div>
        )}
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">Locations</legend>
        {locations.isError && locations.data === undefined ? (
          <div className="flex flex-col items-start gap-2 text-sm">
            <p className="text-muted-foreground">{getErrorMessage(locations.error)}</p>
            <LoadingButton type="button" variant="outline" size="sm" isPending={locations.isFetching} onClick={handleLocRetry}>
              Try again
            </LoadingButton>
          </div>
        ) : locations.isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (locations.data?.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No locations to choose from.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {(locations.data?.data ?? []).map((l) => (
              <UnitCheckbox key={l.id} id={l.id} name={l.name} checked={locationIds.includes(l.id)} onToggle={handleLocToggle} />
            ))}
          </div>
        )}
      </fieldset>
    </div>
  );
}

export function DocumentKbRetargetFormFields() {
  const form = useFormContext<RetargetFormValues>();
  const versionMode = form.watch("versionMode");
  const audienceMode = form.watch("audienceMode");

  const handlePinnedVersionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      form.setValue("pinnedVersion", e.target.value === "" ? null : Number(e.target.value), {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [form],
  );

  return (
    <div className="flex flex-col gap-6">
      <FormField
        control={form.control}
        name="versionMode"
        render={({ field }) => (
          <FormItem className="flex flex-col gap-2">
            <FormLabel>Version</FormLabel>
            <FormControl>
              <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-col gap-2">
                <FormItem className="flex items-start gap-3 rounded-md border border-border p-3">
                  <FormControl>
                    <RadioGroupItem value="FOLLOW_LATEST" className="mt-0.5" />
                  </FormControl>
                  <div className="flex flex-col gap-0.5">
                    <FormLabel className="font-medium">Follow latest</FormLabel>
                    <FormDescription>Always shows the most recent approved version.</FormDescription>
                  </div>
                </FormItem>
                <FormItem className="flex items-start gap-3 rounded-md border border-border p-3">
                  <FormControl>
                    <RadioGroupItem value="PINNED" className="mt-0.5" />
                  </FormControl>
                  <div className="flex flex-col gap-0.5">
                    <FormLabel className="font-medium">Pinned version</FormLabel>
                    <FormDescription>Show a specific version until you change it.</FormDescription>
                  </div>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {versionMode === "PINNED" ? (
        <FormField
          control={form.control}
          name="pinnedVersion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Version number</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  aria-label="Version number"
                  value={field.value ?? ""}
                  onChange={handlePinnedVersionChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      <FormField
        control={form.control}
        name="audienceMode"
        render={({ field }) => (
          <FormItem className="flex flex-col gap-2">
            <FormLabel>Audience</FormLabel>
            <FormControl>
              <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-col gap-2">
                {AUDIENCE_CHOICES.map((choice) => (
                  <FormItem key={choice.value} className="flex items-start gap-3 rounded-md border border-border p-3">
                    <FormControl>
                      <RadioGroupItem value={choice.value} className="mt-0.5" />
                    </FormControl>
                    <div className="flex flex-col gap-0.5">
                      <FormLabel className="font-medium">{choice.label}</FormLabel>
                      <FormDescription>{choice.description}</FormDescription>
                    </div>
                  </FormItem>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {audienceMode === "SELECTED" ? <RetargetUnitSection /> : null}
    </div>
  );
}

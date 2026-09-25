"use client";

import { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCanState } from "@/hooks/api/access";
import { useOrgLocations } from "@/hooks/api/org-hierarchy";
import { useOrgDepartments } from "@/hooks/api/org-hierarchy-units";
import { getErrorMessage } from "@/lib/get-error-message";
import type { ClassificationFormValues } from "./document-classification-model";

/** Both lists are read one page at a time; anything past this many is not offered (and the person is told so). */
const UNIT_LIST_LIMIT = 100;

/** The part of a list read this picker needs. The departments read and the locations read both satisfy it. */
interface UnitListQuery {
  data: { data: ReadonlyArray<{ id: string; name: string }>; pageInfo: { hasMore: boolean } } | undefined;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

interface UnitCheckboxProps {
  unitId: string;
  name: string;
  checked: boolean;
  onToggle: (unitId: string, checked: boolean) => void;
}

function UnitCheckbox({ unitId, name, checked, onToggle }: UnitCheckboxProps) {
  const handleCheckedChange = useCallback(
    (next: boolean | "indeterminate") => onToggle(unitId, next === true),
    [onToggle, unitId],
  );
  return (
    <FormItem className="flex items-center gap-2">
      <FormControl>
        <Checkbox checked={checked} onCheckedChange={handleCheckedChange} />
      </FormControl>
      <FormLabel className="font-normal">{name}</FormLabel>
    </FormItem>
  );
}

interface UnitListFailureProps {
  noun: string;
  message: string;
  isRetrying: boolean;
  onRetry: () => void;
}

function UnitListFailure({ noun, message, isRetrying, onRetry }: UnitListFailureProps) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 text-sm">
      <p className="text-foreground">Could not load the {noun}.</p>
      <p className="text-muted-foreground">{message}</p>
      <LoadingButton type="button" variant="outline" size="sm" isPending={isRetrying} onClick={onRetry}>
        Try again
      </LoadingButton>
    </div>
  );
}

interface UnitListProps {
  field: "departmentIds" | "locationIds";
  label: string;
  /** Lower-case plural, used in the sentences about this list. */
  noun: string;
  query: UnitListQuery;
}

function UnitList({ field, label, noun, query }: UnitListProps) {
  const form = useFormContext<ClassificationFormValues>();
  const selected = form.watch(field);
  const { refetch } = query;
  const units = query.data?.data ?? [];

  const handleToggle = useCallback(
    (unitId: string, checked: boolean) => {
      const current = form.getValues(field);
      const next = checked ? [...new Set([...current, unitId])] : current.filter((id) => id !== unitId);
      form.setValue(field, next, { shouldDirty: true, shouldValidate: true });
    },
    [field, form],
  );
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      {query.isError && query.data === undefined ? (
        <UnitListFailure noun={noun} message={getErrorMessage(query.error)} isRetrying={query.isFetching} onRetry={handleRetry} />
      ) : query.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : units.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {noun} to choose from. They come from organisation settings.</p>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {units.map((unit) => (
              <FormField
                key={unit.id}
                control={form.control}
                name={field}
                render={() => (
                  <UnitCheckbox unitId={unit.id} name={unit.name} checked={selected.includes(unit.id)} onToggle={handleToggle} />
                )}
              />
            ))}
          </div>
          {query.data?.pageInfo.hasMore === true ? (
            <p className="text-sm text-muted-foreground">
              Showing the first {UNIT_LIST_LIMIT} {noun}. There are more, and they cannot be chosen here yet.
            </p>
          ) : null}
        </>
      )}
    </fieldset>
  );
}

function plural(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

/** What is already chosen, said plainly, for someone who cannot see the names. */
function chosenSummary(departments: number, locations: number): string {
  const parts = [
    departments > 0 ? plural(departments, "department") : null,
    locations > 0 ? plural(locations, "location") : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? ` Already chosen: ${parts.join(" and ")}.` : "";
}

/**
 * Departments and locations to tick. Both lists are organisation-settings reads, so a publisher without
 * `settings:view` gets a plain "not available to you" rather than a list that looks empty, and a failed read
 * says so and can be retried rather than reading as "none".
 */
export function AudienceUnitPicker() {
  const access = useCanState("settings:view");
  const form = useFormContext<ClassificationFormValues>();
  const departments = useOrgDepartments({ limit: UNIT_LIST_LIMIT });
  const locations = useOrgLocations({ limit: UNIT_LIST_LIMIT });
  const departmentCount = form.watch("departmentIds").length;
  const locationCount = form.watch("locationIds").length;

  if (access === "denied") {
    return (
      <div className="rounded-md border border-border">
        <NoPermissionState
          compact
          title="Departments and locations are not available to you"
          description={`Listing them needs the permission to view organisation settings. You can still choose All employees or HR only.${chosenSummary(departmentCount, locationCount)}`}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-3">
      <UnitList field="departmentIds" label="Departments" noun="departments" query={departments} />
      <UnitList field="locationIds" label="Locations" noun="locations" query={locations} />
    </div>
  );
}

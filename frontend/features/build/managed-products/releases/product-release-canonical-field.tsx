"use client";

import { useCallback, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import type { ComboboxOption } from "@/components/ui/combobox";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  useInfiniteSelectorProjects,
  useInfiniteSelectorProjectReleases,
} from "../use-infinite-selector";
import type { ReleaseFormValues } from "./product-release-form-schema";

const SEARCH_DEBOUNCE_MS = 300;

interface ProductReleaseCanonicalFieldProps {
  managedProductId: number;
  initialProjectId: number | null;
  initialProjectLabel: string | null;
  initialReleaseLabel: string | null;
}

function withSelected(
  options: ComboboxOption[],
  value: string,
  label: string | null,
): ComboboxOption[] {
  if (!value || label === null) return options;
  if (options.some((option) => option.value === value)) return options;
  return [{ value, label }, ...options];
}

export function ProductReleaseCanonicalField({
  managedProductId,
  initialProjectId,
  initialProjectLabel,
  initialReleaseLabel,
}: ProductReleaseCanonicalFieldProps) {
  const form = useFormContext<ReleaseFormValues>();
  const [projectId, setProjectId] = useState<number | null>(initialProjectId);
  const [projectLabel, setProjectLabel] = useState<string | null>(initialProjectLabel);
  const [releaseLabel, setReleaseLabel] = useState<string | null>(initialReleaseLabel);
  const [projectSearch, setProjectSearch] = useState("");
  const [releaseSearch, setReleaseSearch] = useState("");

  const debouncedProjectSearch = useDebouncedValue(projectSearch, SEARCH_DEBOUNCE_MS);
  const debouncedReleaseSearch = useDebouncedValue(releaseSearch, SEARCH_DEBOUNCE_MS);

  const projects = useInfiniteSelectorProjects(
    managedProductId,
    debouncedProjectSearch,
    true,
  );
  const releases = useInfiniteSelectorProjectReleases(
    projectId,
    debouncedReleaseSearch,
    projectId !== null,
  );

  const projectOptions = useMemo(() => {
    const rows = projects.data?.pages.flatMap((page) => page.data) ?? [];
    return withSelected(
      rows.map((row) => ({ value: String(row.id), label: `${row.key} · ${row.name}` })),
      projectId === null ? "" : String(projectId),
      projectLabel,
    );
  }, [projects.data, projectId, projectLabel]);

  const releaseOptions = useMemo(() => {
    const rows = releases.data?.pages.flatMap((page) => page.data) ?? [];
    const selected = form.getValues("projectReleaseId");
    return withSelected(
      rows.map((row) => ({ value: String(row.id), label: `${row.name} ${row.version}` })),
      selected == null ? "" : String(selected),
      releaseLabel,
    );
  }, [releases.data, releaseLabel, form]);

  const handleProjectSearch = useCallback((value: string) => {
    setProjectSearch(value);
  }, []);

  const handleReleaseSearch = useCallback((value: string) => {
    setReleaseSearch(value);
  }, []);

  const handleProjectChange = useCallback(
    (value: string, label?: string) => {
      setProjectId(value ? Number(value) : null);
      setProjectLabel(label ?? null);
      setReleaseLabel(null);
      setReleaseSearch("");
      form.setValue("projectReleaseId", null, { shouldDirty: true });
    },
    [form],
  );

  const handleReleaseChange = useCallback(
    (value: string, label?: string) => {
      setReleaseLabel(label ?? null);
      form.setValue("projectReleaseId", value ? Number(value) : null, {
        shouldDirty: true,
      });
    },
    [form],
  );

  const handleClearLink = useCallback(() => {
    setProjectId(null);
    setProjectLabel(null);
    setReleaseLabel(null);
    setProjectSearch("");
    setReleaseSearch("");
    form.setValue("projectReleaseId", null, { shouldDirty: true });
  }, [form]);

  const handleProjectsRetry = useCallback(() => {
    void projects.refetch();
  }, [projects]);

  const handleReleasesRetry = useCallback(() => {
    void releases.refetch();
  }, [releases]);

  const handleProjectsLoadMore = useCallback(() => {
    void projects.fetchNextPage();
  }, [projects]);

  const handleReleasesLoadMore = useCallback(() => {
    void releases.fetchNextPage();
  }, [releases]);

  return (
    <FormField
      control={form.control}
      name="projectReleaseId"
      render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>Canonical project release (optional)</FormLabel>
          <div className="flex flex-col gap-2">
            {projectId === null && projects.isError ? (
              <ErrorState
                compact
                title="Could not load linked projects"
                description={getErrorMessage(projects.error)}
                onRetry={handleProjectsRetry}
                error={projects.error}
              />
            ) : projectId === null ? (
              <Combobox
                options={projectOptions}
                value={projectId === null ? "" : String(projectId)}
                onChange={handleProjectChange}
                onSearchChange={handleProjectSearch}
                placeholder="Pick a project…"
                searchPlaceholder="Search linked projects…"
                emptyText={projects.isFetching ? "Loading projects…" : "No linked projects found."}
                aria-label="Project for canonical release"
                footer={
                  <InfiniteScrollSentinel
                    hasNextPage={projects.hasNextPage}
                    isFetchingNextPage={projects.isFetchingNextPage}
                    onLoadMore={handleProjectsLoadMore}
                    label="Load more projects"
                  />
                }
              />
            ) : releases.isError ? (
              <ErrorState
                compact
                title="Could not load that project's releases"
                description={getErrorMessage(releases.error)}
                onRetry={handleReleasesRetry}
                error={releases.error}
              />
            ) : (
              <Combobox
                options={releaseOptions}
                value={field.value == null ? "" : String(field.value)}
                onChange={handleReleaseChange}
                onSearchChange={handleReleaseSearch}
                placeholder="Pick a release…"
                searchPlaceholder="Search releases…"
                emptyText={releases.isFetching ? "Loading releases…" : "No releases found."}
                aria-label="Canonical release"
                footer={
                  <InfiniteScrollSentinel
                    hasNextPage={releases.hasNextPage}
                    isFetchingNextPage={releases.isFetchingNextPage}
                    onLoadMore={handleReleasesLoadMore}
                    label="Load more releases"
                  />
                }
              />
            )}
            {projectId !== null ? (
              <div className="flex flex-wrap items-center gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={handleClearLink}>
                  Choose another project
                </Button>
                {field.value != null ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReleaseChange("")}
                  >
                    Clear release
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

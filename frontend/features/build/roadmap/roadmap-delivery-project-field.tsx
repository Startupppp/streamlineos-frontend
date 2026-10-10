"use client";

import { useCallback, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Control } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/api/build/projects";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import type { RoadmapItemFormValues } from "./roadmap-schema";

interface RoadmapDeliveryProjectFieldProps {
  control: Control<RoadmapItemFormValues>;
  managedProductId?: number;
  linkedProjectId: number | null;
}

export function RoadmapDeliveryProjectField({
  control,
  managedProductId,
  linkedProjectId,
}: RoadmapDeliveryProjectFieldProps) {
  const router = useRouter();
  const requestLeave = useNavigationLeave();
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<ComboboxOption | null>(
    null,
  );
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const { data, isLoading, isError, refetch } = useProjects({
    limit: 50,
    ...(managedProductId === undefined ? {} : { managedProductId }),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });
  const options = useMemo(() => {
    const projects = data?.data ?? [];
    return [
      { value: "", label: "No delivery project" },
      ...projects.map((project) => ({
        value: String(project.id),
        label: project.name,
        sublabel: project.key,
      })),
      ...(selectedProject &&
      !projects.some((project) => String(project.id) === selectedProject.value)
        ? [selectedProject]
        : []),
      ...(linkedProjectId !== null &&
      !projects.some((project) => project.id === linkedProjectId) &&
      selectedProject?.value !== String(linkedProjectId)
        ? [{ value: String(linkedProjectId), label: "Linked delivery project" }]
        : []),
    ];
  }, [data, linkedProjectId, selectedProject]);
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);
  const handleOpenProjects = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (
        managedProductId === undefined ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      requestLeave(() =>
        router.push(`/build/managed-products/${managedProductId}/projects`),
      );
    },
    [managedProductId, requestLeave, router],
  );

  return (
    <FormField
      control={control}
      name="projectId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Delivery project</FormLabel>
          <Combobox
            aria-label="Delivery project"
            options={options}
            value={field.value}
            onChange={(value) => {
              field.onChange(value);
              setSelectedProject(
                value
                  ? (options.find((option) => option.value === value) ?? null)
                  : null,
              );
            }}
            onSearchChange={setSearch}
            placeholder="No delivery project"
            searchPlaceholder="Search linked projects…"
            emptyText={
              isLoading
                ? "Loading projects…"
                : isError
                  ? "Could not load projects."
                  : "No projects found."
            }
            footer={
              isError ? (
                <div className="border-t border-border p-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={handleRetry}
                  >
                    Retry
                  </Button>
                </div>
              ) : data?.hasMore ? (
                <p className="border-t border-border p-2 text-xs text-muted-foreground">
                  Search by project name or key to find more.
                </p>
              ) : undefined
            }
          />
          <p className="text-xs text-muted-foreground">
            Progress uses completed tickets in the selected project.
            {managedProductId !== undefined ? (
              <>
                {" "}
                <Link
                  className="text-primary underline-offset-2 hover:underline"
                  href={`/build/managed-products/${managedProductId}/projects`}
                  onClick={handleOpenProjects}
                >
                  Manage linked projects
                </Link>
              </>
            ) : null}
          </p>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

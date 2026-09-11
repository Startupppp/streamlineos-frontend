"use client";

import { useMemo, useState, useCallback } from "react";
import { useProjects, useProject } from "@/hooks/api/build/projects";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Combobox } from "@/components/ui/combobox";

interface ProjectComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ProjectCombobox({
  value,
  onChange,
  placeholder = "Search projects…",
  disabled,
  className,
}: ProjectComboboxProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isFetching } = useProjects({ limit: 100 });
  const projects = useMemo(() => data?.data ?? [], [data]);

  const numericLookup =
    /^\d+$/.test(debouncedSearch.trim()) ? Number(debouncedSearch.trim()) : 0;
  const { data: lookedUpProject } = useProject(numericLookup);

  const options = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const seen = new Set<number>();
    const merged = [];

    if (
      lookedUpProject &&
      (!q ||
        String(lookedUpProject.id).includes(q) ||
        lookedUpProject.name.toLowerCase().includes(q) ||
        lookedUpProject.key.toLowerCase().includes(q))
    ) {
      merged.push(lookedUpProject);
      seen.add(lookedUpProject.id);
    }

    for (const project of projects) {
      if (seen.has(project.id)) continue;
      if (
        q &&
        !String(project.id).includes(q) &&
        !project.name.toLowerCase().includes(q) &&
        !project.key.toLowerCase().includes(q)
      ) {
        continue;
      }
      merged.push(project);
      seen.add(project.id);
    }

    return merged.slice(0, 50).map((project) => ({
      value: String(project.id),
      label: `${project.key} · ${project.name}`,
      sublabel: project.status?.replace("_", " ") ?? undefined,
    }));
  }, [projects, debouncedSearch, lookedUpProject]);

  const handleSearchChange = useCallback((q: string) => {
    setSearch(q);
  }, []);

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search by name or key…"
      emptyText={isFetching ? "Loading projects…" : "No projects found."}
      disabled={disabled}
      className={className}
      onSearchChange={handleSearchChange}
    />
  );
}

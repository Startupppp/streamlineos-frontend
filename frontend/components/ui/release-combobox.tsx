"use client";

import { useMemo } from "react";
import { useReleases } from "@/hooks/api/build/releases";
import { Combobox } from "@/components/ui/combobox";

interface ReleaseComboboxProps {
  projectId: number;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
}

export function ReleaseCombobox({
  projectId,
  value,
  onChange,
  placeholder = "Select release…",
  disabled,
  className,
  allowClear = false,
}: ReleaseComboboxProps) {
  const { data: releases, isFetching } = useReleases(projectId);

  const releaseOptions = useMemo(
    () =>
      (releases ?? []).map((r) => ({
        value: String(r.id),
        label: `${r.name} (${r.version})`,
        sublabel: r.status,
      })),
    [releases],
  );

  const options = allowClear
    ? [{ value: "", label: "None" }, ...releaseOptions]
    : releaseOptions;

  const emptyText = isFetching ? "Loading releases…" : "No releases found.";

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search by name or version…"
      emptyText={emptyText}
      disabled={disabled}
      className={className}
    />
  );
}

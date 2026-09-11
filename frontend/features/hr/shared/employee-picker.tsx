"use client";

import { useMemo } from "react";
import { Combobox } from "@/components/ui/combobox";
import { useHrEmployeeOptions } from "@/hooks/api/hr/employees";
import { getUserDisplayName } from "@/lib/person-display";
import { cn } from "@/lib/utils";

interface EmployeePickerProps {
  value: string | undefined;
  onChange: (userId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  excludeUserIds?: string[];
  className?: string;
}

export function EmployeePicker({
  value,
  onChange,
  disabled,
  placeholder = "Select employee…",
  excludeUserIds,
  className,
}: EmployeePickerProps) {
  const { employees, isFetching } = useHrEmployeeOptions();

  const options = useMemo(
    () =>
      employees
        .filter((e) => !excludeUserIds?.includes(e.id))
        .map((e) => ({
          value: e.id,
          label: getUserDisplayName(e),
          sublabel: e.designation ?? e.email,
        })),
    [employees, excludeUserIds],
  );

  return (
    <Combobox
      options={options}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search by name…"
      emptyText="No employees found."
      disabled={disabled ?? isFetching}
      className={cn(className)}
    />
  );
}

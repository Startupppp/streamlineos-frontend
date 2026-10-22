"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Combobox } from "@/components/ui/combobox";
import { useHrEmployeeOptions } from "@/hooks/api/hr/employees";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { cn, resolveImageUrl } from "@/lib/utils";

interface EmployeePickerProps {
  value: string | undefined;
  onChange: (userId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  excludeUserIds?: string[];
  className?: string;
  includeInactive?: boolean;
  ariaLabel?: string;
}

function EmployeeAvatar({
  employee,
}: {
  employee: { image?: string | null } & Parameters<typeof getUserInitials>[0];
}) {
  const src = resolveImageUrl(employee.image);
  return (
    <Avatar className="h-6 w-6">
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback className="text-micro">{getUserInitials(employee)}</AvatarFallback>
    </Avatar>
  );
}

export function EmployeePicker({
  value,
  onChange,
  disabled,
  placeholder = "Select employee…",
  excludeUserIds,
  className,
  includeInactive,
  ariaLabel,
}: EmployeePickerProps) {
  const { employees, isFetching } = useHrEmployeeOptions(
    includeInactive ? { isActive: "all" } : undefined,
  );

  const options = useMemo(
    () =>
      employees
        .filter((e) => !excludeUserIds?.includes(e.id))
        .map((e) => ({
          value: e.id,
          label: getUserDisplayName(e),
          sublabel: e.hasAccepted === false
            ? `${e.designation ?? e.email} · Invite pending`
            : e.designation ?? e.email,
          icon: <EmployeeAvatar employee={e} />,
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
      ariaLabel={ariaLabel ?? placeholder}
    />
  );
}

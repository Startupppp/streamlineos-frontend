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
}

/**
 * `EmployeeListItem` carries `image` and the list contract parses it, so the
 * photo was already being fetched on every open of this picker and then dropped
 * at the render — the same person showed a face in the attendance roster and a
 * bare name here. This is the roster's own markup: the initials fallback is what
 * renders for anyone without a photo, so a row is never left with an empty gap
 * where the others have a face.
 */
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
    />
  );
}

"use client";

import { useOrgMembers } from "@/hooks/api/organization";
import { Combobox } from "@/components/ui/combobox";

interface UserComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowUnassigned?: boolean;
  excludeUserId?: string;
  className?: string;
}

export function UserCombobox({
  value,
  onChange,
  placeholder = "Select member…",
  disabled,
  allowUnassigned = false,
  excludeUserId,
  className,
}: UserComboboxProps) {
  const { data } = useOrgMembers(1, 200);

  const memberOptions = (data?.data ?? [])
    .filter((m) => !excludeUserId || m.userId !== excludeUserId)
    .map((m) => ({
      value: m.userId,
      label: m.name ?? m.email,
      sublabel: m.email,
    }));

  const options = allowUnassigned
    ? [{ value: "", label: "Unassigned" }, ...memberOptions]
    : memberOptions;

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search members…"
      emptyText="No members found."
      disabled={disabled}
      className={className}
    />
  );
}

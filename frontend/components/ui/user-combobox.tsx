"use client";

import { useOrgMembers } from "@/lib/api/hooks/organization";
import { Combobox } from "@/components/ui/combobox";

interface UserComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function UserCombobox({ value, onChange, placeholder = "Select member…", disabled, className }: UserComboboxProps) {
  const { data } = useOrgMembers(1, 200);

  const options = (data?.data ?? []).map((m) => ({
    value: m.userId,
    label: m.name ?? m.email,
    sublabel: m.email,
  }));

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

"use client";

import { MemberPicker } from "@/components/members/member-picker";

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
  function handleChange(userId: string | null) {
    onChange(userId ?? "");
  }

  return (
    <MemberPicker
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      allowUnassigned={allowUnassigned}
      excludeUserId={excludeUserId}
      className={className}
    />
  );
}

"use client";

import { useMemo } from "react";
import { Combobox } from "@/components/ui/combobox";
import { useVendors } from "@/hooks/api/inventory/vendors";

interface VendorSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  activeOnly?: boolean;
}

export function VendorSelect({
  value,
  onChange,
  placeholder = "Select vendor…",
  disabled,
  className,
  activeOnly = true,
}: VendorSelectProps) {
  const { data, isLoading } = useVendors({
    isActive: activeOnly ? true : undefined,
    limit: 100,
  });

  const options = useMemo(
    () =>
      (data?.items ?? []).map((vendor) => ({
        value: String(vendor.id),
        label: vendor.name,
        sublabel: `Code: ${vendor.code}`,
      })),
    [data],
  );

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search vendor…"
      emptyText={isLoading ? "Loading vendors…" : "No vendors found."}
      disabled={disabled || isLoading}
      className={className}
    />
  );
}

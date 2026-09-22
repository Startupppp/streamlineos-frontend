"use client";

import { useMemo, useState } from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useVendors } from "@/hooks/api/accounting/ap";
import type { VendorSummary } from "@/types/accounting/accounting-ap";

interface VendorPickerFieldProps {
  value: string;
  onChange: (partyId: string, vendor: VendorSummary | undefined) => void;
  disabled?: boolean;
}

export function VendorPickerField({
  value,
  onChange,
  disabled,
}: VendorPickerFieldProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const vendorsQuery = useVendors({
    search: debouncedSearch || undefined,
    page: 1,
    pageSize: 50,
  });

  const vendors = useMemo(
    () => vendorsQuery.data?.items ?? [],
    [vendorsQuery.data],
  );

  const options = useMemo<ComboboxOption[]>(
    () =>
      vendors.map((vendor) => ({
        value: vendor.id,
        label: vendor.displayName,
        sublabel: `${vendor.defaultCurrency} · pays in ${vendor.paymentTermsDays} days`,
      })),
    [vendors],
  );

  function handleChange(nextValue: string): void {
    onChange(
      nextValue,
      vendors.find((vendor) => vendor.id === nextValue),
    );
  }

  return (
    <Combobox
      options={options}
      value={value}
      onChange={handleChange}
      onSearchChange={setSearch}
      placeholder="Choose a vendor"
      searchPlaceholder="Search vendors…"
      emptyText="No vendor found. Add them first."
      disabled={disabled}
    />
  );
}

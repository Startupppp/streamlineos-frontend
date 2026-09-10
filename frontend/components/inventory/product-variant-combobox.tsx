"use client";

import { useMemo } from "react";
import { Combobox } from "@/components/ui/combobox";
import { useProductVariants } from "@/hooks/api/inventory/products";

interface ProductVariantComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  activeOnly?: boolean;
  /**
   * The trigger's accessible name — required, see `Combobox`'s own `ariaLabel`.
   * Required rather than optional because every existing call site had simply
   * omitted it, and an optional prop is reintroduced by omission.
   */
  ariaLabel: string;
}

export function ProductVariantCombobox({
  value,
  onChange,
  placeholder = "Search variant, SKU…",
  disabled,
  className,
  activeOnly = true,
  ariaLabel,
}: ProductVariantComboboxProps) {
  const { data: variants = [], isLoading } = useProductVariants(
    activeOnly ? { activeOnly: true } : undefined,
  );

  const options = useMemo(
    () =>
      variants.map((variant) => ({
        value: String(variant.id),
        label: `${variant.productName} — ${variant.name}`,
        sublabel: `SKU: ${variant.sku}`,
      })),
    [variants],
  );

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search by name or SKU…"
      emptyText={isLoading ? "Loading variants…" : "No variants match your search."}
      disabled={disabled || isLoading}
      className={className}
      ariaLabel={ariaLabel}
    />
  );
}

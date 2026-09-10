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
   * `role="combobox"` does not take its name from content, so the trigger's
   * visible label is not an accessible name and axe reports `button-name`. The
   * underlying `Combobox` has carried the escape hatch all along; this was the
   * only thing between it and the callers.
   */
  ariaLabel?: string;
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

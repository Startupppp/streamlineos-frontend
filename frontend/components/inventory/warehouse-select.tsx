"use client";

import { useMemo } from "react";
import { Combobox } from "@/components/ui/combobox";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";

interface WarehouseSelectProps {
  value: string;
  onChange: (value: string) => void;
  /**
   * The trigger's accessible name — required, see `Combobox`'s own `ariaLabel`.
   * Required rather than optional because every existing call site had simply
   * omitted it, and an optional prop is reintroduced by omission.
   */
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  activeOnly?: boolean;
}

export function WarehouseSelect({
  value,
  onChange,
  ariaLabel,
  placeholder = "Select warehouse…",
  disabled,
  className,
  activeOnly = true,
}: WarehouseSelectProps) {
  const { data: warehouses = [], isLoading } = useWarehouses(
    activeOnly ? { status: "active" } : undefined,
  );

  const options = useMemo(
    () =>
      warehouses.map((warehouse) => ({
        value: String(warehouse.id),
        label: warehouse.name,
        sublabel: `Code: ${warehouse.code}`,
      })),
    [warehouses],
  );

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search warehouse…"
      emptyText={isLoading ? "Loading warehouses…" : "No warehouses found."}
      disabled={disabled || isLoading}
      className={className}
      ariaLabel={ariaLabel}
    />
  );
}

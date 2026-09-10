"use client";

import { useMemo, useState, useCallback } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Combobox } from "@/components/ui/combobox";
import { useShipments } from "@/hooks/api/inventory/shipping";
import { useTransfers } from "@/hooks/api/inventory/transfers";

type ReferenceType = "SHIPMENT" | "TRANSFER";

interface InventoryReferenceComboboxProps {
  type: ReferenceType;
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
}

export function InventoryReferenceCombobox({
  type,
  value,
  onChange,
  ariaLabel,
  placeholder,
  disabled,
  className,
}: InventoryReferenceComboboxProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: shipmentsData, isFetching: shipmentsLoading } = useShipments(
    type === "SHIPMENT" ? { limit: 100 } : undefined,
  );
  const { data: transfersData, isFetching: transfersLoading } = useTransfers(
    type === "TRANSFER" ? { limit: 100 } : undefined,
  );

  const isFetching = type === "SHIPMENT" ? shipmentsLoading : transfersLoading;

  const options = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();

    if (type === "SHIPMENT") {
      return (shipmentsData?.items ?? [])
        .filter((item) => {
          if (!q) return true;
          return (
            String(item.id).includes(q) ||
            (item.trackingNumber?.toLowerCase().includes(q) ?? false) ||
            String(item.soId ?? "").includes(q)
          );
        })
        .slice(0, 50)
        .map((item) => ({
          value: String(item.id),
          label: `Shipment #${item.id}`,
          sublabel: item.trackingNumber
            ? `Tracking: ${item.trackingNumber}`
            : item.soId
              ? `SO #${item.soId}`
              : item.status,
        }));
    }

    return (transfersData?.items ?? [])
      .filter((item) => {
        if (!q) return true;
        return (
          String(item.id).includes(q) ||
          item.referenceNumber.toLowerCase().includes(q) ||
          (item.fromLocationName?.toLowerCase().includes(q) ?? false) ||
          (item.toLocationName?.toLowerCase().includes(q) ?? false)
        );
      })
      .slice(0, 50)
      .map((item) => ({
        value: String(item.id),
        label: item.referenceNumber,
        sublabel: `${item.fromLocationName ?? "—"} → ${item.toLocationName ?? "—"}`,
      }));
  }, [type, shipmentsData, transfersData, debouncedSearch]);

  const handleSearchChange = useCallback((q: string) => {
    setSearch(q);
  }, []);

  const resolvedPlaceholder =
    placeholder ??
    (type === "SHIPMENT" ? "Search shipments…" : "Search transfers…");

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={resolvedPlaceholder}
      searchPlaceholder={type === "SHIPMENT" ? "Search by # or tracking…" : "Search by ref or location…"}
      emptyText={isFetching ? "Loading…" : "No matches found."}
      disabled={disabled}
      className={className}
      onSearchChange={handleSearchChange}
      ariaLabel={ariaLabel}
    />
  );
}

"use client";

import { useMemo, useState, useCallback } from "react";
import { useInvoices, useInvoice } from "@/hooks/api/invoice";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Combobox } from "@/components/ui/combobox";

interface InvoiceComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function InvoiceCombobox({
  value,
  onChange,
  placeholder = "Search invoices…",
  disabled,
  className,
}: InvoiceComboboxProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isFetching } = useInvoices({ limit: 100 });
  const invoices = data?.items ?? [];

  const numericLookup =
    /^\d+$/.test(debouncedSearch.trim()) ? Number(debouncedSearch.trim()) : 0;
  const { data: lookedUpInvoice } = useInvoice(numericLookup);

  const options = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const seen = new Set<number>();
    const merged = [];

    if (
      lookedUpInvoice &&
      (!q ||
        String(lookedUpInvoice.id).includes(q) ||
        lookedUpInvoice.invoiceNumber.toLowerCase().includes(q) ||
        (lookedUpInvoice.client?.name.toLowerCase().includes(q) ?? false))
    ) {
      merged.push(lookedUpInvoice);
      seen.add(lookedUpInvoice.id);
    }

    for (const invoice of invoices) {
      if (seen.has(invoice.id)) continue;
      if (
        q &&
        !String(invoice.id).includes(q) &&
        !invoice.invoiceNumber.toLowerCase().includes(q) &&
        !(invoice.client?.name.toLowerCase().includes(q) ?? false)
      ) {
        continue;
      }
      merged.push(invoice);
      seen.add(invoice.id);
    }

    return merged.slice(0, 50).map((invoice) => ({
      value: String(invoice.id),
      label: invoice.invoiceNumber,
      sublabel: invoice.client?.name ?? invoice.status,
    }));
  }, [invoices, debouncedSearch, lookedUpInvoice]);

  const handleSearchChange = useCallback((q: string) => {
    setSearch(q);
  }, []);

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search by # or client…"
      emptyText={isFetching ? "Loading invoices…" : "No invoices found."}
      disabled={disabled}
      className={className}
      onSearchChange={handleSearchChange}
    />
  );
}

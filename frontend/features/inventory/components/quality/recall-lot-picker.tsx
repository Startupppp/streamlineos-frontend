"use client";

import { useState } from "react";
import { XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useLots } from "@/hooks/api/inventory/traceability";
import { formatQuantity } from "@/features/inventory/components/planning/forecast-format";
import { formatCalendarDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

interface Props {
  value: number[];
  onChange: (next: number[]) => void;
}

const PAGE_LIMIT = 25;

interface PickedLot {
  id: number;
  label: string;
}

/**
 * D4 — picking the lots a recall is about.
 *
 * This replaces a text field that read "Lot IDs (comma-separated)". That field
 * asked an operator holding a defect report to supply database primary keys,
 * from memory, with no confirmation of what they had named — and a typo in it
 * recalled somebody else's batch or, more often, nothing at all. Search here is
 * over the lot number the label actually carries, and every row shows the
 * product and what is on the shelf, so the person choosing can see what they
 * are about to quarantine before the simulator confirms it.
 */
export function RecallLotPicker({ value, onChange }: Props) {
  // `useLots` reads `inventory:stock:read`. Without it the list is empty for a
  // reason the operator cannot see, and "no lots exist" is a very different
  // message from "you may not read the lot register" — denied is not empty.
  const canReadLots = useCan("inventory:stock:read");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<PickedLot[]>([]);
  const debouncedSearch = useDebouncedValue(search, 300);

  const lotsQuery = useLots({ search: debouncedSearch || undefined, limit: PAGE_LIMIT, page: 1 });
  const rows = lotsQuery.data?.items ?? [];

  function handleToggle(lotId: number, label: string): void {
    if (value.includes(lotId)) {
      onChange(value.filter((id) => id !== lotId));
      setPicked((prev) => prev.filter((p) => p.id !== lotId));
      return;
    }
    onChange([...value, lotId]);
    // Remembered here rather than looked up again: a lot chosen under one
    // search term has to keep its name when the term changes and the row that
    // named it drops out of the list.
    setPicked((prev) => [...prev, { id: lotId, label }]);
  }

  function handleClear(): void {
    onChange([]);
    setPicked([]);
  }

  if (!canReadLots) {
    return (
      <div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
        Picking lots needs the <span className="font-mono">inventory:stock:read</span> permission.
        Recall by product or supplier instead, or ask an administrator for lot access.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <SearchInput
        fill
        value={search}
        onValueChange={setSearch}
        placeholder="Search lot numbers…"
        aria-label="Search lot numbers"
      />

      {picked.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {picked.map((lot) => (
            <Badge
              key={lot.id}
              variant="outline"
              className="h-5 gap-1 px-2 py-0.5 text-xs"
            >
              {lot.label}
              <AnimatedIconButton
                icon={XIcon}
                iconSize={12}
                variant="ghost"
                size="icon"
                className="h-4 w-4"
                aria-label={`Remove lot ${lot.label}`}
                onClick={() => handleToggle(lot.id, lot.label)}
              />
            </Badge>
          ))}
          <button
            type="button"
            className="text-micro text-muted-foreground underline underline-offset-2"
            onClick={handleClear}
          >
            Clear all
          </button>
        </div>
      ) : null}

      <div className="max-h-64 min-h-0 overflow-y-auto rounded-md border border-border">
        {lotsQuery.isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : lotsQuery.error ? (
          <p className="p-3 text-xs text-muted-foreground">
            {getErrorMessage(lotsQuery.error)}
          </p>
        ) : rows.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">
            {debouncedSearch ? "No lots match that search." : "No lots recorded yet."}
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((lot) => {
              const checked = value.includes(lot.id);
              return (
                <li key={lot.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/50",
                      checked && "bg-primary/5",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => handleToggle(lot.id, lot.lotNumber)}
                      aria-label={`Select lot ${lot.lotNumber}`}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-xs font-medium">{lot.lotNumber}</span>
                      <span className="truncate text-micro text-muted-foreground">
                        {lot.productName} · {lot.variantSku}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-xs tabular-nums">
                        {formatQuantity(lot.totalOnHand)}
                      </span>
                      <span className="block text-micro text-muted-foreground">
                        {lot.expiryDate ? formatCalendarDate(lot.expiryDate) : "no expiry"}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

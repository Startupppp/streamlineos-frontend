"use client";

import { useCallback, useMemo, useState } from "react";
import { GitMerge } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Contact, DuplicateContactPair } from "@/types/crm";

export interface ContactMergeSelection {
  readonly selectedIds: ReadonlySet<number>;
  readonly pair: DuplicateContactPair | null;
  readonly isOpen: boolean;
  readonly toggle: (id: number) => void;
  readonly clear: () => void;
  readonly open: () => void;
  readonly onOpenChange: (open: boolean) => void;
}

/**
 * Which two contacts the reader has picked to merge.
 *
 * A checkbox per row rather than the table's own selection column, because
 * `RecordList` borrows only part of `DataTable`'s surface and `selection` is not
 * among it.
 */
export function useContactMergeSelection(
  contactsById: ReadonlyMap<number, Contact>,
): ContactMergeSelection {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback((id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelectedIds(new Set()), []);
  const open = useCallback(() => setIsOpen(true), []);

  const onOpenChange = useCallback((next: boolean) => {
    setIsOpen(next);
    if (!next) setSelectedIds(new Set());
  }, []);

  const pair = useMemo<DuplicateContactPair | null>(() => {
    if (selectedIds.size !== 2) return null;
    const [first, second] = [...selectedIds];
    const one = first === undefined ? undefined : contactsById.get(first);
    const two = second === undefined ? undefined : contactsById.get(second);
    if (!one || !two) return null;
    return {
      contact1: { id: one.id, name: one.name, email: one.email, phone: one.phone },
      contact2: { id: two.id, name: two.name, email: two.email, phone: two.phone },
      matchReason: "name",
    };
  }, [selectedIds, contactsById]);

  return useMemo(
    () => ({ selectedIds, pair, isOpen, toggle, clear, open, onOpenChange }),
    [selectedIds, pair, isOpen, toggle, clear, open, onOpenChange],
  );
}

export function ContactSelectionBar({ selection }: { selection: ContactMergeSelection }) {
  if (selection.selectedIds.size === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-gap-field rounded-md border border-border bg-muted/50 px-3 py-2 text-dense">
      <span className="font-medium">{selection.selectedIds.size} selected</span>
      <div className="ml-auto flex items-center gap-gap-field">
        {selection.pair ? (
          <Button variant="outline" size="sm" onClick={selection.open}>
            <GitMerge className="mr-1.5 h-3.5 w-3.5" />
            Merge
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={selection.clear}>
          Clear
        </Button>
      </div>
    </div>
  );
}

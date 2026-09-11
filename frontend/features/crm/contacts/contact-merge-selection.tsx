"use client";

import { useCallback, useMemo, useState } from "react";
import { GitMerge } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Contact } from "@/types/crm";
import type { PartyMergePair } from "@/components/party-merge/party-merge-dialog";

export interface ContactMergeSelection {
  readonly selectedIds: ReadonlySet<number>;
  readonly pair: PartyMergePair | null;
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
 *
 * The pair it produces is party-grain. Merging is `POST /party/merges`, which
 * takes the records themselves rather than the contact ids that alias them —
 * the contact-grain endpoint that took the numbers is gone, because it soft-
 * deleted a party without moving its identifiers, roles or employees, and left
 * no `party_merges` row to undo.
 *
 * A contact whose row carries no `partyId` yields no pair rather than a merge
 * against an empty id: that only happens against a stale cached page from
 * before the field existed, and merging the wrong two records is not a failure
 * mode worth risking to save a refetch.
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

  const pair = useMemo<PartyMergePair | null>(() => {
    if (selectedIds.size !== 2) return null;
    const [first, second] = [...selectedIds];
    const one = first === undefined ? undefined : contactsById.get(first);
    const two = second === undefined ? undefined : contactsById.get(second);
    if (!one || !two) return null;
    if (!one.partyId || !two.partyId) return null;
    // Two aliases of one record after a merge re-pointed a map row. There is
    // nothing to fuse, and the server would refuse it as merging a party with
    // itself — better not to offer the button.
    if (one.partyId === two.partyId) return null;

    return {
      left: {
        partyId: one.partyId,
        name: one.name,
        email: one.email,
        phone: one.phone,
        partyKind: "PERSON",
        createdAt: one.createdAt ?? "",
      },
      right: {
        partyId: two.partyId,
        name: two.name,
        email: two.email,
        phone: two.phone,
        partyKind: "PERSON",
        createdAt: two.createdAt ?? "",
      },
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

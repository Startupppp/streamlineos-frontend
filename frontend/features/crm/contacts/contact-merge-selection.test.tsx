"use client";

import { act, renderHook } from "@testing-library/react";
import { useContactMergeSelection } from "./contact-merge-selection";
import type { Contact } from "@/types/crm";

function contact(id: number, partyId: string, name: string): Contact {
  return {
    id,
    partyId,
    orgId: "org-1",
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    phone: null,
    title: null,
    department: null,
    company: null,
    organizationId: null,
    linkedinUrl: null,
    twitterUrl: null,
    websiteUrl: null,
    avatarUrl: null,
    leadId: null,
    dealId: null,
    source: null,
    status: null,
    notes: null,
    ownerId: null,
    tags: [],
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: null,
  };
}

const ANA = contact(1, "party-ana", "Ana Rao");
const ANNA = contact(2, "party-anna", "Anna Rao");

function selectionOf(contacts: Contact[]) {
  return renderHook(() =>
    useContactMergeSelection(new Map(contacts.map((row) => [row.id, row]))),
  );
}

describe("useContactMergeSelection", () => {
  it("produces a party-grain pair once two contacts are picked", () => {
    /**
     * The screens speak contact ids; the merge does not. A contact is one row in
     * `contact_party_map` — a number aliasing a `business_parties` row — and the
     * contact-grain merge endpoint that took those numbers is gone, because it
     * soft-deleted the party behind them without moving its identifiers, roles
     * or employees and left nothing to undo.
     */
    const { result } = selectionOf([ANA, ANNA]);

    act(() => result.current.toggle(1));
    expect(result.current.pair).toBeNull();

    act(() => result.current.toggle(2));
    expect(result.current.pair).toEqual({
      left: expect.objectContaining({ partyId: "party-ana", name: "Ana Rao" }),
      right: expect.objectContaining({ partyId: "party-anna", name: "Anna Rao" }),
    });
  });

  it("offers nothing when the two rows are aliases of one record", () => {
    /**
     * `contact_party_map.party_id` is not unique: a merge re-points the loser's
     * row onto the survivor so an old bookmark still resolves. The list read
     * shows only the canonical alias, but a stale page can still hold both — and
     * the server would refuse this as merging a party with itself, so the button
     * should not be there to press.
     */
    const twin = contact(3, "party-ana", "Ana Rao");
    const { result } = selectionOf([ANA, twin]);

    act(() => result.current.toggle(1));
    act(() => result.current.toggle(3));

    expect(result.current.selectedIds.size).toBe(2);
    expect(result.current.pair).toBeNull();
  });

  it("offers nothing for a row cached before the party id existed", () => {
    /**
     * Rather than sending an empty `partyId` and merging whichever two records
     * the server resolves that to. A stale cache is a refetch away; merging the
     * wrong pair is a revert away at best.
     */
    const legacy = { ...ANNA, partyId: "" } as Contact;
    const { result } = selectionOf([ANA, legacy]);

    act(() => result.current.toggle(1));
    act(() => result.current.toggle(2));

    expect(result.current.pair).toBeNull();
  });

  it("clears the selection when the dialog closes", () => {
    const { result } = selectionOf([ANA, ANNA]);

    act(() => result.current.toggle(1));
    act(() => result.current.open());
    act(() => result.current.onOpenChange(false));

    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.isOpen).toBe(false);
  });
});

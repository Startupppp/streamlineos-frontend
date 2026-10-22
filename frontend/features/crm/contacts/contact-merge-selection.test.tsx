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
    notes: null,
    tags: [],
    deletedAt: null,
    mergedIntoId: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    lead: null,
    deal: null,
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
    const twin = contact(3, "party-ana", "Ana Rao");
    const { result } = selectionOf([ANA, twin]);

    act(() => result.current.toggle(1));
    act(() => result.current.toggle(3));

    expect(result.current.selectedIds.size).toBe(2);
    expect(result.current.pair).toBeNull();
  });

  it("offers nothing for a row cached before the party id existed", () => {
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

import { taskAnchorHref, taskAnchorLabel } from "./task-anchor";

describe("taskAnchorHref", () => {
  it("opens a party over its own list", () => {
    expect(taskAnchorHref({ kind: "party", id: "p-1", name: "Northwind" })).toBe(
      "/parties?partyId=p-1",
    );
  });

  it("opens a deal at its own route", () => {
    expect(taskAnchorHref({ kind: "deal", id: "42", name: "Q3 renewal" })).toBe("/crm/deals/42");
  });

  it("opens a subject over its own list", () => {
    expect(taskAnchorHref({ kind: "subject", id: "s-1", name: "Flat 3B" })).toBe(
      "/subjects?subjectId=s-1",
    );
  });

  /** Identifiers come from the API, and a raw one in a query string is a broken link. */
  it("escapes an identifier that would otherwise break the URL", () => {
    expect(taskAnchorHref({ kind: "party", id: "a b&c=d", name: null })).toBe(
      "/parties?partyId=a%20b%26c%3Dd",
    );
  });
});

describe("taskAnchorLabel", () => {
  it("says the record's name", () => {
    expect(taskAnchorLabel({ kind: "deal", id: "1", name: "Q3 renewal" })).toBe("Q3 renewal");
  });

  /** The task outlives the record it was about; it still has to read as something. */
  it.each([
    ["party" as const, "A record"],
    ["deal" as const, "A deal"],
    ["subject" as const, "A subject"],
  ])("falls back to what kind of thing a deleted %s was", (kind, expected) => {
    expect(taskAnchorLabel({ kind, id: "1", name: null })).toBe(expected);
  });

  it("treats a blank name as no name", () => {
    expect(taskAnchorLabel({ kind: "party", id: "1", name: "   " })).toBe("A record");
  });
});
